"""Cloud-masked NDVI composites from Copernicus Data Space (Sentinel Hub Process API).

Why Process API + local zonal stats instead of one Statistical API call per zone:
3,500 zones × ~20 windows/season × 6 years would be ~420k requests. Instead we pull the
pilot square as ~9 tiles of ≤ 30 × 30 km (UTM 35N) per dekad (20 m → 1,500 px, under the
2,500 px limit) and average per zone locally. That is ~9 small requests per window.

Setup (Awais): https://dataspace.copernicus.eu → User settings → OAuth clients → put the
id/secret in .env as CDSE_CLIENT_ID / CDSE_CLIENT_SECRET.
"""
from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from pathlib import Path

import numpy as np

from ..config import CACHE_DIR, PilotArea

log = logging.getLogger(__name__)

CDSE_BASE = "https://sh.dataspace.copernicus.eu"
CDSE_TOKEN = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

# Mean NDVI over cloud-free observations in the window. SCL classes masked:
# 0 no data, 1 saturated, 3 cloud shadow, 8/9 cloud medium/high, 10 cirrus, 11 snow.
EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: [{bands: ["B04", "B08", "SCL", "dataMask"]}],
    output: [{id: "default", bands: 2, sampleType: "FLOAT32"}],
    mosaicking: "ORBIT"
  };
}
const BAD = [0, 1, 3, 8, 9, 10, 11];
function evaluatePixel(samples) {
  let sum = 0, n = 0;
  for (const s of samples) {
    if (s.dataMask === 1 && BAD.indexOf(s.SCL) === -1 && (s.B08 + s.B04) > 0) {
      sum += (s.B08 - s.B04) / (s.B08 + s.B04);
      n += 1;
    }
  }
  return [n > 0 ? sum / n : NaN, samples.length > 0 ? n / samples.length : 0];
}
"""


def windows(start: date, end: date) -> list[tuple[date, date]]:
    """Dekads (1–10, 11–20, 21–end of month): identical bins every year, leap years included."""
    out = []
    y, m = start.year, start.month
    while date(y, m, 1) <= end:
        month_end = (date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1)).day
        for a_day, b_day in ((1, 10), (11, 20), (21, month_end)):
            a, b = date(y, m, a_day), date(y, m, b_day)
            if b >= start and a <= end:
                out.append((a, b))
        y, m = y + (m == 12), m % 12 + 1
    return out


TILE_CRS = 32635   # UTM 35N – a native Sentinel-2 grid CRS covering the pilot (24–30 °E)


def tiles_utm(area: PilotArea, size_m: float = 30000) -> list[tuple[float, float, float, float]]:
    """Cover the pilot square (reprojected to UTM 35N) with ≤ 30 km tiles."""
    import geopandas as gpd

    xmin, ymin, xmax, ymax = gpd.GeoSeries([area.polygon_3067], crs=3067).to_crs(TILE_CRS).total_bounds
    xmin, ymin = np.floor([xmin / 100, ymin / 100]) * 100
    xmax, ymax = np.ceil([xmax / 100, ymax / 100]) * 100
    xs = np.arange(xmin, xmax, size_m)
    ys = np.arange(ymin, ymax, size_m)
    return [(x, y, min(x + size_m, xmax), min(y + size_m, ymax)) for x in xs for y in ys]


def _config():
    from sentinelhub import SHConfig

    cid, secret = os.getenv("CDSE_CLIENT_ID"), os.getenv("CDSE_CLIENT_SECRET")
    if not cid or not secret:
        raise RuntimeError("Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in .env (D14 needs a "
                           "Copernicus Data Space OAuth client). Use `picky-data ndvi --stub` meanwhile.")
    cfg = SHConfig()
    cfg.sh_client_id, cfg.sh_client_secret = cid, secret
    cfg.sh_base_url, cfg.sh_token_url = CDSE_BASE, CDSE_TOKEN
    return cfg


def fetch_window(area: PilotArea, a: date, b: date, cache_dir: Path = CACHE_DIR / "ndvi") -> list[Path]:
    """Download NDVI tiles for one window as GeoTIFFs (UTM 35N). Cached by window + tile."""
    import rasterio
    from rasterio.transform import from_bounds
    from sentinelhub import CRS, BBox, DataCollection, MimeType, SentinelHubRequest

    cfg = _config()
    res = float(area.ndvi["resolution_m"])
    s2 = DataCollection.SENTINEL2_L2A.define_from("s2l2a-cdse", service_url=cfg.sh_base_url)
    cache_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, t in enumerate(tiles_utm(area)):
        path = cache_dir / f"ndvi_{a:%Y%m%d}_t{i}.tif"
        paths.append(path)
        if path.exists():
            continue
        w, h = round((t[2] - t[0]) / res), round((t[3] - t[1]) / res)
        req = SentinelHubRequest(
            evalscript=EVALSCRIPT,
            input_data=[SentinelHubRequest.input_data(
                data_collection=s2, time_interval=(a.isoformat(), b.isoformat()),
                maxcc=float(area.ndvi["max_cloud_cover"]) / 100)],
            responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
            bbox=BBox(t, crs=CRS.UTM_35N), size=(w, h), config=cfg,
        )
        arr = req.get_data()[0].astype("float32")              # (h, w, 2)
        with rasterio.open(path, "w", driver="GTiff", width=w, height=h, count=2, dtype="float32",
                           crs=f"EPSG:{TILE_CRS}", transform=from_bounds(*t, w, h), nodata=np.nan,
                           compress="deflate") as dst:
            dst.write(np.moveaxis(arr, -1, 0))
        log.info("NDVI %s tile %d → %s", a, i, path.name)
    return paths
