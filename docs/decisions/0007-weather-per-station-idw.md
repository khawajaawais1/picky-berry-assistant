# ADR 0007 – Store weather per station; per-zone weather is a view (IDW)

* **Status:** accepted · **Date:** 2026-10-22 · **Deciders:** Awais (Remon, Hassan to confirm) · **Feature(s):** 6.2, 6.6

## Context
The architecture doc sketches `weather_daily` as a zone × day table. With ~5k zones × 6 years
× 365 days that is ~10 M rows of mostly duplicated numbers (zones share 3 stations).

## Decision
Tables `weather_stations`, `weather_station_daily` (with GDD) and `zone_weather_weights`
(inverse-distance, 3 nearest stations); `weather_daily` is a **view** with
(zone_id, date, tmean_c, precip_mm, gdd_since_apr1). Forecast rows (`is_forecast`) are added
in sprint 2.

## Consequences
~10k station-day rows per year instead of ~1.8 M zone-day rows. Readers use the view and do
not care. If a query gets slow, materialise the view for the current season only.
