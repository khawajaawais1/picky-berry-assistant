"""FMI open data (no API key): daily observations for all stations near the pilot area.

Plain WFS over ``requests`` – no fmiopendata dependency (its 0.5.0 sdist fails to build on
recent setuptools / Python 3.12+).

* stations: stored query ``fmi::ef::stations`` → fmisid, name, lat/lon
* daily obs: ``fmi::observations::weather::daily::simple`` with a bbox and
  parameters tday (mean °C), tmin, tmax, rrday (mm, −1 = none), snow (cm, −1 = none);
  rows are matched to stations by position.

Requests are chunked by month and cached as Parquet in data/cache/fmi, so a 2021–2026
backfill can be resumed and re-runs only refresh the last few days.
"""
from __future__ import annotations

import logging
import time
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import requests

from ..config import CACHE_DIR, METRIC_CRS, WGS84, PilotArea

log = logging.getLogger(__name__)

WFS_URL = "https://opendata.fmi.fi/wfs"
DAILY_QUERY = "fmi::observations::weather::daily::simple"
STATIONS_QUERY = "fmi::ef::stations"

PARAMS = {"tday": "tmean_c", "tmin": "tmin_c", "tmax": "tmax_c", "rrday": "precip_mm", "snow": "snow_cm"}
COLUMNS = ["fmisid", "date", *PARAMS.values()]
STATION_COLUMNS = ["fmisid", "name", "lat", "lon"]
TEMP_RANGE_C = (-50.0, 40.0)   # outside → treated as a sensor error (NaN)


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(el, name):
    return [c for c in el.iter() if _local(c.tag) == name]


def parse_stations(xml: bytes | str) -> pd.DataFrame:
    root = ET.fromstring(xml)
    rows = []
    for fac in _children(root, "EnvironmentalMonitoringFacility"):
        fmisid = name = pos = None
        for c in fac.iter():
            tag = _local(c.tag)
            if tag == "identifier" and "fmisid" in (c.get("codeSpace") or ""):
                fmisid = int(c.text.strip())
            elif tag == "name" and (c.get("codeSpace") or "").endswith("/name") and name is None:
                name = c.text.strip()
            elif tag == "pos" and pos is None:
                pos = c.text.split()
        if fmisid is not None and pos:
            rows.append({"fmisid": fmisid, "name": name or str(fmisid),
                         "lat": float(pos[0]), "lon": float(pos[1])})
    return pd.DataFrame(rows, columns=STATION_COLUMNS).drop_duplicates("fmisid")


def parse_daily_simple(xml: bytes | str) -> pd.DataFrame:
    """BsWfsElement rows → long frame (lat, lon, date, param, value)."""
    root = ET.fromstring(xml)
    rows = []
    for el in _children(root, "BsWfsElement"):
        rec = {}
        for c in el.iter():
            tag = _local(c.tag)
            if tag == "pos":
                lat, lon = c.text.split()[:2]
                rec["lat"], rec["lon"] = float(lat), float(lon)
            elif tag == "Time":
                rec["date"] = pd.Timestamp(c.text.strip()).date()
            elif tag == "ParameterName":
                rec["param"] = c.text.strip()
            elif tag == "ParameterValue":
                txt = (c.text or "").strip()
                rec["value"] = float(txt) if txt and txt.lower() != "nan" else np.nan
        if {"lat", "lon", "date", "param"} <= rec.keys():
            rows.append(rec)
    return pd.DataFrame(rows, columns=["lat", "lon", "date", "param", "value"])


def match_to_stations(long: pd.DataFrame, stations: pd.DataFrame, tol_deg: float = 0.002) -> pd.DataFrame:
    """Attach fmisid by nearest station position and pivot to one row per station-day."""
    if long.empty:
        return pd.DataFrame(columns=COLUMNS)
    pts = long[["lat", "lon"]].drop_duplicates().reset_index(drop=True)
    d = np.hypot(pts.lat.values[:, None] - stations.lat.values[None, :],
                 pts.lon.values[:, None] - stations.lon.values[None, :])
    j = d.argmin(axis=1)
    pts["fmisid"] = np.where(d[np.arange(len(pts)), j] <= tol_deg, stations.fmisid.values[j], -1)
    long = long.merge(pts, on=["lat", "lon"])
    unknown = (long.fmisid == -1).sum()
    if unknown:
        log.warning("%d observations at positions with no known station – dropped", unknown)
    long = long[long.fmisid != -1]
    wide = long.pivot_table(index=["fmisid", "date"], columns="param", values="value",
                            aggfunc="first", dropna=False).reset_index()
    wide = wide.rename(columns=PARAMS)
    for c in PARAMS.values():
        if c not in wide:
            wide[c] = np.nan
    return clean_daily(wide[COLUMNS])


def clean_daily(daily: pd.DataFrame) -> pd.DataFrame:
    daily = daily.copy()
    for c in PARAMS.values():
        daily[c] = pd.to_numeric(daily[c], errors="coerce")
    for c in ("precip_mm", "snow_cm"):                 # FMI: -1 means "none observed"
        daily.loc[daily[c] < 0, c] = 0.0
    for c in ("tmean_c", "tmin_c", "tmax_c"):          # architecture doc §10 quality range
        bad = (daily[c] < TEMP_RANGE_C[0]) | (daily[c] > TEMP_RANGE_C[1])
        daily.loc[bad, c] = np.nan
    daily["fmisid"] = daily["fmisid"].astype(int)
    daily = daily.dropna(subset=list(PARAMS.values()), how="all")   # nothing observed that day (e.g. today)
    return daily.drop_duplicates(["fmisid", "date"]).sort_values(["fmisid", "date"]).reset_index(drop=True)


def month_chunks(start: date, end: date) -> list[tuple[date, date]]:
    out, cur = [], date(start.year, start.month, 1)
    while cur <= end:
        nxt = date(cur.year + (cur.month == 12), cur.month % 12 + 1, 1)
        out.append((max(cur, start), min(nxt - timedelta(days=1), end)))
        cur = nxt
    return out


def _get(params: dict, retries: int = 4) -> bytes:
    base = {"service": "WFS", "version": "2.0.0", "request": "getFeature"}
    for attempt in range(retries):
        try:
            r = requests.get(WFS_URL, params={**base, **params}, timeout=120)
            r.raise_for_status()
            return r.content
        except requests.RequestException as exc:   # FMI returns 5xx under load – back off
            if attempt == retries - 1:
                raise
            log.warning("FMI error (%s), retrying …", exc)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("unreachable")


def search_bbox(area: PilotArea) -> tuple[float, float, float, float]:
    buf_m = float(area.weather["station_search_buffer_km"]) * 1000
    return tuple(gpd.GeoSeries([area.polygon_3067.buffer(buf_m)], crs=METRIC_CRS).to_crs(WGS84).total_bounds)


def fetch_stations(area: PilotArea, cache_dir: Path = CACHE_DIR / "fmi") -> pd.DataFrame:
    cache_dir.mkdir(parents=True, exist_ok=True)
    f = cache_dir / "stations.parquet"
    if f.exists():
        return pd.read_parquet(f)
    w, s, e, n = search_bbox(area)
    st = parse_stations(_get({"storedquery_id": STATIONS_QUERY, "bbox": f"{w:.3f},{s:.3f},{e:.3f},{n:.3f}"}))
    st = st[st.lat.between(s, n) & st.lon.between(w, e)].reset_index(drop=True)
    st.to_parquet(f, index=False)
    return st


def fetch_daily(area: PilotArea, start: date, end: date, cache_dir: Path = CACHE_DIR / "fmi",
                pause_s: float = 1.0, refresh_last_days: int = 10) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Download (or read cached) daily observations for every station near the pilot area."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    stations = fetch_stations(area, cache_dir)
    w, s, e, n = search_bbox(area)
    frames = []
    fresh_after = date.today() - timedelta(days=refresh_last_days)
    for a, b in month_chunks(start, end):
        f_daily = cache_dir / f"daily_{a:%Y%m}.parquet"
        if f_daily.exists() and b < fresh_after:
            frames.append(pd.read_parquet(f_daily))
            continue
        log.info("FMI daily %s → %s", a, b)
        xml = _get({
            "storedquery_id": DAILY_QUERY,
            "bbox": f"{w:.3f},{s:.3f},{e:.3f},{n:.3f}",
            "starttime": f"{a.isoformat()}T00:00:00Z",
            "endtime": f"{b.isoformat()}T00:00:00Z",
            "parameters": ",".join(PARAMS),
        })
        daily = match_to_stations(parse_daily_simple(xml), stations)
        daily.to_parquet(f_daily, index=False)
        frames.append(daily)
        time.sleep(pause_s)
    daily = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=COLUMNS)
    daily = daily[(pd.to_datetime(daily.date) >= pd.Timestamp(start)) &
                  (pd.to_datetime(daily.date) <= pd.Timestamp(end))]
    return stations, clean_daily(daily)


def stations_gdf(stations: pd.DataFrame) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(stations, geometry=gpd.points_from_xy(stations.lon, stations.lat), crs=WGS84)
