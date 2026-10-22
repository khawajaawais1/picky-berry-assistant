"""Optional enrichment from Luke's Multi-Source National Forest Inventory (MS-NFI) rasters.

OSM tells us *where* forest is, not *which* forest. Bilberry vs. lingonberry habitat is
mostly decided by dominant tree species and site fertility, which MS-NFI provides as free
16 m rasters for the whole of Finland (https://kartta.luke.fi/opendata/valinta.html):

* volume of pine / spruce / broadleaf (m³/ha)  →  forest_pine / forest_spruce / forest_broadleaf
* site fertility class (kasvupaikka, 1 = herb-rich … 6+ = barren)  →  fertility_class

Pass any subset; missing rasters simply leave the zone as ``forest_unknown``.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd


@dataclass
class MsnfiRasters:
    pine: Path | None = None
    spruce: Path | None = None
    broadleaf: Path | None = None
    fertility: Path | None = None

    def any(self) -> bool:
        return any([self.pine, self.spruce, self.broadleaf, self.fertility])


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


def _read_window(path: Path, zones_in_raster_crs: gpd.GeoDataFrame):
    import rasterio
    from rasterio.windows import from_bounds

    with rasterio.open(path) as src:
        win = from_bounds(*zones_in_raster_crs.total_bounds, transform=src.transform).round_offsets().round_lengths()
        arr = src.read(1, window=win, boundless=True, fill_value=src.nodata if src.nodata is not None else 0)
        return arr, src.window_transform(win), src.nodata, src.crs


def enrich(zones_3067: gpd.GeoDataFrame, rasters: MsnfiRasters) -> pd.DataFrame:
    """Return per-zone shares of pine/spruce/broadleaf volume and fertility class."""
    n = len(zones_3067)
    result = pd.DataFrame(index=zones_3067.index)
    vols = {}
    for name in ("pine", "spruce", "broadleaf"):
        path = getattr(rasters, name)
        if not path:
            continue
        import rasterio
        with rasterio.open(path) as src:
            crs = src.crs
        z = zones_3067.to_crs(crs)
        arr, transform, nodata, _ = _read_window(Path(path), z)
        idx = zone_index_raster(z, arr.shape, transform)
        vols[name], _ = zonal_sum_mean(arr, idx, n, nodata)
    if vols:
        total = sum(vols.values())
        with np.errstate(invalid="ignore", divide="ignore"):
            for name, v in vols.items():
                result[f"share_{name}"] = np.where(total > 0, v / total, np.nan)
    if rasters.fertility:
        import rasterio
        with rasterio.open(rasters.fertility) as src:
            crs = src.crs
        z = zones_3067.to_crs(crs)
        arr, transform, nodata, _ = _read_window(Path(rasters.fertility), z)
        idx = zone_index_raster(z, arr.shape, transform)
        result["fertility_class"] = zonal_majority(arr, idx, n, nodata)
    return result
