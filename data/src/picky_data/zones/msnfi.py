"""Optional enrichment from Luke's Multi-Source National Forest Inventory (MS-NFI) rasters.

OSM tells us *where* forest is, not *which* forest, and it maps bogs poorly in Central
Finland (first real run: 9.6 km² of mire in 3,600 km²). MS-NFI fills both gaps with free
16 m rasters for the whole of Finland (https://kartta.luke.fi/opendata/valinta.html, CC BY 4.0):

Files: Luke publishes each 2023 layer as ONE whole-Finland GeoTIFF on the Funet mirror
(``{layer}_vmi1x_1923.tif``, 0.3–1.7 GB). ``picky-data msnfi-download`` reads only the pilot
square from it over HTTP (GDAL /vsicurl) and writes small ``{layer}_pilot.tif`` files.

* volume of pine / spruce / birch + other broadleaf (m³/ha) → forest_pine / forest_spruce / forest_broadleaf
* site fertility class (kasvupaikka_, 2023 codes 1–10: 1 herb-rich … 6 barren, 7 rocky/sandy) → fertility_class
* site main class (paatyyppi_: 1 mineral soil, 2 spruce mire, 3 pine mire, 4 treeless peatland)
                                                                     → mire share of the zone

Every layer may be given as several files (map sheets); they are mosaicked by summing per-zone
pixel counts, so zones crossing a sheet edge are handled. Codes 32766 (no estimate, e.g.
clouds) and 32767 (not forestry land, or outside Finland) are ignored (README-2023.txt). Pass any subset; missing
rasters simply leave zones as ``forest_unknown`` with OSM's mire share.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

NODATA_MIN = 32000            # MS-NFI 32766 = no estimate (clouds), 32767 = not forestry land / outside Finland
MIRE_SITE_CLASSES = (2, 3, 4)  # spruce mire, pine mire, treeless peatland
MAX_CLASS = 16


def _as_list(v) -> list[Path]:
    """Paths or glob patterns (PowerShell does not expand ``*`` for us) → sorted file list."""
    import glob

    if v is None:
        return []
    items = [v] if isinstance(v, (str, Path)) else list(v)
    out: list[Path] = []
    for item in items:
        s = str(item)
        matches = sorted(glob.glob(s)) if any(ch in s for ch in "*?[") else [s]
        if not matches:
            raise FileNotFoundError(f"no MS-NFI files match {s}")
        out.extend(Path(m) for m in matches)
    return out


@dataclass
class MsnfiRasters:
    pine: Sequence[Path] | Path | None = None
    spruce: Sequence[Path] | Path | None = None
    broadleaf: Sequence[Path] | Path | None = None   # birch + other broadleaf: give both files
    fertility: Sequence[Path] | Path | None = None
    site_type: Sequence[Path] | Path | None = None

    def __post_init__(self):
        for k in ("pine", "spruce", "broadleaf", "fertility", "site_type"):
            setattr(self, k, _as_list(getattr(self, k)))

    def any(self) -> bool:
        return any([self.pine, self.spruce, self.broadleaf, self.fertility, self.site_type])


MSNFI_URL = "https://www.nic.funet.fi/index/geodata/luke/vmi/{year}/{layer}_vmi1x_1923.tif"
LAYERS = {                     # MS-NFI file prefix → MsnfiRasters field
    "paatyyppi": "site_type",
    "kasvupaikka": "fertility",
    "manty": "pine",
    "kuusi": "spruce",
    "koivu": "broadleaf",
    "muulp": "broadleaf",
}


def from_dir(folder: str | Path) -> MsnfiRasters:
    """Pick up ``<prefix>_*.tif`` files in a folder (ignores the _tukki/_kuitu timber-grade variants)."""
    folder = Path(folder)
    found: dict[str, list[Path]] = {}
    for prefix, fld in LAYERS.items():
        files = [f for f in sorted(folder.glob(f"{prefix}_*.tif"))
                 if "tukki" not in f.name and "kuitu" not in f.name]
        found.setdefault(fld, []).extend(files)
    if not any(found.values()):
        raise FileNotFoundError(f"no MS-NFI GeoTIFFs in {folder} – run `picky-data msnfi-download` first")
    return MsnfiRasters(**{k: v or None for k, v in found.items()})


def clip_layer(source: str, bounds_3067: tuple[float, float, float, float], out: Path) -> Path:
    """Copy the part of a (possibly remote, whole-Finland) MS-NFI GeoTIFF inside bounds to ``out``."""
    import rasterio
    from rasterio.windows import Window, from_bounds

    path = f"/vsicurl/{source}" if source.startswith(("http://", "https://")) else source
    env = dict(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
               GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="5", VSI_CACHE="TRUE")
    with rasterio.Env(**env), rasterio.open(path) as src:
        win = from_bounds(*bounds_3067, transform=src.transform).round_offsets().round_lengths()
        win = win.intersection(Window(0, 0, src.width, src.height))
        arr = src.read(1, window=win)
        profile = src.profile.copy()
        profile.update(driver="GTiff", width=arr.shape[1], height=arr.shape[0],
                       transform=src.window_transform(win), compress="deflate", tiled=True,
                       blockxsize=256, blockysize=256, BIGTIFF="IF_SAFER")
    out.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(out, "w", **profile) as dst:
        dst.write(arr, 1)
    return out


def zone_index_raster(zones, shape, transform):
    """Rasterize zone positions (0..n-1) onto a grid; -1 = no zone."""
    from rasterio.features import rasterize

    return rasterize(
        ((geom, i) for i, geom in enumerate(zones.geometry.values)),
        out_shape=shape, transform=transform, fill=-1, dtype="int32",
    )


def zonal_sum_mean(values: np.ndarray, zone_idx: np.ndarray, n: int,
                   nodata: float | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Per-zone sum and mean of valid pixels (pure numpy; used by MS-NFI and NDVI)."""
    valid = zone_idx >= 0
    v = values.astype("float64")
    valid &= np.isfinite(v)
    if nodata is not None:
        valid &= v != nodata
    idx = zone_idx[valid]
    sums = np.bincount(idx, weights=v[valid], minlength=n)
    counts = np.bincount(idx, minlength=n)
    with np.errstate(invalid="ignore", divide="ignore"):
        means = np.where(counts > 0, sums / counts, np.nan)
    return sums, means


def zonal_majority(values: np.ndarray, zone_idx: np.ndarray, n: int,
                   nodata: float | None = None) -> np.ndarray:
    valid = (zone_idx >= 0) & np.isfinite(values.astype("float64"))
    if nodata is not None:
        valid &= values != nodata
    df = pd.DataFrame({"z": zone_idx[valid], "v": values[valid]})
    if df.empty:
        return np.full(n, np.nan)
    maj = df.groupby("z")["v"].agg(lambda s: s.value_counts().idxmax())
    out = np.full(n, np.nan)
    out[maj.index.values] = maj.values
    return out


def _tile(path: Path, zones: gpd.GeoDataFrame):
    """Read the part of one raster that overlaps the zones; return (arr, zone_idx) or None.

    Reads only real pixels (no boundless fill), so per-zone pixel totals add up correctly
    across neighbouring map sheets.
    """
    import rasterio
    from rasterio.windows import Window, from_bounds

    with rasterio.open(path) as src:
        z = zones.to_crs(src.crs)
        full = Window(0, 0, src.width, src.height)
        try:
            win = from_bounds(*z.total_bounds, transform=src.transform).round_offsets().round_lengths()
            win = win.intersection(full)
        except Exception:  # noqa: BLE001 – rasterio raises WindowError when there is no overlap
            return None
        if win.width <= 0 or win.height <= 0:
            return None
        arr = src.read(1, window=win)
        transform = src.window_transform(win)
    idx = zone_index_raster(z, arr.shape, transform)
    return arr, idx


def _valid(arr: np.ndarray, idx: np.ndarray) -> np.ndarray:
    a = arr.astype("float64")
    return (idx >= 0) & np.isfinite(a) & (a >= 0) & (a < NODATA_MIN)


def _zonal_volume(paths: list[Path], zones: gpd.GeoDataFrame) -> np.ndarray:
    n = len(zones)
    total = np.zeros(n)
    for p in paths:
        t = _tile(p, zones)
        if t is None:
            continue
        arr, idx = t
        ok = _valid(arr, idx)
        total += np.bincount(idx[ok], weights=arr[ok].astype("float64"), minlength=n)
    return total


def _zonal_class_counts(paths: list[Path], zones: gpd.GeoDataFrame) -> tuple[np.ndarray, np.ndarray]:
    """(n × MAX_CLASS+1 class pixel counts, n total zone pixels incl. water/non-forest)."""
    n = len(zones)
    counts = np.zeros((n, MAX_CLASS + 1))
    pixels = np.zeros(n)
    for p in paths:
        t = _tile(p, zones)
        if t is None:
            continue
        arr, idx = t
        inside = idx >= 0
        pixels += np.bincount(idx[inside], minlength=n)
        ok = _valid(arr, idx) & (arr <= MAX_CLASS)
        flat = idx[ok] * (MAX_CLASS + 1) + arr[ok].astype("int64")
        counts += np.bincount(flat, minlength=n * (MAX_CLASS + 1)).reshape(n, MAX_CLASS + 1)
    return counts, pixels


def enrich(zones_3067: gpd.GeoDataFrame, rasters: MsnfiRasters) -> pd.DataFrame:
    """Per-zone columns: share_pine/spruce/broadleaf (of volume), fertility_class (majority),
    mire_share (share of the zone's area on spruce mire, pine mire or open peatland)."""
    result = pd.DataFrame(index=zones_3067.index)
    vols = {name: _zonal_volume(getattr(rasters, name), zones_3067)
            for name in ("pine", "spruce", "broadleaf") if getattr(rasters, name)}
    if vols:
        total = sum(vols.values())
        with np.errstate(invalid="ignore", divide="ignore"):
            for name, v in vols.items():
                result[f"share_{name}"] = np.where(total > 0, v / total, np.nan)
    if rasters.fertility:
        counts, _ = _zonal_class_counts(rasters.fertility, zones_3067)
        has = counts.sum(axis=1) > 0
        result["fertility_class"] = np.where(has, counts.argmax(axis=1), np.nan)
    if rasters.site_type:
        counts, pixels = _zonal_class_counts(rasters.site_type, zones_3067)
        mire_px = counts[:, list(MIRE_SITE_CLASSES)].sum(axis=1)
        with np.errstate(invalid="ignore", divide="ignore"):
            result["mire_share"] = np.where(pixels > 0, np.clip(mire_px / pixels, 0, 1), np.nan)
    return result
