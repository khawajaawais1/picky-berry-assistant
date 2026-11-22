# backend/ — FastAPI reasoning service (feature 6.7)

Python package deployed on Render as `picky-backend`. Owns the OWL-ontology reasoning
pipeline, the daily scoring job, and FCM push delivery. Design: [docs/architecture.md](../docs/architecture.md).
Feature deep dive: [docs/features/6.7-reasoning-push-alerts.md](../docs/features/6.7-reasoning-push-alerts.md).

**Status (2026-11-22): deployed and operational.**
Live at `https://picky-backend-cd0u.onrender.com` — health, alerts, species, context.jsonld
and the reasoning trigger all respond. Daily cron fires at 06:00 Helsinki (produces alerts
July–September; use `?as_of=2026-08-15` to test outside season).

## Running locally

```bash
cd backend
pip install -e "../ml"          # editable — keeps zone_grid.csv path intact
pip install -e ".[job]"         # adds apscheduler, sqlalchemy, psycopg3, firebase-admin
uvicorn app.main:app --reload --port 8001
```

**Environment variables** (copy from repo-root `.env` or set directly):

| Var | Required | Purpose |
|-----|----------|---------|
| `DATABASE_URL` | Yes (for job + alerts) | Supabase Session pooler URI |
| `FIREBASE_CREDENTIAL_JSON` | No (push disabled without it) | Firebase service-account JSON as a string |
| `ONTOLOGY_DIR` | No | Override path to `ontology/` directory |
| `LOG_LEVEL` | No (default `info`) | Root logger level |

## Module layout

```
backend/
  app/
    main.py                     # FastAPI lifespan — loads ontology, ZoneGrid, Firebase, scheduler
    modules/
      reasoning/
        graph.py                # OWL graph loader + add_zone_rows()
        service.py              # Alert dataclass, alerts_from_rule()
        rules.py                # Rule + rulebook loader
        lifespan.py             # load_ontology_into(app)
        router.py               # GET /api/v1/alerts, POST /api/v1/reasoning/run, GET /api/v1/species
        job.py                  # _fetch_zone_rows, _apply_scores, run_one_rule, run_reasoning
        scheduler.py            # make_scheduler() — APScheduler cron at 06:00 Helsinki
      push/
        fcm.py                  # push_alerts(), init_fcm_app(), _fetch_devices_for_species()
        throttle.py             # is_quiet_hours(), user_alert_count_today(), zone_cooldown_active(), log_push()
      ingest/
        README.md               # placeholder
  tests/
    test_app_startup.py         # 8 tests — lifespan, health endpoint
    test_run_reasoning.py       # 9 tests — _apply_scores, run_one_rule, run_reasoning
    test_fcm_push.py            # 7 tests — push_alerts end-to-end
    test_throttle.py            # 16 tests — is_quiet_hours + Layer-6 guards
```

## Running tests

```bash
cd backend
pip install -e ".[dev]"
pytest
```

All 74 tests pass. Tests mock firebase-admin, SQLAlchemy, and throttle DB calls so they
run without psycopg2/firebase-admin installed.

## DB migrations (applied to Supabase 2026-11-22)

| File | What it creates |
|------|-----------------|
| `picky-server/migrations/0007_alerts.sql` | `alert_rules_log`, `alerts` |
| `picky-server/migrations/0008_push_log.sql` | `push_log` |
| `data/sql/001_data_tables.sql` | `zone_features` (and other data tables) |

## Deployment (Render)

Defined in `render.yaml` at the repo root. Build and start commands:
```
pip install -e ../ml && pip install -e ".[job]"
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

`berry-ml` must be installed **editable first** so `paths.py` resolves `zone_grid.csv`
from the source tree; installing it as a wheel loses the `models/` directory.

## Known compatibility notes

- **psycopg3** (`psycopg[binary]>=3.1`) required — Render's Python 3.14 has no psycopg2 wheel.
- **`::uuid` casts** in SQLAlchemy `text()` must be written as `CAST(... AS uuid)` with psycopg3.
