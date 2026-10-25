# backend/ — FastAPI modular monolith (owner: Hassan)

One Python package, one Docker image, ten modules. Each module owns its tables and exposes a
`service.py`; other modules call that service, never its tables. Design: architecture doc §5,
summary in [../docs/architecture.md](../docs/architecture.md).

**Status (2026-10-24): nothing here runs yet.** The folder holds this README and
`app/modules/ingest/README.md`; there is no `main.py`, module package, Alembic migration, test or
Python dependency file, and [../docs/architecture.md](../docs/architecture.md) is the status of
record for each module.

## Planned layout (architecture doc §5)

```
backend/
  app/
    main.py            # FastAPI app, routers, middleware
    core/              # config, db session, security, logging, errors (RFC 9457)
    modules/
      accounts/        # 6.1, 6.9   router.py, service.py, models.py, schemas.py
      zones/           # 6.2
      visits/          # 6.3
      feedback/        # 6.4
      trust/           # 6.5
      prediction/      # 6.2, 6.6   (Remon)
      reasoning/       # 6.7        (Asmer)
      analytics/       # 6.8
      ingest/          # 6.2, 6.6   (Awais) – thin wrapper over ../data (ADR 0004)
      media/           # 6.4        (Sabih)
    jobs/              # APScheduler + Postgres job queue worker
  ml/                  # inference wrappers (YOLO ONNX, XGBoost)
  ontology/            # mirrors /ontology (Turtle + SPARQL rules)
  migrations/          # Alembic
  tests/
```

## Data tables from `data/`
`../data/sql/001_data_tables.sql` is the reference DDL for zones, zone_species, weather and
NDVI (plus `ingest_runs`). Port it into Alembic migrations with identical names; contract in
[../docs/data-contract.md](../docs/data-contract.md).

Week 1 deliverables: FastAPI skeleton + Alembic + `/health` (D5), OpenAPI YAML for the zone
endpoints (D7). By 3 Nov: schema + login + `POST /visits` locally.
