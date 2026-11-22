"""Assemble zone_features: the ML input table (weather + NDVI + zone statics) per zone × date.

The predict_yield job reads zone_features for today's date, extracts (zone_id, lat, lon) and
passes them to ZoneGrid.score_points(), then writes results into zone_scores /
zone_scores_current.  Future XGBoost models will additionally consume gdd_since_apr1,
tmean_7d, precip_7d and ndvi_anomaly directly.

Usage:
    from picky_data.features import build_zone_features
    df = build_zone_features(eng)              # today (Helsinki time)
    df = build_zone_features(eng, as_of=date(2026, 7, 15))
"""
from __future__ import annotations

import datetime as dt
import logging
from zoneinfo import ZoneInfo

import pandas as pd

log = logging.getLogger(__name__)

HELSINKI = ZoneInfo("Europe/Helsinki")

# Columns the predict_yield job expects to find in every row.
REQUIRED_COLS = ("zone_id", "as_of", "lat", "lon", "forest_fraction", "mire_fraction",
                 "fertility_class", "gdd_since_apr1", "tmean_7d", "precip_7d",
                 "ndvi_anomaly", "ndvi_mean")


def build_zone_features(eng, as_of: dt.date | None = None) -> pd.DataFrame:
    """Return one row per zone for *as_of* (default: today Helsinki).

    Joins zones × weather_daily × ndvi_zone_latest.  Rows without weather still appear
    (gdd/tmean_7d/precip_7d are NULL); ndvi_anomaly defaults to 0.0 when no observation.
    """
    from sqlalchemy import text

    if as_of is None:
        as_of = dt.datetime.now(HELSINKI).date()

    sql = text("""
        SELECT
            z.id::text                            AS zone_id,
            :as_of::date                          AS as_of,
            ST_Y(z.centroid::geometry)::real      AS lat,
            ST_X(z.centroid::geometry)::real      AS lon,
            z.forest_fraction,
            z.mire_fraction,
            z.fertility_class,
            wd.gdd_since_apr1,
            w7.tmean_7d,
            w7.precip_7d,
            COALESCE(n.ndvi_anomaly, 0.0)::real   AS ndvi_anomaly,
            n.ndvi_mean
        FROM zones z
        LEFT JOIN weather_daily wd
            ON wd.zone_id = z.id
            AND wd.date = :as_of::date
        LEFT JOIN LATERAL (
            SELECT
                AVG(d.tmean_c)::real    AS tmean_7d,
                SUM(d.precip_mm)::real  AS precip_7d
            FROM weather_daily d
            WHERE d.zone_id = z.id
              AND d.date BETWEEN :as_of::date - INTERVAL '6 days'
                             AND :as_of::date
        ) w7 ON true
        LEFT JOIN ndvi_zone_latest n ON n.zone_id = z.id
    """)

    with eng.connect() as conn:
        df = pd.read_sql(sql, conn, params={"as_of": str(as_of)})

    log.info(
        "zone_features: %d zones for %s  (weather: %d  NDVI: %d)",
        len(df), as_of,
        int(df["gdd_since_apr1"].notna().sum()),
        int(df["ndvi_mean"].notna().sum()),
    )
    return df
