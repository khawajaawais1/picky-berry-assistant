from datetime import date

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import Point

from picky_data.weather.assign import idw_weights, zone_weather
from picky_data.weather.fmi import (
    match_to_stations,
    month_chunks,
    parse_daily_simple,
    parse_stations,
)
from picky_data.weather.gdd import add_gdd


def _daily(temps, start="2025-03-29", fmisid=1):
    dates = pd.date_range(start, periods=len(temps), freq="D").date
    return pd.DataFrame({"fmisid": fmisid, "date": dates, "tmean_c": temps,
                         "tmin_c": np.nan, "tmax_c": np.nan, "precip_mm": 0.0, "snow_cm": 0.0})


def test_gdd_starts_on_april_first():
    g = add_gdd(_daily([10, 10, 10, 10, 10]))           # 29 Mar … 2 Apr
    assert list(g.gdd_since_apr1) == [0, 0, 0, 5, 10]


def test_gdd_ignores_cold_days_and_is_monotonic():
    g = add_gdd(_daily([8, 3, -2, 12, 5.5], start="2025-05-01"))
    assert list(g.gdd_day) == [3, 0, 0, 7, 0.5]
    assert g.gdd_since_apr1.is_monotonic_increasing


def test_gdd_interpolates_short_gaps_only():
    d = _daily([10, np.nan, np.nan, 10], start="2025-06-01")
    g = add_gdd(d)
    assert g.gdd_day.tolist() == [5, 5, 5, 5]
    long = _daily([10] + [np.nan] * 5 + [10], start="2025-06-01")
    g2 = add_gdd(long)
    assert g2.gdd_day.isna().sum() == 5
    assert g2.gdd_since_apr1.is_monotonic_increasing


def test_gdd_resets_each_year():
    d = pd.concat([_daily([10] * 3, "2024-09-01"), _daily([10] * 3, "2025-04-01")])
    g = add_gdd(d)
    assert g[g.date == date(2025, 4, 1)].gdd_since_apr1.iloc[0] == 5


def test_month_chunks():
    ch = month_chunks(date(2025, 1, 15), date(2025, 3, 2))
    assert ch == [(date(2025, 1, 15), date(2025, 1, 31)), (date(2025, 2, 1), date(2025, 2, 28)),
                  (date(2025, 3, 1), date(2025, 3, 2))]


STATIONS_XML = """<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0"
 xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:ef="http://inspire.ec.europa.eu/schemas/ef/4.0">
 <wfs:member><ef:EnvironmentalMonitoringFacility gml:id="s1">
  <gml:identifier codeSpace="http://xml.fmi.fi/namespace/stationcode/fmisid">101339</gml:identifier>
  <gml:name codeSpace="http://xml.fmi.fi/namespace/locationcode/name">Jyväskylä lentoasema</gml:name>
  <gml:name codeSpace="http://xml.fmi.fi/namespace/locationcode/wmo">2935</gml:name>
  <ef:representativePoint><gml:Point gml:id="p1"><gml:pos>62.39758 25.67087</gml:pos></gml:Point></ef:representativePoint>
 </ef:EnvironmentalMonitoringFacility></wfs:member>
</wfs:FeatureCollection>"""


def _bs(lat, lon, t, p, v):
    return f"""<wfs:member><BsWfs:BsWfsElement gml:id="x"><BsWfs:Location><gml:Point gml:id="y">
      <gml:pos>{lat} {lon} </gml:pos></gml:Point></BsWfs:Location><BsWfs:Time>{t}</BsWfs:Time>
      <BsWfs:ParameterName>{p}</BsWfs:ParameterName><BsWfs:ParameterValue>{v}</BsWfs:ParameterValue>
      </BsWfs:BsWfsElement></wfs:member>"""


def test_parse_fmi_wfs():
    st = parse_stations(STATIONS_XML)
    assert st.to_dict("records") == [{"fmisid": 101339, "name": "Jyväskylä lentoasema",
                                      "lat": 62.39758, "lon": 25.67087}]
    members = "".join([
        _bs(62.39758, 25.67087, "2025-07-01T00:00:00Z", "tday", "15.2"),
        _bs(62.39758, 25.67087, "2025-07-01T00:00:00Z", "rrday", "-1.0"),
        _bs(62.39758, 25.67087, "2025-07-02T00:00:00Z", "tday", "NaN"),
        _bs(62.39758, 25.67087, "2025-07-02T00:00:00Z", "rrday", "3.4"),
        _bs(60.0, 24.0, "2025-07-01T00:00:00Z", "tday", "18.0"),          # unknown station
    ])
    xml = ('<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" '
           'xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:BsWfs="http://xml.fmi.fi/schema/wfs/2.0">'
           + members + "</wfs:FeatureCollection>")
    daily = match_to_stations(parse_daily_simple(xml), st)
    assert daily.fmisid.tolist() == [101339, 101339]
    assert daily.precip_mm.tolist() == [0.0, 3.4]
    assert daily.tmean_c.iloc[0] == 15.2 and np.isnan(daily.tmean_c.iloc[1])
    assert daily.tmin_c.isna().all()


def test_idw_weights():
    zones = gpd.GeoDataFrame({"id": ["z1", "z2"]},
                             geometry=[Point(430000, 6905000), Point(450000, 6905000)], crs=3067)
    stations = gpd.GeoDataFrame({"fmisid": [1, 2, 3]},
                                geometry=[Point(431000, 6905000), Point(449000, 6905000),
                                          Point(440000, 6930000)], crs=3067)
    w = idw_weights(zones, stations, k=3)
    assert w.groupby("zone_id").weight.sum().round(4).eq(1).all()
    z1 = w[w.zone_id == "z1"].set_index("fmisid").weight
    assert z1.idxmax() == 1 and z1[1] > 0.9


def test_zone_weather_renormalises_missing_station():
    w = pd.DataFrame({"zone_id": ["z", "z"], "fmisid": [1, 2], "weight": [0.5, 0.5]})
    d = pd.DataFrame({"fmisid": [1, 2], "date": [date(2025, 7, 1)] * 2,
                      "tmean_c": [10.0, np.nan], "precip_mm": [1.0, 3.0], "gdd_since_apr1": [500.0, 520.0]})
    zw = zone_weather(w, d).iloc[0]
    assert zw.tmean_c == pytest.approx(10.0)
    assert zw.precip_mm == pytest.approx(2.0)
    assert zw.gdd_since_apr1 == pytest.approx(510.0)


def test_temperature_quality_range():
    from picky_data.weather.fmi import clean_daily

    d = pd.DataFrame({"fmisid": [1, 1], "date": [date(2025, 7, 1), date(2025, 7, 2)],
                      "tmean_c": [55.0, 18.0], "tmin_c": [-70.0, 10.0], "tmax_c": [20.0, 25.0],
                      "precip_mm": [0.0, 0.0], "snow_cm": [0.0, 0.0]})
    c = clean_daily(d)
    assert np.isnan(c.tmean_c.iloc[0]) and np.isnan(c.tmin_c.iloc[0]) and c.tmean_c.iloc[1] == 18.0


def test_weather_coverage_check():
    from picky_data.checks import check_weather_coverage

    w = pd.DataFrame({"zone_id": ["a", "b", "c", "d", "e"], "fmisid": [1, 1, 1, 1, 2], "weight": [1.0] * 5})
    d = pd.DataFrame({"fmisid": [1, 2], "date": [date(2025, 7, 1)] * 2, "tmean_c": [15.0, np.nan]})
    assert check_weather_coverage(w, d).ok                       # 4/5 = 80 %
    d.loc[0, "tmean_c"] = np.nan
    assert not check_weather_coverage(w, d).ok
