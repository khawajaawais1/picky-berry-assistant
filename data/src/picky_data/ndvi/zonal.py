"""Zonal NDVI per zone from cached tiles, and anomaly vs. the multi-year baseline."""
from __future__ import annotations

from datetime import date
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from ..zones.msnfi import zonal_sum_mean, zone_index_raster

MIN_VALID_FRACTION = 0.2   # fewer clear pixels than this → treat the window as missing


def zonal_ndvi(zones: gpd.GeoDataFrame, tile_paths: list[Path]) -> pd.DataFrame:
    """Mean NDVI and share of clear pixels per zone, mosaicking the tiles."""
    import rasterio

    n = len(zones)
    sums, counts, pix = np.zeros(n), np.zeros(n), np.zeros(n)
    for p in tile_paths:
        with rasterio.open(p) as src:
            ndvi = src.read(1)
            transform = src.transform
            z = zones.to_crs(src.crs)
        idx = zone_index_raster(z, ndvi.shape, transform)
        s, _ = zonal_sum_mean(ndvi, idx, n)
        c = np.bincount(idx[(idx >= 0) & np.isfinite(ndvi)], minlength=n)
        t = np.bincount(idx[idx >= 0], minlength=n)
        sums += s
        counts += c
        pix += t
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.where(counts > 0, sums / counts, np.nan)
        valid = np.where(pix > 0, counts / pix, 0.0)
    return pd.DataFrame({"zone_id": zones["id"].values, "ndvi_mean": mean, "valid_fraction": valid})


def add_anomaly(obs: pd.DataFrame, baseline_years: list[int]) -> pd.DataFrame:
    """obs: zone_id, period_start, period_end, ndvi_mean, valid_fraction.

    Baseline = mean ndvi_mean of the same zone and the same dekad bin (month-day of
    period_start) over baseline_years. Anomaly = ndvi_mean − baseline; 0 when either is
    missing (deep dive §13: "Anomaly = 0 when missing").
    """
    df = obs.copy()
    df["period_start"] = pd.to_datetime(df["period_start"])
    df.loc[df["valid_fraction"] < MIN_VALID_FRACTION, "ndvi_mean"] = np.nan
    df["bin"] = df["period_start"].dt.strftime("%m-%d")
    base = (df[df["period_start"].dt.year.isin(baseline_years)]
            .groupby(["zone_id", "bin"])["ndvi_mean"].mean().rename("ndvi_baseline"))
    df = df.drop(columns=[c for c in ("ndvi_baseline",) if c in df]).join(base, on=["zone_id", "bin"])
    df["ndvi_anomaly"] = (df["ndvi_mean"] - df["ndvi_baseline"]).fillna(0.0).round(4)
    df["period_start"] = df["period_start"].dt.date
    return df.drop(columns="bin")


def stub_obs(zones: pd.DataFrame, today: date | None = None) -> pd.DataFrame:
    """D14 stub: one row per zone with ndvi_anomaly = 0."""
    today = today or date.today()
    return pd.DataFrame({"zone_id": zones["id"].values, "period_start": today, "period_end": today,
                         "ndvi_mean": np.nan, "valid_fraction": 0.0, "ndvi_baseline": np.nan,
                         "ndvi_anomaly": 0.0})
