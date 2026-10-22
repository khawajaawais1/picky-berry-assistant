from datetime import date

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import box

from picky_data.ndvi.copernicus import tiles_utm, windows
from picky_data.ndvi.zonal import add_anomaly, stub_obs, zonal_ndvi

rasterio = pytest.importorskip("rasterio")


def test_windows_share_bins_across_years():
    w = windows(date(2024, 1, 1), date(2025, 12, 31))   # 2024 is a leap year
    y24 = [a.strftime("%m-%d") for a, _ in w if a.year == 2024]
    y25 = [a.strftime("%m-%d") for a, _ in w if a.year == 2025]
    assert y24 == y25 and len(y24) == 36
    assert "06-11" in y24 and "06-21" in y24
    assert all((b - a).days <= 10 for a, b in w)


def test_tiles_cover_pilot_under_2500px(real_area):
    tiles = tiles_utm(real_area)
    assert 4 <= len(tiles) <= 9
    for x0, y0, x1, y1 in tiles:
        assert (x1 - x0) / 20 <= 2500 and (y1 - y0) / 20 <= 2500


def test_zonal_ndvi_and_valid_fraction(tmp_path):
    from rasterio.transform import from_bounds

    # 100 × 100 px at 20 m in UTM 35N; left half NDVI 0.8, right half cloud (NaN)
    x0, y0 = 400000, 6900000
    arr = np.full((100, 100), 0.8, dtype="float32")
    arr[:, 50:] = np.nan
    path = tmp_path / "t.tif"
    with rasterio.open(path, "w", driver="GTiff", width=100, height=100, count=2, dtype="float32",
                       crs="EPSG:32635", transform=from_bounds(x0, y0, x0 + 2000, y0 + 2000, 100, 100),
                       nodata=np.nan) as dst:
        dst.write(np.stack([arr, np.ones_like(arr)]))
    zones = gpd.GeoDataFrame({"id": ["left", "both"]},
                             geometry=[box(x0, y0, x0 + 800, y0 + 2000), box(x0 + 600, y0, x0 + 1400, y0 + 2000)],
                             crs=32635)
    r = zonal_ndvi(zones, [path]).set_index("zone_id")
    assert r.loc["left", "ndvi_mean"] == pytest.approx(0.8)
    assert r.loc["left", "valid_fraction"] == pytest.approx(1.0)
    assert r.loc["both", "valid_fraction"] == pytest.approx(0.5, abs=0.05)


def test_anomaly_vs_baseline():
    rows = []
    for y, v in [(2021, 0.70), (2022, 0.72), (2023, 0.74), (2026, 0.80)]:
        rows.append(("z", date(y, 7, 10), date(y, 7, 19), v, 0.9))
    rows.append(("z", date(2026, 7, 20), date(2026, 7, 29), 0.9, 0.05))   # too cloudy
    obs = pd.DataFrame(rows, columns=["zone_id", "period_start", "period_end", "ndvi_mean", "valid_fraction"])
    a = add_anomaly(obs, [2021, 2022, 2023]).set_index("period_start")
    assert a.loc[date(2026, 7, 10), "ndvi_anomaly"] == pytest.approx(0.08)
    assert a.loc[date(2026, 7, 20), "ndvi_anomaly"] == 0.0


def test_stub():
    s = stub_obs(pd.DataFrame({"id": ["a", "b"]}))
    assert (s.ndvi_anomaly == 0).all() and len(s) == 2


def test_ndvi_range_check():
    from picky_data.checks import check_ndvi

    assert check_ndvi(pd.DataFrame({"ndvi_mean": [0.5, np.nan, -0.2]}))[0].ok
    assert not check_ndvi(pd.DataFrame({"ndvi_mean": [1.4]}))[0].ok
