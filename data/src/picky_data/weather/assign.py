"""Zone → weather station weights (inverse-distance, k nearest, in EPSG:3067)."""
from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd

from ..config import METRIC_CRS


def idw_weights(zones: gpd.GeoDataFrame, stations: gpd.GeoDataFrame, k: int = 3,
                power: float = 2.0, max_km: float | None = None) -> pd.DataFrame:
    """Return rows (zone_id, fmisid, weight) with weights summing to 1 per zone."""
    if len(stations) == 0:
        raise ValueError("no weather stations – run with --stub-one-station or widen the buffer")
    zc = zones.to_crs(METRIC_CRS).geometry.centroid
    sc = stations.to_crs(METRIC_CRS).geometry
    zx, zy = zc.x.values[:, None], zc.y.values[:, None]
    sx, sy = sc.x.values[None, :], sc.y.values[None, :]
    dist = np.hypot(zx - sx, zy - sy)                       # (zones, stations) metres
    k = min(k, dist.shape[1])
    nearest = np.argsort(dist, axis=1)[:, :k]
    d = np.take_along_axis(dist, nearest, axis=1)
    if max_km is not None:
        far = d > max_km * 1000
        far[:, 0] = False                                   # always keep the nearest one
        d = np.where(far, np.inf, d)
    with np.errstate(divide="ignore"):
        w = 1.0 / np.maximum(d, 1.0) ** power               # ≥ 1 m avoids division by zero
    w = np.where(np.isinf(d), 0.0, w)
    w = w / w.sum(axis=1, keepdims=True)
    rows = pd.DataFrame({
        "zone_id": np.repeat(zones["id"].values, k),
        "fmisid": stations["fmisid"].values[nearest].ravel(),
        "weight": w.ravel(),
    })
    rows = rows[rows["weight"] > 1e-4].copy()
    rows["weight"] = rows["weight"] / rows.groupby("zone_id")["weight"].transform("sum")
    rows["weight"] = rows["weight"].round(5)
    return rows.reset_index(drop=True)


def zone_weather(weights: pd.DataFrame, daily: pd.DataFrame) -> pd.DataFrame:
    """Python equivalent of the SQL view weather_daily (for checks and offline use)."""
    j = weights.merge(daily, on="fmisid")
    out = {}
    for col in ("tmean_c", "precip_mm", "gdd_since_apr1"):
        valid = j[col].notna()
        num = (j[col].where(valid, 0) * j["weight"]).groupby([j.zone_id, j.date]).sum()
        den = (j["weight"].where(valid, 0)).groupby([j.zone_id, j.date]).sum()
        out[col] = num / den.replace(0, np.nan)
    return pd.DataFrame(out).reset_index()
