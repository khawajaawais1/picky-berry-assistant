"""Shared fixtures: a small 10 × 10 km pilot area and a synthetic Geofabrik-style zip."""
from __future__ import annotations

import zipfile
from pathlib import Path

import geopandas as gpd
import pytest
import yaml
from shapely.geometry import Point, box

from picky_data.config import CONFIG_DIR, PilotArea

# 10 × 10 km square inside the real pilot area (Laajavuori / Jyväskylä west)
SMALL_BBOX = [425000, 6900000, 435000, 6910000]


@pytest.fixture(scope="session")
def real_area() -> PilotArea:
    return PilotArea.load()


@pytest.fixture(scope="session")
def small_area(tmp_path_factory) -> PilotArea:
    cfg = yaml.safe_load((CONFIG_DIR / "pilot_area.yaml").read_text(encoding="utf-8"))
    cfg["name"] = "test-small"
    cfg["bbox_3067"] = SMALL_BBOX
    poly = gpd.GeoSeries([box(*SMALL_BBOX)], crs=3067).to_crs(4326)
    cfg["bbox_wgs84"] = [round(float(v), 4) for v in poly.total_bounds]
    cfg["zones"]["expected_count"] = [50, 160]
    path = tmp_path_factory.mktemp("cfg") / "pilot_area.yaml"
    path.write_text(yaml.safe_dump(cfg), encoding="utf-8")
    return PilotArea.load(path)


@pytest.fixture(scope="session")
def geofabrik_zip(tmp_path_factory) -> Path:
    """Forest covers the west 60 % of the square, a bog sits in the NE, places are points."""
    d = tmp_path_factory.mktemp("geofabrik")
    x0, y0, x1, y1 = SMALL_BBOX
    forest = gpd.GeoDataFrame(
        {"fclass": ["forest", "forest", "farmland"]},
        geometry=[box(x0 - 3000, y0 - 3000, x0 + 6000, y1 + 3000),        # big forest (overlaps bog)
                  box(x0 + 7000, y0, x0 + 8000, y0 + 1000),                 # small wood
                  box(x0 + 6000, y0, x1, y0 + 4000)],                       # farmland: ignored
        crs=3067).to_crs(4326)
    water = gpd.GeoDataFrame(
        {"fclass": ["wetland", "water"]},
        geometry=[box(x0 + 5000, y0 + 6000, x1, y1),                        # bog (overlaps forest by 1 km)
                  box(x0 + 7000, y0 + 4500, x0 + 9000, y0 + 5500)],         # lake: ignored
        crs=3067).to_crs(4326)
    places = gpd.GeoDataFrame(
        {"fclass": ["village", "hamlet"], "name": ["Laajavuori", "Kypärämäki"]},
        geometry=[Point(x0 + 2000, y0 + 5000), Point(x0 + 8000, y0 + 8000)], crs=3067).to_crs(4326)
    natural = gpd.GeoDataFrame({"fclass": ["peak"], "name": ["Vuorenmäki"]},
                               geometry=[Point(x0 + 2000, y0 + 1000)], crs=3067).to_crs(4326)
    layers = {"gis_osm_landuse_a_free_1": forest, "gis_osm_water_a_free_1": water,
              "gis_osm_places_free_1": places, "gis_osm_natural_free_1": natural}
    for name, gdf in layers.items():
        gdf.to_file(d / f"{name}.shp", engine="pyogrio")
    zpath = d / "finland-latest-free.shp.zip"
    with zipfile.ZipFile(zpath, "w") as zf:
        for f in d.iterdir():
            if f.suffix in (".shp", ".shx", ".dbf", ".prj", ".cpg"):
                zf.write(f, f.name)
    return zpath
