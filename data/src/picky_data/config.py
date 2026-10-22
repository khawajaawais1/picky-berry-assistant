"""Config loading. All paths are resolved relative to the data/ folder."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Any

import yaml
from shapely.geometry import box
from shapely.geometry.base import BaseGeometry

DATA_DIR = Path(__file__).resolve().parents[2]          # .../data
CONFIG_DIR = DATA_DIR / "config"
RAW_DIR = DATA_DIR / "raw"        # downloads (git-ignored)
OUT_DIR = DATA_DIR / "out"        # pipeline outputs (git-ignored)
CACHE_DIR = DATA_DIR / "cache"

METRIC_CRS = "EPSG:3067"          # ETRS-TM35FIN: metres, the Finnish national grid
WGS84 = "EPSG:4326"


def load_yaml(name: str) -> dict[str, Any]:
    with open(CONFIG_DIR / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_env() -> None:
    """Load the repo-root .env (if python-dotenv is installed and the file exists)."""
    try:
        from dotenv import load_dotenv
    except ImportError:  # pragma: no cover
        return
    load_dotenv(DATA_DIR.parent / ".env")
    load_dotenv(DATA_DIR / ".env")


@dataclass(frozen=True)
class PilotArea:
    name: str
    bbox_3067: tuple[float, float, float, float]
    bbox_wgs84: tuple[float, float, float, float]
    raw: dict[str, Any] = field(repr=False, compare=False)

    @classmethod
    def load(cls, path: str | os.PathLike | None = None) -> PilotArea:
        if path:
            with open(path, encoding="utf-8") as f:
                cfg = yaml.safe_load(f)
        else:
            cfg = load_yaml("pilot_area.yaml")
        return cls(
            name=cfg["name"],
            bbox_3067=tuple(float(v) for v in cfg["bbox_3067"]),
            bbox_wgs84=tuple(float(v) for v in cfg["bbox_wgs84"]),
            raw=cfg,
        )

    @cached_property
    def polygon_3067(self) -> BaseGeometry:
        return box(*self.bbox_3067)

    @cached_property
    def polygon_wgs84(self) -> BaseGeometry:
        """The exact square, reprojected (slightly rotated in lon/lat)."""
        import geopandas as gpd

        return gpd.GeoSeries([self.polygon_3067], crs=METRIC_CRS).to_crs(WGS84).iloc[0]

    @property
    def zones(self) -> dict[str, Any]:
        return self.raw["zones"]

    @property
    def weather(self) -> dict[str, Any]:
        return self.raw["weather"]

    @property
    def ndvi(self) -> dict[str, Any]:
        return self.raw["ndvi"]

    @property
    def basemap(self) -> dict[str, Any]:
        return self.raw["basemap"]


def ensure_dirs() -> None:
    for d in (RAW_DIR, OUT_DIR, CACHE_DIR):
        d.mkdir(parents=True, exist_ok=True)
