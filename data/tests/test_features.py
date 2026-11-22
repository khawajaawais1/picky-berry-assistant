"""Tests for picky_data.features.build_zone_features.

No live Postgres needed: we mock the SQLAlchemy engine so the query result is a
controlled DataFrame, then verify the assembler returns the right schema and that
the COALESCE/NULL rules (missing weather → NULL, missing NDVI → 0.0) are upheld.
"""
from __future__ import annotations

import datetime as dt
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from picky_data.features import REQUIRED_COLS, build_zone_features

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _base_row(**overrides) -> dict:
    row = {
        "zone_id": "uuid-1",
        "as_of": dt.date(2026, 7, 15),
        "lat": 62.25,
        "lon": 25.73,
        "forest_fraction": 0.65,
        "mire_fraction": 0.10,
        "fertility_class": 3,
        "gdd_since_apr1": 420.5,
        "tmean_7d": 18.2,
        "precip_7d": 12.0,
        "ndvi_anomaly": 0.05,
        "ndvi_mean": 0.72,
    }
    row.update(overrides)
    return row


# ---------------------------------------------------------------------------
# schema
# ---------------------------------------------------------------------------

def test_all_required_columns_present():
    rows = [_base_row()]
    with patch("picky_data.features.pd.read_sql", return_value=pd.DataFrame(rows)):
        df = build_zone_features(MagicMock(), as_of=dt.date(2026, 7, 15))
    for col in REQUIRED_COLS:
        assert col in df.columns, f"missing column: {col}"


def test_returns_dataframe():
    with patch("picky_data.features.pd.read_sql", return_value=pd.DataFrame([_base_row()])):
        result = build_zone_features(MagicMock(), as_of=dt.date(2026, 7, 15))
    assert isinstance(result, pd.DataFrame)
    assert len(result) == 1


# ---------------------------------------------------------------------------
# missing weather → NULL propagates through (not silently zeroed)
# ---------------------------------------------------------------------------

def test_missing_weather_stays_null():
    row = _base_row(gdd_since_apr1=None, tmean_7d=None, precip_7d=None)
    with patch("picky_data.features.pd.read_sql", return_value=pd.DataFrame([row])):
        df = build_zone_features(MagicMock(), as_of=dt.date(2026, 7, 15))
    assert pd.isna(df.loc[0, "gdd_since_apr1"])
    assert pd.isna(df.loc[0, "tmean_7d"])
    assert pd.isna(df.loc[0, "precip_7d"])


# ---------------------------------------------------------------------------
# missing NDVI → assembler uses 0.0 (the SQL COALESCE; simulate it in the mock)
# ---------------------------------------------------------------------------

def test_missing_ndvi_coalesces_to_zero():
    # The SQL does COALESCE(n.ndvi_anomaly, 0.0); simulate by returning 0.0 from mock
    row = _base_row(ndvi_anomaly=0.0, ndvi_mean=None)
    with patch("picky_data.features.pd.read_sql", return_value=pd.DataFrame([row])):
        df = build_zone_features(MagicMock(), as_of=dt.date(2026, 7, 15))
    assert df.loc[0, "ndvi_anomaly"] == pytest.approx(0.0)
    assert pd.isna(df.loc[0, "ndvi_mean"])


# ---------------------------------------------------------------------------
# default date falls back to today Helsinki (smoke test — no assertion on exact date)
# ---------------------------------------------------------------------------

def test_default_date_is_today_helsinki():
    captured = {}

    def capture_read_sql(sql, conn, params=None):
        captured["as_of"] = params.get("as_of") if params else None
        return pd.DataFrame([_base_row()])

    with patch("picky_data.features.pd.read_sql", side_effect=capture_read_sql):
        build_zone_features(MagicMock())

    today = dt.datetime.now(dt.UTC).date()  # loose check
    assert captured["as_of"] is not None
    # the returned date string must be a valid ISO date close to today
    parsed = dt.date.fromisoformat(captured["as_of"])
    assert abs((parsed - today).days) <= 1


# ---------------------------------------------------------------------------
# multiple zones
# ---------------------------------------------------------------------------

def test_multiple_zones_one_row_each():
    rows = [
        _base_row(zone_id="uuid-1", lat=62.25, lon=25.73),
        _base_row(zone_id="uuid-2", lat=62.30, lon=25.80, gdd_since_apr1=None),
        _base_row(zone_id="uuid-3", lat=62.35, lon=25.90, ndvi_anomaly=0.0, ndvi_mean=None),
    ]
    with patch("picky_data.features.pd.read_sql", return_value=pd.DataFrame(rows)):
        df = build_zone_features(MagicMock(), as_of=dt.date(2026, 7, 15))
    assert len(df) == 3
    assert df["zone_id"].tolist() == ["uuid-1", "uuid-2", "uuid-3"]
