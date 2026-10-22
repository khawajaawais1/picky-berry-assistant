"""Human names for zones: nearest OSM place name + short suffix, e.g. 'Laajavuori 3'.

Places come from Geofabrik's ``gis_osm_places_free_1`` (points) plus named peaks/hills
from ``gis_osm_natural_free_1`` – hills like Laajavuori are what pickers actually say.
Suffix = rank of the zone by distance to that place (1 = closest).
"""
from __future__ import annotations

import logging
from pathlib import Path

import geopandas as gpd
import pandas as pd

from ..config import METRIC_CRS, WGS84, PilotArea
from .forest_mask import _layer_path

log = logging.getLogger(__name__)

PLACE_CLASSES = ("city", "town", "village", "hamlet", "suburb", "locality",
                 "neighbourhood", "isolated_dwelling", "farm", "island")
NATURAL_CLASSES = ("peak",)


def read_places_geofabrik(source: str | Path, area: PilotArea, buffer_m: float = 10000) -> gpd.GeoDataFrame:
    padded = gpd.GeoSeries([area.polygon_3067.buffer(buffer_m)], crs=METRIC_CRS).to_crs(WGS84)
    bbox = tuple(padded.total_bounds)
    frames = []
    for layer, classes in (("gis_osm_places_free_1", PLACE_CLASSES),
                           ("gis_osm_natural_free_1", NATURAL_CLASSES)):
        where = "fclass IN ({}) AND name IS NOT NULL AND name <> ''".format(
            ",".join(f"'{c}'" for c in classes))
        try:
            gdf = gpd.read_file(_layer_path(Path(source), layer), bbox=bbox, where=where,
                                engine="pyogrio", columns=["name", "fclass"])
        except Exception as exc:  # noqa: BLE001 – layer missing in a custom bundle; names are nice-to-have
            log.warning("place names: skipping %s (%s)", layer, exc)
            continue
        frames.append(gdf)
    if not frames:
        return gpd.GeoDataFrame({"name": []}, geometry=[], crs=METRIC_CRS)
    places = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), crs=WGS84).to_crs(METRIC_CRS)
    return places[["name", "fclass", "geometry"]]


def name_zones(zones_3067: gpd.GeoDataFrame, places_3067: gpd.GeoDataFrame,
               max_distance_m: float = 5000) -> pd.Series:
    """Return a name per zone index. Falls back to 'Zone <last 5 of h3>' when nothing is near."""
    fallback = "Zone " + zones_3067["h3"].str.rstrip("f").str[-5:].str.upper()
    if places_3067 is None or len(places_3067) == 0:
        return fallback
    cent = gpd.GeoDataFrame({"h3": zones_3067["h3"].values}, index=zones_3067.index,
                            geometry=zones_3067.geometry.centroid, crs=METRIC_CRS)
    near = gpd.sjoin_nearest(cent, places_3067[["name", "geometry"]], how="left",
                             max_distance=max_distance_m, distance_col="dist")
    near = near[~near.index.duplicated(keep="first")]          # ties → first
    named = near.dropna(subset=["name"]).copy()
    named["rank"] = named.groupby("name")["dist"].rank(method="first").astype(int)
    names = named["name"] + " " + named["rank"].astype(str)
    return names.reindex(zones_3067.index).fillna(fallback)
