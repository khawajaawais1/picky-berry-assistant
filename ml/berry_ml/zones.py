"""Zone scores from forest maps + ripening time (feature 6.2, S_model).

The forest grid (``models/zones/v1/zone_grid.csv``) holds 24,336 cells of 256 m x 256 m around
Jyväskylä, each with the share of every forest type, built from Luke's MS-NFI 2023 maps
(``zones/build_zone_grid.py``). A zone's map score is:

    score = 100 x site potential x ripeness x year quality / 2 x 1.6          (0-100, integer)

* site potential (0-1): the zone's forest mix x typical kg/ha per forest type / best forest type
* ripeness (0-1): 1 inside the berry's ripening window, 0.5 within 10 days of it, else 0;
  windows shift about 2 days later per degree of latitude north of 62 N
* year quality: ``YieldModel.year_index`` (1.0 = normal year; the v1 model is the baseline)

So a perfect forest, ripe berries and a normal year give 80; the last 20 points are left for
better-than-normal years and for pickers' reports (``berry_ml.reports``).

The public API never takes a user's coordinates (app/SECURITY.md §10). The backend scores
**its own zones** with ``score_zone`` / ``score_zones`` and stores the result in ``zone_scores``.
"""
from __future__ import annotations

import datetime as dt
import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .paths import ZONE_GRID_PATH, ZONE_GRID_VERSION

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
SCORE_RULE_TAG = "rules-v1"


def day_of_year(date: dt.date | str | None = None) -> int:
    if date is None:
        date = dt.date.today()
    if isinstance(date, str):
        date = dt.date.fromisoformat(date[:10])
    return date.timetuple().tm_yday


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


@dataclass
class ZoneScore:
    species: str
    score: int                 # 0-100
    confidence: str            # low | medium | high
    ripeness: str              # unripe | ripening | ripe | past
    site_potential: float      # 0-1
    forest_share: float        # 0-1, share of the zone that is forest land
    year_index: float
    model_version: str = ZONE_GRID_VERSION

    def to_payload(self) -> dict:
        """The per-species object the app's ZoneSource already validates."""
        return {"score": self.score, "confidence": self.confidence, "ripeness": self.ripeness}


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
        self.frac = {t: self.g[f"frac_{t}"].to_numpy() for t in ("non_forest",) + FOREST_TYPES}
        self.bounds = (self.lon.min(), self.lat.min(), self.lon.max(), self.lat.max())

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
        forest_share = 1.0 - mix["non_forest"]
        lat = float(np.mean([p[1] for p in ring]))
        doy = day_of_year(date)
        out = {}
        for sp in species:
            ripe, label = ripeness(sp, doy, lat)
            site = site_potential(mix, sp)
            low = sp in RULE_ONLY_SPECIES or forest_share < MIN_FOREST_SHARE_FOR_MEDIUM or ripe == 0.0
            out[sp] = ZoneScore(sp, map_score(site, ripe, year_index), "low" if low else "medium", label,
                                round(site, 3), round(forest_share, 3), year_index)
        return out

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
            props.update({"species": head, "updated_at": now, "score_date": str(date or dt.date.today()),
                          "model": f"{ZONE_GRID_VERSION}+{SCORE_RULE_TAG}", "stub": False})
            ident = {"id": f["id"]} if "id" in f else {}
            feats.append({"type": "Feature", **ident, "properties": props, "geometry": geom})
        return {"type": "FeatureCollection", "features": feats}

    def score_point(self, lat: float, lon: float, date=None, year_index: float = 1.0) -> dict[str, ZoneScore] | None:
        """Score the 256 m grid cell at one point (served by GET /api/v1/ml/score). None if outside the grid."""
        d2 = (self.lat - lat) ** 2 + ((self.lon - lon) * math.cos(math.radians(lat))) ** 2
        i = int(d2.argmin())
        if math.sqrt(d2[i]) * 111_320 > 185:
            return None
        idx = np.array([i])
        mix = self.forest_mix(idx)
        doy = day_of_year(date)
        out = {}
        for sp in SPECIES:
            ripe, label = ripeness(sp, doy, lat)
            site = site_potential(mix, sp)
            low = sp in RULE_ONLY_SPECIES or (1 - mix["non_forest"]) < MIN_FOREST_SHARE_FOR_MEDIUM or ripe == 0.0
            out[sp] = ZoneScore(sp, map_score(site, ripe, year_index), "low" if low else "medium", label,
                                round(site, 3), round(1 - mix["non_forest"], 3), year_index)
        return out

