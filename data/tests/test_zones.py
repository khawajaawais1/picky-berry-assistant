import json

import geopandas as gpd
import h3
import pytest
from shapely.geometry import box

from picky_data.checks import check_zones
from picky_data.zones import h3_grid
from picky_data.zones.build import build_zones, classify, write_zones
from picky_data.zones.forest_mask import read_geofabrik
from picky_data.zones.naming import read_places_geofabrik
from picky_data.zones.test_zones import make_test_zones


def test_pilot_area_is_60km_square(real_area):
    xmin, ymin, xmax, ymax = real_area.bbox_3067
    assert (xmax - xmin, ymax - ymin) == (60000, 60000)
    w, s, e, n = real_area.bbox_wgs84
    pw, ps, pe, pn = real_area.polygon_wgs84.bounds
    assert w <= pw + 1e-3 and s <= ps + 1e-3 and e >= pe - 1e-3 and n >= pn - 1e-3


def test_real_area_cell_count(real_area):
    cells = h3_grid.cells_for_area(real_area, 8)
    # res-8 cells here are ≈ 0.57 km² (H3's 0.74 km² is a global average) → ≈ 6,270 cells
    assert 6000 < len(cells) < 6500
    assert all(h3.get_resolution(c) == 8 for c in cells[:10])


def test_zone_id_is_stable():
    c = "881126d2d7fffff"
    assert h3_grid.zone_id(c) == h3_grid.zone_id(c)
    assert h3_grid.zone_id(c) != h3_grid.zone_id("881126d2d3fffff")


def test_habitat_fractions_full_and_half():
    cell = h3.latlng_to_cell(62.25, 25.69, 8)
    grid = h3_grid.cells_to_gdf([cell]).to_crs(3067)
    x0, y0, x1, y1 = grid.total_bounds
    xm = grid.geometry.centroid.x.iloc[0]
    full = gpd.GeoDataFrame({"habitat": ["forest"]}, geometry=[box(x0 - 10, y0 - 10, x1 + 10, y1 + 10)], crs=3067)
    half = gpd.GeoDataFrame({"habitat": ["mire"]}, geometry=[box(x0 - 10, y0 - 10, xm, y1 + 10)], crs=3067)
    assert h3_grid.habitat_fractions(grid, full).loc[0, "forest"] == pytest.approx(1.0)
    assert h3_grid.habitat_fractions(grid, half).loc[0, "mire"] == pytest.approx(0.5, abs=0.01)


def test_classify():
    assert classify(0.7, 0.0, None) == ("forest_unknown", {"forest_unknown": 0.7})
    assert classify(0.2, 0.5, None)[0] == "mire"
    lab, hab = classify(0.8, 0.1, {"pine": 0.7, "spruce": 0.2, "broadleaf": 0.1})
    assert lab == "forest_pine" and hab == {"forest_pine": 0.8, "mire": 0.1}
    assert classify(0.8, 0, {"pine": 0.4, "spruce": 0.4, "broadleaf": 0.2})[0] == "forest_mixed"


def test_mask_from_geofabrik_zip(small_area, geofabrik_zip):
    mask = read_geofabrik(geofabrik_zip, small_area)
    assert set(mask.habitat) == {"forest", "mire"}
    # no overlap between classes: mire wins
    f = mask[mask.habitat == "forest"].union_all()
    m = mask[mask.habitat == "mire"].union_all()
    assert f.intersection(m).area < 1.0


def test_build_zones_end_to_end(small_area, geofabrik_zip, tmp_path):
    mask = read_geofabrik(geofabrik_zip, small_area)
    places = read_places_geofabrik(geofabrik_zip, small_area)
    zones = build_zones(small_area, mask, places, None, "test")
    assert len(zones) > 0
    assert zones.crs.to_epsg() == 4326
    assert (zones.forest_fraction + zones.mire_fraction >= 0.4 - 1e-6).all()
    assert {"mire", "forest_unknown"} <= set(zones.forest_type)
    assert zones["name"].str.match(r"^((Laajavuori|Kypärämäki|Vuorenmäki) \d+|Zone [0-9A-F]{5})$").all()
    assert zones["id"].is_unique
    for c in check_zones(zones, small_area):
        assert c.ok, str(c)
    # farmland-only east-south cells are excluded
    paths = write_zones(zones, tmp_path)
    gj = json.loads(paths["geojson"].read_text(encoding="utf-8"))
    assert len(gj["features"]) == len(zones)
    again = build_zones(small_area, mask, places, None, "test")
    assert list(again["id"]) == list(zones["id"])          # deterministic


def test_test_zones_match_api_shape():
    fc = make_test_zones()
    assert len(fc["features"]) == 50
    f = fc["features"][0]
    props = f["properties"]
    for key in ("h3", "name", "species", "score", "confidence", "ripeness", "updated_at"):
        assert key in props
    assert 0 <= props["score"] <= 100
    assert props["confidence"] in {"high", "medium", "low"}
    assert set(props["scores"]) == {"bilberry", "lingonberry", "cloudberry", "crowberry"}
    assert f["geometry"]["type"] == "Polygon"
    assert make_test_zones() == fc                          # deterministic
