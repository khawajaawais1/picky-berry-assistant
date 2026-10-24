"""ZoneBuilder (D10): forest mask → H3 cells → zones (GeoParquet + GeoJSON).

Rules (deep dive §6): H3 resolution 8; keep a cell if ≥ 40 % of its area is forest or
mire; store the full hexagon (not clipped) so neighbours tile perfectly; name = nearest
OSM place + suffix.
"""
from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from ..config import METRIC_CRS, OUT_DIR, WGS84, PilotArea
from . import h3_grid
from .msnfi import MsnfiRasters, enrich
from .naming import name_zones

log = logging.getLogger(__name__)

ZONE_COLUMNS = ["id", "h3", "h3_parent6", "name", "forest_type", "forest_fraction",
                "mire_fraction", "habitat", "fertility_class", "area_km2",
                "centroid_lon", "centroid_lat", "source_version", "geometry"]

PURE_SHARE = 0.6   # ≥ 60 % of volume from one tree group → that forest type, else mixed


def classify(forest: float, mire: float, shares: dict[str, float] | None) -> tuple[str, dict]:
    """Dominant habitat label + habitat fractions dict used by zone_species."""
    habitat: dict[str, float] = {}
    if mire > 0:
        habitat["mire"] = round(float(mire), 4)
    if shares and all(np.isfinite(v) for v in shares.values()) and sum(shares.values()) > 0:
        best = max(shares, key=shares.get)
        ftype = f"forest_{best}" if shares[best] >= PURE_SHARE else "forest_mixed"
    else:
        ftype = "forest_unknown"
    if forest > 0:
        habitat[ftype] = round(float(forest), 4)
    label = "mire" if mire >= forest else ftype
    return label, habitat


def combine_mire(osm_forest: pd.Series, osm_mire: pd.Series,
                 msnfi_mire: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Merge OSM cover with MS-NFI's mire share.

    Mire = the larger of the two estimates. Extra mire found by MS-NFI is taken out of OSM
    forest first (OSM tags most wooded pine bogs as forest); any remainder is new cover OSM
    missed (open bogs). Fractions stay within 0–1 and forest + mire ≤ 1.
    """
    mire = np.maximum(osm_mire, msnfi_mire)
    extra = (mire - osm_mire).clip(lower=0)
    forest = (osm_forest - extra).clip(lower=0)
    total = forest + mire
    scale = np.where(total > 1, 1 / total, 1.0)
    return (forest * scale).clip(0, 1), (mire * scale).clip(0, 1)


def build_zones(area: PilotArea, mask_3067: gpd.GeoDataFrame,
                places_3067: gpd.GeoDataFrame | None = None,
                msnfi: MsnfiRasters | None = None,
                source_version: str | None = None) -> gpd.GeoDataFrame:
    zc = area.zones
    res = int(zc["h3_resolution"])
    min_frac = float(zc["min_forest_fraction"])
    parent_res = int(zc["zoomed_out_parent_resolution"])

    cells = h3_grid.cells_for_area(area, res)
    log.info("pilot area → %d H3 res-%d cells", len(cells), res)
    grid = h3_grid.cells_to_gdf(cells).to_crs(METRIC_CRS)

    frac = h3_grid.habitat_fractions(grid, mask_3067)
    forest = frac.get("forest", pd.Series(0.0, index=grid.index))
    mire = frac.get("mire", pd.Series(0.0, index=grid.index))

    # MS-NFI runs on every cell (not only kept ones): its bog share can add cover OSM missed.
    extra = enrich(grid, msnfi) if (msnfi and msnfi.any()) else pd.DataFrame(index=grid.index)
    if "mire_share" in extra:
        forest, mire = combine_mire(forest, mire, extra["mire_share"].fillna(0.0))
        log.info("MS-NFI site type: mire %.1f km² (OSM alone %.1f km²)",
                 (mire * grid.area).sum() / 1e6,
                 (frac.get("mire", pd.Series(0.0, index=grid.index)) * grid.area).sum() / 1e6)

    keep = (forest + mire) >= min_frac
    log.info("kept %d / %d cells with ≥ %.0f %% forest or mire", keep.sum(), len(grid), min_frac * 100)

    z = grid.loc[keep].copy()
    extra = extra.loc[keep]
    z["forest_fraction"] = forest[keep].round(4).values
    z["mire_fraction"] = mire[keep].round(4).values

    share_cols = [c for c in ("share_pine", "share_spruce", "share_broadleaf") if c in extra]
    labels, habitats = [], []
    for i in z.index:
        shares = {c.removeprefix("share_"): float(extra.at[i, c]) for c in share_cols} or None
        lab, hab = classify(z.at[i, "forest_fraction"], z.at[i, "mire_fraction"], shares)
        labels.append(lab)
        habitats.append(hab)
    z["forest_type"] = labels
    z["habitat"] = [json.dumps(h, sort_keys=True) for h in habitats]
    z["fertility_class"] = (extra["fertility_class"].astype("Int16")
                            if "fertility_class" in extra else pd.array([pd.NA] * len(z), dtype="Int16"))

    z["name"] = name_zones(z, places_3067)
    z["area_km2"] = (z.area / 1e6).round(4)
    z["id"] = z["h3"].map(h3_grid.zone_id)
    z["h3_parent6"] = z["h3"].map(lambda c: h3_grid.parent(c, parent_res))
    z["source_version"] = source_version or f"build-{date.today().isoformat()}/h3r{res}/v1"

    cent = z.geometry.centroid.to_crs(WGS84)      # centroid in metres, then to lon/lat
    z = z.to_crs(WGS84)
    z["centroid_lon"] = cent.x.round(6).values
    z["centroid_lat"] = cent.y.round(6).values
    return z[ZONE_COLUMNS].reset_index(drop=True)


def write_zones(zones: gpd.GeoDataFrame, out_dir: Path = OUT_DIR) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {"parquet": out_dir / "zones.parquet", "geojson": out_dir / "zones.geojson"}
    zones.to_parquet(paths["parquet"], index=False)
    gj = zones.copy()
    gj["fertility_class"] = gj["fertility_class"].astype("float")
    gj.to_file(paths["geojson"], driver="GeoJSON", engine="pyogrio",
               layer_options={"COORDINATE_PRECISION": 6, "RFC7946": "YES"})
    return paths
