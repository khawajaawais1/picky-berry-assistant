"""File-level data checks on data/out/ (no database needed). DB checks: sql/900_data_checks.sql."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import geopandas as gpd
import pandas as pd
import shapely

from .config import METRIC_CRS, PilotArea


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""

    def __str__(self) -> str:
        return f"[{'PASS' if self.ok else 'FAIL'}] {self.name}{(' – ' + self.detail) if self.detail else ''}"


def check_zones(zones: gpd.GeoDataFrame, area: PilotArea) -> list[Check]:
    out = []
    dup = zones["h3"].duplicated().sum()
    out.append(Check("C1 H3 ids unique", dup == 0, f"{dup} duplicates" if dup else f"{len(zones)} zones"))
    out.append(Check("C1b zone ids unique", zones["id"].is_unique))
    cent = zones.to_crs(METRIC_CRS).geometry.centroid
    outside = (~cent.within(area.polygon_3067.buffer(1000))).sum()
    out.append(Check("C2 no zone outside pilot bbox", outside == 0, f"{outside} outside" if outside else ""))
    invalid = (~shapely.is_valid(zones.geometry.values) | zones.geometry.is_empty).sum()
    out.append(Check("C3 geometries valid", invalid == 0, f"{invalid} invalid" if invalid else ""))
    lo, hi = area.zones["expected_count"]
    out.append(Check("C9 zone count in expected range", lo <= len(zones) <= hi,
                     f"{len(zones)} (expected {lo}–{hi})"))
    frac_bad = ((zones.forest_fraction + zones.mire_fraction) < area.zones["min_forest_fraction"] - 1e-6).sum()
    out.append(Check("C10 forest+mire ≥ threshold", frac_bad == 0))
    hab_ok = zones["habitat"].map(lambda h: sum(json.loads(h).values()) > 0).all()
    out.append(Check("C11 habitat JSON non-empty", bool(hab_ok)))
    return out


def check_zone_species(zs: pd.DataFrame, zones: gpd.GeoDataFrame) -> list[Check]:
    missing = set(zones["id"]) - set(zs["zone_id"])
    orphans = set(zs["zone_id"]) - set(zones["id"])
    rng = zs["suitability"].between(0, 1).all()
    return [
        Check("C4 every zone has ≥ 1 suitable species", not missing, f"{len(missing)} zones without species" if missing else
              f"{len(zs)} rows, {zs.groupby('species').size().to_dict()}"),
        Check("C4b no orphan zone_species rows", not orphans),
        Check("C4c suitability within 0–1", bool(rng)),
    ]


def check_weather(weights: pd.DataFrame, daily: pd.DataFrame, zones: gpd.GeoDataFrame) -> list[Check]:
    sums = weights.groupby("zone_id")["weight"].sum()
    bad = (sums.sub(1).abs() > 1e-3).sum()
    missing = set(zones["id"]) - set(weights["zone_id"])
    d = daily.sort_values(["fmisid", "date"]).copy()
    d["year"] = pd.to_datetime(d["date"]).dt.year
    dec = (d.groupby(["fmisid", "year"])["gdd_since_apr1"].diff() < -1e-6).sum()
    latest = pd.to_datetime(d["date"]).max() if len(d) else None
    return [
        Check("C5 IDW weights sum to 1", bad == 0, f"{bad} zones off" if bad else ""),
        Check("C6 every zone has weather weights", not missing, f"{len(missing)} missing" if missing else ""),
        Check("C7 GDD never decreases within a season", dec == 0, f"{dec} decreases" if dec else ""),
        Check("C12 weather freshness", latest is not None,
              f"latest day {latest.date() if latest is not None else '–'}"),
    ]


def run_file_checks(out_dir: Path, area: PilotArea) -> list[Check]:
    results: list[Check] = []
    zp = out_dir / "zones.parquet"
    if not zp.exists():
        return [Check("zones.parquet exists", False, "run `picky-data zones` first")]
    zones = gpd.read_parquet(zp)
    results += check_zones(zones, area)
    if (out_dir / "zone_species.parquet").exists():
        results += check_zone_species(pd.read_parquet(out_dir / "zone_species.parquet"), zones)
    if (out_dir / "zone_weather_weights.parquet").exists():
        results += check_weather(pd.read_parquet(out_dir / "zone_weather_weights.parquet"),
                                 pd.read_parquet(out_dir / "weather_station_daily.parquet"), zones)
    return results
