"""Load pipeline outputs into Postgres/PostGIS (upserts; safe to re-run).

Needs the db extra: pip install -e ".[db]"  and DATABASE_URL in .env.
Applies data/sql/001_data_tables.sql first (idempotent CREATE … IF NOT EXISTS).
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

import geopandas as gpd
import pandas as pd

from .config import DATA_DIR, load_env, load_yaml

log = logging.getLogger(__name__)


def engine():
    from sqlalchemy import create_engine

    load_env()
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set (copy .env.example to .env)")
    return create_engine(url, future=True)


def _has_h3(conn) -> bool:
    from sqlalchemy import text

    return conn.execute(text("SELECT to_regtype('h3index') IS NOT NULL")).scalar()


def apply_ddl(eng) -> None:
    from sqlalchemy import text

    ddl = (DATA_DIR / "sql" / "001_data_tables.sql").read_text(encoding="utf-8")
    with eng.begin() as conn:
        if not _has_h3(conn):
            log.warning("h3-pg not installed – storing H3 ids as text (D4 stub)")
            ddl = ddl.replace("h3index", "text")
        conn.exec_driver_sql(ddl)
        conn.execute(text("SELECT 1"))


def load_species(eng) -> int:
    from sqlalchemy import text

    rows = load_yaml("species.yaml")["species"]
    with eng.begin() as conn:
        for r in rows:
            conn.execute(text("""
                INSERT INTO species (code, latin, name_fi, name_en, iri)
                VALUES (:code, :latin, :name_fi, :name_en, :iri)
                ON CONFLICT (code) DO UPDATE SET latin = EXCLUDED.latin, name_fi = EXCLUDED.name_fi,
                  name_en = EXCLUDED.name_en, iri = EXCLUDED.iri"""), r)
    return len(rows)


def load_zones(eng, zones: gpd.GeoDataFrame) -> int:
    from sqlalchemy import text

    stg = zones.copy()
    stg["fertility_class"] = stg["fertility_class"].astype("float")
    stg.rename_geometry("geom").to_postgis("_stg_zones", eng, if_exists="replace", index=False)
    with eng.begin() as conn:
        h3t = "h3index" if _has_h3(conn) else "text"
        conn.execute(text(f"""
            INSERT INTO zones (id, h3, h3_parent6, name, forest_type, forest_fraction, mire_fraction,
                               habitat, fertility_class, area_km2, centroid, geom, source_version, built_at)
            SELECT id::uuid, h3::{h3t}, h3_parent6::{h3t}, name, forest_type, forest_fraction,
                   mire_fraction, habitat::jsonb, fertility_class::smallint, area_km2,
                   ST_SetSRID(ST_MakePoint(centroid_lon, centroid_lat), 4326),
                   ST_SetSRID(geom, 4326)::geometry(Polygon, 4326), source_version, now()
            FROM _stg_zones
            ON CONFLICT (h3) DO UPDATE SET
              name = EXCLUDED.name, forest_type = EXCLUDED.forest_type,
              forest_fraction = EXCLUDED.forest_fraction, mire_fraction = EXCLUDED.mire_fraction,
              habitat = EXCLUDED.habitat, fertility_class = EXCLUDED.fertility_class,
              area_km2 = EXCLUDED.area_km2, geom = EXCLUDED.geom, centroid = EXCLUDED.centroid,
              source_version = EXCLUDED.source_version, built_at = now();
            DROP TABLE _stg_zones;"""))
    return len(zones)


def _upsert_df(eng, df: pd.DataFrame, table: str, keys: list[str]) -> int:
    from sqlalchemy import text

    if df.empty:
        return 0
    stg = f"_stg_{table}"
    df.to_sql(stg, eng, if_exists="replace", index=False)
    cols = list(df.columns)
    upd = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols if c not in keys) or None
    casts = {"zone_id": "::uuid", "date": "::date", "period_start": "::date", "period_end": "::date"}
    sel = ", ".join(f"{c}{casts.get(c, '')}" for c in cols)
    conflict = f"DO UPDATE SET {upd}" if upd else "DO NOTHING"
    with eng.begin() as conn:
        conn.execute(text(f"INSERT INTO {table} ({', '.join(cols)}) SELECT {sel} FROM {stg} "
                          f"ON CONFLICT ({', '.join(keys)}) {conflict}; DROP TABLE {stg};"))
    return len(df)


def load_stations(eng, stations: pd.DataFrame) -> int:
    from sqlalchemy import text

    with eng.begin() as conn:
        for r in stations.itertuples():
            conn.execute(text("""
                INSERT INTO weather_stations (fmisid, name, geom)
                VALUES (:f, :n, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
                ON CONFLICT (fmisid) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom"""),
                {"f": int(r.fmisid), "n": r.name, "lon": float(r.lon), "lat": float(r.lat)})
    return len(stations)


def record_run(eng, source: str, status: str, rows: int | None = None, error: str | None = None,
               details: dict | None = None) -> None:
    """One row in ingest_runs per loaded source (the backend's job runner reads these)."""
    import json as _json

    from sqlalchemy import text

    with eng.begin() as conn:
        conn.execute(text("""
            INSERT INTO ingest_runs (source, finished_at, status, rows, error, details)
            VALUES (:s, now(), :st, :r, :e, CAST(:d AS jsonb))"""),
            {"s": source, "st": status, "r": rows, "e": error, "d": _json.dumps(details or {})})


def load_all(out_dir: Path) -> dict[str, int]:
    """Load whatever outputs exist in data/out/ in dependency order; log each in ingest_runs."""
    eng = engine()
    apply_ddl(eng)
    counts = _load_all(eng, out_dir)
    for source, n in counts.items():
        record_run(eng, source, "ok", n)
    return counts


def _load_all(eng, out_dir: Path) -> dict[str, int]:
    counts = {"species": load_species(eng)}
    if (out_dir / "zones.parquet").exists():
        counts["zones"] = load_zones(eng, gpd.read_parquet(out_dir / "zones.parquet"))
    if (out_dir / "zone_species.parquet").exists():
        counts["zone_species"] = _upsert_df(eng, pd.read_parquet(out_dir / "zone_species.parquet"),
                                            "zone_species", ["zone_id", "species"])
    if (out_dir / "weather_stations.parquet").exists():
        counts["weather_stations"] = load_stations(eng, pd.read_parquet(out_dir / "weather_stations.parquet"))
    if (out_dir / "weather_station_daily.parquet").exists():
        d = pd.read_parquet(out_dir / "weather_station_daily.parquet")
        cols = ["fmisid", "date", "tmean_c", "tmin_c", "tmax_c", "precip_mm", "snow_cm",
                "gdd_day", "gdd_since_apr1"]
        counts["weather_station_daily"] = _upsert_df(eng, d[cols], "weather_station_daily", ["fmisid", "date"])
    if (out_dir / "zone_weather_weights.parquet").exists():
        counts["zone_weather_weights"] = _upsert_df(
            eng, pd.read_parquet(out_dir / "zone_weather_weights.parquet"),
            "zone_weather_weights", ["zone_id", "fmisid"])
    if (out_dir / "ndvi_obs.parquet").exists():
        n = pd.read_parquet(out_dir / "ndvi_obs.parquet")
        cols = ["zone_id", "period_start", "period_end", "ndvi_mean", "valid_fraction",
                "ndvi_baseline", "ndvi_anomaly"]
        counts["ndvi_obs"] = _upsert_df(eng, n[cols], "ndvi_obs", ["zone_id", "period_start"])
    return counts


def run_sql_checks() -> list[tuple[str, int]]:
    """Run each statement in sql/900_data_checks.sql; return (check, failing_rows)."""
    from sqlalchemy import text

    sql = (DATA_DIR / "sql" / "900_data_checks.sql").read_text(encoding="utf-8")
    results, label = [], None
    eng = engine()
    with eng.connect() as conn:
        for chunk in sql.split(";"):
            lines = [ln for ln in chunk.strip().splitlines()]
            label = next((ln[3:].strip() for ln in lines if ln.startswith("-- C")), label)
            body = "\n".join(ln for ln in lines if not ln.lstrip().startswith("--")).strip()
            if not body:
                continue
            n = len(conn.execute(text(body)).fetchall())
            results.append((label or body[:40], n))
    return results
