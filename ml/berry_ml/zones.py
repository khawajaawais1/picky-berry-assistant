"""Zone scores from forest maps + ripening time (feature 6.2, S_model).

The forest grid (``models/zones/v2/zone_grid.csv``, 60 x 60 km; v1 = 40 x 40 km) holds cells of
256 m x 256 m around Jyväskylä, each with the share of every forest type, built from Luke's MS-NFI 2023 maps
(``zones/build_zone_grid.py``). A zone's map score is:

    score = 100 x site potential x ripeness x year quality / 2 x 1.6          (0-100, integer)

* site potential (0-1): the zone's forest mix x typical kg/ha per forest type / best forest type
* ripeness (0-1): 1 inside the berry's ripening window, 0.5 within 10 days of it, else 0;
  windows shift about 2 days later per degree of latitude north of 62 N
* year quality: ``YieldModel.year_index`` (1.0 = normal year; the v1 model is the baseline)

So a perfect forest, ripe berries and a normal year give 80; the last 20 points are left for
better-than-normal years and for pickers' reports (``berry_ml.reports``).

The backend scores **its own zones** in one call with ``score_points`` (one centroid per zone,
cells within ``radius_m`` averaged) and stores each species' result, with its ``explanation``,
in ``zone_scores``. ``score_point`` scores one spot (the cell under it).

Dates are Europe/Helsinki calendar dates; timestamps are UTC. Outside the grid a result has
``coverage: "none"`` and ``scores: None`` (never 0).
"""
from __future__ import annotations

import datetime as dt
import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

from .paths import SCORE_RULES_VERSION, ZONE_GRID_PATH, ZONE_GRID_VERSION

HELSINKI = ZoneInfo("Europe/Helsinki")

SPECIES = ("bilberry", "lingonberry", "cloudberry", "crowberry")
FOREST_TYPES = ("herb_rich", "mesic_heath", "sub_xeric", "xeric", "peatland", "clearcut")

# Typical yield of an average year by forest type, kg/ha (Finnish berry research, Luke).
# Crowberry is a coarse rule (no measured table yet): dry heaths and bogs.
SITE_POTENTIAL = {
    "bilberry":    {"herb_rich": 5, "mesic_heath": 25, "sub_xeric": 15, "xeric": 5,  "peatland": 10, "clearcut": 2},
    "lingonberry": {"herb_rich": 2, "mesic_heath": 10, "sub_xeric": 30, "xeric": 20, "peatland": 10, "clearcut": 25},
    "cloudberry":  {"herb_rich": 0, "mesic_heath": 0,  "sub_xeric": 0,  "xeric": 0,  "peatland": 15, "clearcut": 0},
    "crowberry":   {"herb_rich": 0, "mesic_heath": 3,  "sub_xeric": 10, "xeric": 20, "peatland": 15, "clearcut": 5},
}
# Ripening windows at 62 N (day of year). Shift: ~2 days later per degree further north.
RIPENING = {"bilberry": (190, 240), "lingonberry": (225, 280), "cloudberry": (185, 215), "crowberry": (200, 260)}
DAYS_PER_DEGREE_NORTH = 2.0
EDGE_DAYS = 10
MIN_FOREST_SHARE_FOR_MEDIUM = 0.30
RULE_ONLY_SPECIES = {"crowberry"}
SCORE_RULE_TAG = "rules-v2"
BEFORE_WINDOW_DAYS = 60            # up to 60 days before the window: "before_window", earlier: "off_season"
GOOD_SITE, MODERATE_SITE = 0.60, 0.30   # site potential thresholds for good_site / moderate_site / poor_site
ZONE_RADIUS_M = 400                # score_points: cells within this distance of a zone centroid (H3 res 8)
CELL_REACH_M = 185                 # half the diagonal of a 256 m cell: farther than this = outside the grid
M_PER_DEG_LAT = 110_574.0
M_PER_DEG_LON_EQ = 111_320.0
FRAC_COLS = ("non_forest",) + FOREST_TYPES


def today_helsinki() -> dt.date:
    """Today's calendar date in Finland: what every ``date`` input defaults to."""
    return dt.datetime.now(HELSINKI).date()


def _as_date(date: dt.date | str | None) -> dt.date:
    if date is None:
        return today_helsinki()
    if isinstance(date, str):
        return dt.date.fromisoformat(date[:10])
    if isinstance(date, dt.datetime):
        return date.astimezone(HELSINKI).date() if date.tzinfo else date.date()
    return date


def day_of_year(date: dt.date | str | None = None) -> int:
    return _as_date(date).timetuple().tm_yday


def ripeness(species: str, doy: int, lat: float = 62.0) -> tuple[float, str]:
    """(factor, label). Labels match the app's vocabulary: unripe | ripening | ripe | past."""
    shift = DAYS_PER_DEGREE_NORTH * (lat - 62.0)
    a, b = RIPENING[species][0] + shift, RIPENING[species][1] + shift
    if a <= doy <= b:
        return 1.0, "ripe"
    if a - EDGE_DAYS <= doy < a:
        return 0.5, "ripening"
    if doy < a:
        return 0.0, "unripe"
    if doy <= b + EDGE_DAYS:
        return 0.5, "past"
    return 0.0, "past"


def site_potential(forest_mix: dict[str, float], species: str) -> float:
    pot = SITE_POTENTIAL[species]
    best = max(pot.values()) or 1
    return float(sum(forest_mix.get(t, 0.0) * v for t, v in pot.items()) / best)


def map_score(site: float, ripe: float, year_index: float = 1.0) -> int:
    return int(round(max(0.0, min(100.0, 100 * site * ripe * min(year_index, 2.0) / 2.0 * 1.6))))


def ripening_window(species: str, year: int, lat: float = 62.0) -> tuple[dt.date, dt.date]:
    """First and last ripe day for a species at a latitude, as calendar dates of ``year``."""
    shift = DAYS_PER_DEGREE_NORTH * (lat - 62.0)
    a, b = RIPENING[species]
    jan1 = dt.date(year, 1, 1)
    return (jan1 + dt.timedelta(days=round(a + shift) - 1), jan1 + dt.timedelta(days=round(b + shift) - 1))


def season_reason(species: str, doy: int, lat: float = 62.0) -> str:
    """One of: in_ripe_window, ripening_window, before_window, past_window, off_season."""
    shift = DAYS_PER_DEGREE_NORTH * (lat - 62.0)
    a, b = RIPENING[species][0] + shift, RIPENING[species][1] + shift
    if a <= doy <= b:
        return "in_ripe_window"
    if a - EDGE_DAYS <= doy < a:
        return "ripening_window"
    if a - BEFORE_WINDOW_DAYS <= doy < a - EDGE_DAYS:
        return "before_window"
    if b < doy <= b + EDGE_DAYS:
        return "past_window"
    return "off_season"


def site_class(site: float) -> str:
    """good | moderate | poor, from the 0-1 site potential."""
    return "good" if site >= GOOD_SITE else "moderate" if site >= MODERATE_SITE else "poor"


def map_explanation(species: str, date: dt.date, lat: float, site: float, forest_share: float,
                    year_index: float, low_confidence: bool) -> dict:
    """The explanation stored with a map score (zone_scores.explanation). Always >= 2 reasons."""
    start, end = ripening_window(species, date.year, lat)
    cls = site_class(site)
    reasons = [season_reason(species, date.timetuple().tm_yday, lat), f"{cls}_site", "no_reports_baseline"]
    if low_confidence:
        reasons.append("low_confidence_species")
    return {
        "model_version": ZONE_GRID_VERSION,
        "rules_version": SCORE_RULES_VERSION,
        "reasons": reasons,
        "inputs": {
            "site_class": cls,
            "site_potential": round(site, 3),
            "window_start": start.isoformat(),
            "window_end": end.isoformat(),
            "year_index": round(float(year_index), 3),
            "forest_share": round(forest_share, 3),
            "reports_used": 0,
            "evidence_weight": 0.0,
        },
    }


@dataclass
class ZoneScore:
    species: str
    score: int                 # 0-100
    confidence: str            # low | medium | high
    ripeness: str              # unripe | ripening | ripe | past
    site_potential: float      # 0-1
    forest_share: float        # 0-1, share of the zone that is forest land
    year_index: float
    explanation: dict | None = None
    model_version: str = ZONE_GRID_VERSION

    def to_payload(self, explanation: bool = False) -> dict:
        """The per-species object: {score, confidence, ripeness} (+ explanation when asked)."""
        out = {"score": self.score, "confidence": self.confidence, "ripeness": self.ripeness}
        if explanation:
            out["explanation"] = self.explanation
        return out


def _year_index_for(year_index: float | dict[str, float], species: str) -> float:
    return float(year_index.get(species, 1.0)) if isinstance(year_index, dict) else float(year_index)


def scores_from_mix(mix: dict[str, float], lat: float, date, year_index: float | dict[str, float] = 1.0,
                    species: Iterable[str] = SPECIES) -> dict[str, ZoneScore]:
    """Score every species for one forest mix (the core of score_zone / score_point / score_points)."""
    d = _as_date(date)
    doy = d.timetuple().tm_yday
    forest_share = 1.0 - mix["non_forest"]
    out = {}
    for sp in species:
        yi = _year_index_for(year_index, sp)
        ripe, label = ripeness(sp, doy, lat)
        site = site_potential(mix, sp)
        low = sp in RULE_ONLY_SPECIES or forest_share < MIN_FOREST_SHARE_FOR_MEDIUM or ripe == 0.0
        out[sp] = ZoneScore(sp, map_score(site, ripe, yi), "low" if low else "medium", label,
                            round(site, 3), round(forest_share, 3), yi,
                            map_explanation(sp, d, lat, site, forest_share, yi,
                                            sp in RULE_ONLY_SPECIES or forest_share < MIN_FOREST_SHARE_FOR_MEDIUM))
    return out


def _point_in_ring(x: np.ndarray, y: np.ndarray, ring: Sequence[Sequence[float]]) -> np.ndarray:
    inside = np.zeros(len(x), dtype=bool)
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        cross = ((y1 > y) != (y2 > y)) & (x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1)
        inside ^= cross
    return inside


class ZoneGrid:
    """The 256 m forest grid. Load once; thread-safe for reads."""

    def __init__(self, path: Path | str = ZONE_GRID_PATH):
        self.g = pd.read_csv(path)
        self.lat = self.g["lat"].to_numpy()
        self.lon = self.g["lon"].to_numpy()
        self.frac = {t: self.g[f"frac_{t}"].to_numpy() for t in FRAC_COLS}
        self.F = np.stack([self.frac[t] for t in FRAC_COLS], axis=1)          # cells x 7
        self.bounds = (self.lon.min(), self.lat.min(), self.lon.max(), self.lat.max())
        self.version = ZONE_GRID_VERSION

    def cells_in_ring(self, ring: Sequence[Sequence[float]]) -> np.ndarray:
        """Indices of cells whose centre is inside a GeoJSON exterior ring ([lon, lat] pairs).
        Falls back to the cell nearest the ring's centroid (within 400 m) for zones smaller than a cell."""
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        box = (self.lon >= min(xs)) & (self.lon <= max(xs)) & (self.lat >= min(ys)) & (self.lat <= max(ys))
        idx = np.nonzero(box)[0]
        if len(idx):
            idx = idx[_point_in_ring(self.lon[idx], self.lat[idx], ring)]
        if len(idx):
            return idx
        cx, cy = float(np.mean(xs)), float(np.mean(ys))
        d2 = (self.lat - cy) ** 2 + ((self.lon - cx) * math.cos(math.radians(cy))) ** 2
        i = int(d2.argmin())
        return np.array([i]) if math.sqrt(d2[i]) * 111_320 <= 400 else np.array([], dtype=int)

    def forest_mix(self, idx: np.ndarray) -> dict[str, float]:
        return {t: float(self.frac[t][idx].mean()) for t in ("non_forest",) + FOREST_TYPES}

    def score_zone(self, ring: Sequence[Sequence[float]], date=None, year_index: float = 1.0,
                   species: Iterable[str] = SPECIES) -> dict[str, ZoneScore] | None:
        """Scores for one zone polygon, or None if the zone is outside the grid's coverage."""
        idx = self.cells_in_ring(ring)
        if not len(idx):
            return None
        mix = self.forest_mix(idx)
        lat = float(np.mean([p[1] for p in ring]))
        return scores_from_mix(mix, lat, date, year_index, species)

    def score_zones(self, feature_collection: dict, date=None, year_index: float = 1.0) -> dict:
        """Score every Polygon feature of a GeoJSON FeatureCollection, in the app's payload shape.

        Each scored feature keeps its geometry and identity fields and gets ``scores`` (all species),
        the headline ``species/score/confidence/ripeness`` for its ``species`` property (bilberry if
        absent), ``updated_at`` and ``model``. Features outside the grid are returned with
        ``scores: {}`` and ``coverage: "none"`` so the caller can decide what to do with them.
        """
        now = dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        feats = []
        for f in feature_collection.get("features", []):
            geom = f.get("geometry") or {}
            if geom.get("type") != "Polygon":
                continue
            props = {k: v for k, v in (f.get("properties") or {}).items()
                     if k in ("h3", "name", "species", "forest_type", "zone_id", "id")}
            scores = self.score_zone(geom["coordinates"][0], date, year_index)
            head = props.get("species", "bilberry")
            if scores is None:
                props.update({"scores": {}, "coverage": "none"})
            else:
                props.update({
                    "scores": {sp: s.to_payload() for sp, s in scores.items()},
                    **scores[head].to_payload(),
                    "forest_share": scores[head].forest_share,
                    "coverage": "grid",
                })
            props.update({"species": head, "updated_at": now, "score_date": _as_date(date).isoformat(),
                          "model": f"{ZONE_GRID_VERSION}+{SCORE_RULE_TAG}", "stub": False})
            ident = {"id": f["id"]} if "id" in f else {}
            feats.append({"type": "Feature", **ident, "properties": props, "geometry": geom})
        return {"type": "FeatureCollection", "features": feats}

    def _mixes(self, lats: np.ndarray, lons: np.ndarray, radius_m: float, chunk: int = 64):
        """Forest mix per point: mean of the cells within radius_m of it (or the nearest cell within
        CELL_REACH_M when none is that close). Returns (mixes points x 7, covered bool, cells used)."""
        n = len(lats)
        mixes = np.full((n, len(FRAC_COLS)), np.nan)
        cells = np.zeros(n, dtype=int)
        for s0 in range(0, n, chunk):
            la, lo = lats[s0:s0 + chunk, None], lons[s0:s0 + chunk, None]
            dy = (self.lat[None, :] - la) * M_PER_DEG_LAT
            dx = (self.lon[None, :] - lo) * (M_PER_DEG_LON_EQ * np.cos(np.radians(la)))
            d2 = dx * dx + dy * dy
            near = d2 <= radius_m * radius_m if radius_m > 0 else np.zeros_like(d2, dtype=bool)
            k = near.sum(axis=1)
            for j in range(len(la)):
                if k[j]:
                    mixes[s0 + j] = self.F[near[j]].mean(axis=0); cells[s0 + j] = k[j]
                else:
                    i = int(d2[j].argmin())
                    if d2[j, i] <= CELL_REACH_M ** 2:
                        mixes[s0 + j] = self.F[i]; cells[s0 + j] = 1
        return mixes, cells > 0, cells

    def score_point(self, lat: float, lon: float, date=None,
                    year_index: float | dict[str, float] = 1.0) -> dict[str, ZoneScore] | None:
        """Score the 256 m cell under one spot (served by GET /api/v1/ml/score). None if outside the grid."""
        mixes, covered, _ = self._mixes(np.array([lat], float), np.array([lon], float), radius_m=0)
        if not covered[0]:
            return None
        return scores_from_mix(dict(zip(FRAC_COLS, mixes[0])), lat, date, year_index)

    def score_points(self, points: Sequence[dict], date=None, year_index: float | dict[str, float] = 1.0,
                     radius_m: float = ZONE_RADIUS_M) -> list[dict]:
        """Score many zones in one call, one centroid per zone.

        points: [{"id": str, "h3": str, "lat": float, "lon": float}, ...] (id and h3 are echoed back).
        Returns one dict per point, in the same order:
            {"id", "h3", "lat", "lon", "coverage": "grid" | "none", "cells": int, "forest_share": float | None,
             "scores": {species: {"score", "confidence", "ripeness", "explanation"}} | None}
        """
        lats = np.array([float(p["lat"]) for p in points], float)
        lons = np.array([float(p["lon"]) for p in points], float)
        mixes, covered, cells = self._mixes(lats, lons, radius_m)
        out = []
        for i, p in enumerate(points):
            row = {"id": p.get("id"), "h3": p.get("h3"), "lat": float(lats[i]), "lon": float(lons[i])}
            if not covered[i]:
                row.update({"coverage": "none", "cells": 0, "forest_share": None, "scores": None})
            else:
                mix = dict(zip(FRAC_COLS, mixes[i]))
                sc = scores_from_mix(mix, float(lats[i]), date, year_index)
                row.update({"coverage": "grid", "cells": int(cells[i]),
                            "forest_share": round(1.0 - mix["non_forest"], 3),
                            "scores": {sp: z.to_payload(explanation=True) for sp, z in sc.items()}})
            out.append(row)
        return out
