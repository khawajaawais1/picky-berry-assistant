"""MS-NFI enrichment on synthetic 16 m rasters split over two map sheets."""
import json

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import box

from picky_data.zones.build import build_zones, combine_mire
from picky_data.zones.forest_mask import read_geofabrik
from picky_data.zones.msnfi import MsnfiRasters, enrich

rasterio = pytest.importorskip("rasterio")
from rasterio.transform import from_origin  # noqa: E402

PX = 16.0


def _write_sheets(tmp_path, name, arr, x0, y1):
    """Split one array into a west and an east sheet (like two MS-NFI map sheets)."""
    h, w = arr.shape
    half = w // 2
    paths = []
    for i, (a, xo) in enumerate([(arr[:, :half], x0), (arr[:, half:], x0 + half * PX)]):
        p = tmp_path / f"{name}_{i}.tif"
        with rasterio.open(p, "w", driver="GTiff", width=a.shape[1], height=a.shape[0], count=1,
                           dtype="int16", crs="EPSG:3067", transform=from_origin(xo, y1, PX, PX),
                           nodata=32767) as dst:
            dst.write(a.astype("int16"), 1)
        paths.append(p)
    return paths


def test_enrich_across_two_sheets(tmp_path):
    x0, y0 = 430000.0, 6900000.0
    w = h = 200                                    # 3.2 km × 3.2 km
    y1 = y0 + h * PX
    site = np.ones((h, w))                         # mineral soil …
    site[:, 150:] = 4                              # … east quarter is open peatland
    site[:10, :] = 32767                           # a strip of water
    pine = np.full((h, w), 80.0)
    spruce = np.full((h, w), 20.0)
    fert = np.full((h, w), 4)
    fert[:, :60] = 3
    paths = {k: _write_sheets(tmp_path, k, a, x0, y1)
             for k, a in {"site": site, "pine": pine, "spruce": spruce, "fert": fert}.items()}
    # zone A spans the edge between the two sheets, zone B sits on the bog
    zones = gpd.GeoDataFrame({"id": ["A", "B"]}, geometry=[
        box(x0 + 800, y0 + 400, x0 + 2000, y0 + 1600),
        box(x0 + 2500, y0 + 400, x0 + 3100, y0 + 1600)], crs=3067)
    r = MsnfiRasters(pine=paths["pine"], spruce=paths["spruce"],
                     fertility=paths["fert"], site_type=paths["site"])
    e = enrich(zones, r)
    assert e.loc[0, "share_pine"] == pytest.approx(0.8)
    assert e.loc[0, "mire_share"] == pytest.approx(0.0)
    assert e.loc[1, "mire_share"] == pytest.approx(1.0)
    assert e.loc[0, "fertility_class"] == 4


def test_glob_patterns(tmp_path):
    for i in range(3):
        (tmp_path / f"manty_{i}.tif").write_bytes(b"")
    r = MsnfiRasters(pine=[str(tmp_path / "manty_*.tif")])
    assert len(r.pine) == 3
    with pytest.raises(FileNotFoundError):
        MsnfiRasters(spruce=[str(tmp_path / "kuusi_*.tif")])


def test_combine_mire():
    f, m = combine_mire(pd.Series([0.9, 0.2, 0.5]), pd.Series([0.0, 0.0, 0.3]), pd.Series([0.3, 0.7, 0.1]))
    assert f.round(3).tolist() == [0.6, 0.0, 0.5]       # bog taken out of OSM forest first
    assert m.round(3).tolist() == [0.3, 0.7, 0.3]       # open bog OSM missed is added
    assert ((f + m) <= 1 + 1e-9).all()


def test_build_zones_uses_msnfi_bogs(small_area, geofabrik_zip, tmp_path):
    """A bog only MS-NFI knows about turns farmland-free cells into mire zones."""
    x0, y0, x1, y1 = small_area.bbox_3067
    w = int((x1 - x0) / PX)
    h = int((y1 - y0) / PX)
    site = np.ones((h, w))
    site[: h // 3, : w // 3] = 4                   # NW third: open bog unknown to OSM
    sheets = _write_sheets(tmp_path, "site", site, x0, y1)
    mask = read_geofabrik(geofabrik_zip, small_area)
    plain = build_zones(small_area, mask, None, None, "t")
    rich = build_zones(small_area, mask, None, MsnfiRasters(site_type=sheets), "t")
    assert (rich.forest_type == "mire").sum() > (plain.forest_type == "mire").sum()
    hab = rich.habitat.map(json.loads)
    assert all(sum(v.values()) <= 1.0001 for v in hab)


def _finland_like(tmp_path, layer, value):
    """A 'whole-country' raster (here 40 × 40 km) around the small test area, 32767 outside forest."""
    x0, y1 = 410000.0, 6925000.0
    n = int(40000 / PX)
    arr = np.full((n, n), value, dtype="int16")
    arr[:5, :] = 32767
    p = tmp_path / f"{layer}_vmi1x_1923.tif"
    with rasterio.open(p, "w", driver="GTiff", width=n, height=n, count=1, dtype="int16",
                       crs="EPSG:3067", transform=from_origin(x0, y1, PX, PX), nodata=32767) as dst:
        dst.write(arr, 1)
    return p


def test_clip_layer_cuts_pilot_square(tmp_path, small_area):
    from picky_data.zones.msnfi import clip_layer

    src = _finland_like(tmp_path, "paatyyppi", 4)
    out = clip_layer(str(src), small_area.bbox_3067, tmp_path / "out" / "paatyyppi_pilot.tif")
    with rasterio.open(out) as r:
        b = r.bounds
        assert r.crs.to_epsg() == 3067 and r.res == (PX, PX)
        x0, y0, x1, y1 = small_area.bbox_3067
        assert abs(b.left - x0) <= PX and abs(b.top - y1) <= PX and abs(b.right - x1) <= PX
        assert (r.read(1) == 4).all()


def test_download_from_source_dir_then_zones_from_dir(tmp_path, small_area, geofabrik_zip):
    from picky_data.zones.msnfi import clip_layer, from_dir

    full = tmp_path / "full"
    full.mkdir()
    for layer, v in {"paatyyppi": 3, "kasvupaikka": 4, "manty": 120, "kuusi": 10, "koivu": 5, "muulp": 1}.items():
        _finland_like(full, layer, v)
    (full / "manty_tukki_vmi1x_1923.tif").write_bytes(b"")          # timber-grade variant must be ignored
    out = tmp_path / "msnfi"
    for layer in ("paatyyppi", "kasvupaikka", "manty", "kuusi", "koivu", "muulp"):
        clip_layer(str(full / f"{layer}_vmi1x_1923.tif"), small_area.bbox_3067, out / f"{layer}_pilot.tif")
    r = from_dir(out)
    assert len(r.broadleaf) == 2 and len(r.pine) == 1
    zones = build_zones(small_area, read_geofabrik(geofabrik_zip, small_area), None, r, "t")
    assert set(zones.forest_type) <= {"mire", "forest_pine"}          # every pixel is pine mire, pine-dominated
    assert (zones.forest_type == "mire").all()
    assert (zones.fertility_class == 4).all()


def test_from_dir_empty(tmp_path):
    from picky_data.zones.msnfi import from_dir

    with pytest.raises(FileNotFoundError):
        from_dir(tmp_path)
