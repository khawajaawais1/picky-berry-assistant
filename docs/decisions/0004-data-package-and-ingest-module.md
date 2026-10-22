# ADR 0004 – Pipelines live in `data/` as a library; `backend/…/ingest` is a thin wrapper

* **Status:** accepted · **Date:** 2026-10-22 · **Deciders:** Awais (Hassan to confirm) · **Feature(s):** 6.2, 6.6

## Context
The architecture doc puts pipelines in `backend/app/modules/ingest/`. Zone building, the
2021–2026 backfill and the basemap are one-off/offline jobs with heavy geo dependencies
(geopandas, rasterio) that should not bloat the API image or block Hassan's skeleton.

## Decision
`data/` is an installable package (`picky-data`, CLI + library). The backend `ingest`
module imports it for the daily jobs (`ingest_weather`, `ingest_ndvi`) and owns only the
scheduling and `ingest_runs` bookkeeping. One-off work (zones, backfills, PMTiles) runs from
the CLI.

## Consequences
Data work is testable and runnable without the backend. The API image installs
`picky-data` without the heavy extras; only the worker needs `[ndvi]`.
