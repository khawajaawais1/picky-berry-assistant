# ingest module (owner: Awais) — features 6.2, 6.6

Thin wrapper over the `picky-data` package in `../../../../data` (ADR 0004). This module only
owns scheduling and bookkeeping; the pipeline logic, tests and CLI live in `data/`.

| Job (architecture doc §5) | Schedule | Calls |
|---------------------------|----------|-------|
| `ingest_weather` | daily 05:30 | `picky_data.weather.fmi.fetch_daily` → `gdd.add_gdd` → `db.load_all` |
| `ingest_ndvi` | daily 06:00 | `picky_data.ndvi.copernicus.fetch_window` → `ndvi.zonal` → `db.load_all` |

Every run writes a row to `ingest_runs` (source, started_at, status, rows, error). A failed run
keeps yesterday's data and reports to Sentry.

Install in the backend image: `pip install ./data` (core) — the worker also needs
`pip install "./data[ndvi]"`. Until Hassan's job runner exists (D15), run the CLI by hand:
`picky-data weather --start <today-14d> && picky-data load`.
