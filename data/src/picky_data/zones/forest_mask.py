"""Forest / mire mask for the pilot area.

Primary source: Geofabrik's free OSM shapefile bundle for Finland
(https://download.geofabrik.de/europe/finland-latest-free.shp.zip), read straight
from the zip with a bbox filter, so it never needs unpacking:

* ``gis_osm_landuse_a_free_1``  fclass = 'forest'   (OSM landuse=forest + natural=wood)
* ``gis_osm_water_a_free_1``    fclass = 'wetland'  (OSM natural=wetland: bogs, fens, marshes)

Any other polygon file (GeoPackage, GeoJSON, a QGIS export of SYKE CORINE …) can be
used instead via :func:`load_vector_mask`.

Output: a GeoDataFrame in EPSG:3067 with one column ``habitat`` ∈ {'forest', 'mire'},
non-overlapping (mire wins where both overlap: a pine bog is cloudberry land), clipped to
the pilot square and cut into ≤ 2 km pieces so later intersections stay fast.
"""
from __future__ import annotations

import logging
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
from shapely.geometry import box

from ..config import METRIC_CRS, WGS84, PilotArea

log = logging.getLogger(__name__)

GEOFABRIK_LAYERS = {
    "forest": ("gis_osm_landuse_a_free_1", "fclass = 'forest'"),
    "mire": ("gis_osm_water_a_free_1", "fclass = 'wetland'"),
}


def _layer_path(source: Path, layer: str) -> str:
    source = Path(source)
    if source.suffix.lower() == ".zip":
        return f"/vsizip/{source.as_posix()}/{layer}.shp"
    if source.is_dir():
        return str(source / f"{layer}.shp")
    raise FileNotFoundError(f"Expected the Geofabrik .shp.zip or an unpacked folder, got {source}")


def read_geofabrik(source: str | Path, area: PilotArea, buffer_m: float = 2000) -> gpd.GeoDataFrame:
    """Read forest + wetland polygons for the pilot area from a Geofabrik free shapefile bundle."""
    # bbox filter in the layer CRS (WGS84), padded so edge cells get full coverage
    padded = gpd.GeoSeries([area.polygon_3067.buffer(buffer_m)], crs=METRIC_CRS).to_crs(WGS84)
    bbox = tuple(padded.total_bounds)
    frames = []
    for habitat, (layer, where) in GEOFABRIK_LAYERS.items():
        path = _layer_path(Path(source), layer)
        log.info("reading %s (%s) …", layer, where)
        gdf = gpd.read_file(path, bbox=bbox, where=where, engine="pyogrio", columns=["fclass"])
        gdf["habitat"] = habitat
        frames.append(gdf[["habitat", "geometry"]])
        log.info("  %d %s polygons", len(gdf), habitat)
    raw = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), geometry="geometry", crs=WGS84)
    return prepare_mask(raw.to_crs(METRIC_CRS), area, buffer_m)


def load_vector_mask(path: str | Path, area: PilotArea, habitat_column: str = "habitat",
                     buffer_m: float = 2000) -> gpd.GeoDataFrame:
    """Read any polygon file that already has a ``habitat`` column with 'forest' / 'mire'."""
    gdf = gpd.read_file(path, engine="pyogrio")
    if habitat_column not in gdf:
        raise ValueError(f"{path} needs a '{habitat_column}' column with values forest/mire")
    gdf = gdf.rename(columns={habitat_column: "habitat"})[["habitat", "geometry"]]
    bad = set(gdf["habitat"].unique()) - {"forest", "mire"}
    if bad:
        raise ValueError(f"unknown habitat values {bad}; expected forest/mire")
    return prepare_mask(gdf.to_crs(METRIC_CRS), area, buffer_m)


def prepare_mask(gdf: gpd.GeoDataFrame, area: PilotArea, buffer_m: float = 2000,
                 piece_size_m: float = 2000) -> gpd.GeoDataFrame:
    """Repair, clip, dissolve per habitat, remove overlap (mire wins) and subdivide."""
    assert gdf.crs is not None and gdf.crs.to_epsg() == 3067, "mask must be in EPSG:3067"
    clip = area.polygon_3067.buffer(buffer_m, join_style="mitre")
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty].copy()
    gdf["geometry"] = shapely.make_valid(gdf.geometry.values)
    gdf = gdf[gdf.geom_type.isin(["Polygon", "MultiPolygon", "GeometryCollection"])]

    merged = {}
    for habitat in ("mire", "forest"):
        geoms = gdf.loc[gdf["habitat"] == habitat, "geometry"].values
        if len(geoms) == 0:
            merged[habitat] = shapely.Polygon()
            continue
        merged[habitat] = shapely.intersection(shapely.union_all(geoms), clip)
    # mire takes precedence where they overlap
    merged["forest"] = shapely.difference(merged["forest"], merged["mire"])

    rows = []
    for habitat, geom in merged.items():
        for piece in subdivide(geom, clip.bounds, piece_size_m):
            rows.append((habitat, piece))
    out = gpd.GeoDataFrame(rows, columns=["habitat", "geometry"], geometry="geometry", crs=METRIC_CRS)
    out = out[out.area > 1.0].reset_index(drop=True)
    log.info("mask: forest %.1f km², mire %.1f km²",
             out.loc[out.habitat == "forest"].area.sum() / 1e6,
             out.loc[out.habitat == "mire"].area.sum() / 1e6)
    return out


def subdivide(geom, bounds, size: float) -> list:
    """Cut a (multi)polygon into pieces on a square grid, keeping only polygonal parts."""
    if geom is None or geom.is_empty:
        return []
    xmin, ymin, xmax, ymax = bounds
    xs = np.arange(xmin, xmax, size)
    ys = np.arange(ymin, ymax, size)
    cells = np.array([box(x, y, x + size, y + size) for x in xs for y in ys])
    shapely.prepare(geom)
    hit = shapely.intersects(geom, cells)
    pieces = shapely.intersection(geom, cells[hit])
    out = []
    for p in pieces:
        for part in shapely.get_parts(p):
            if part.geom_type == "Polygon" and not part.is_empty:
                out.append(part)
            elif part.geom_type in ("MultiPolygon", "GeometryCollection"):
                out.extend(q for q in shapely.get_parts(part) if q.geom_type == "Polygon")
    return out
