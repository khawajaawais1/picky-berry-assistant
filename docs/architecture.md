# Architecture summary

Condensed from the **MVP Architecture & Tech Stack** doc
(https://claude.ai/artifact/EnkBHuaL7DENBFutQMPEqw) — read that for the full design.
Changes to it are recorded as ADRs in [decisions/](decisions/).

## Principles
1. **Modular monolith** — one deployable, split into modules that own their tables and expose a `service.py`. Extract later only if real load demands it.
2. **Postgres does the heavy lifting** — spatial queries, job queue (`SKIP LOCKED`), analytics views, model registry. One database, one backup.
3. **Offline-first app** — local SQLite cache + outbox; every write carries a client UUID (idempotency key).
4. **Explainable by design** — every score and alert stores its inputs and the rule that fired.
5. **Contract-first API** — FastAPI → OpenAPI → generated TypeScript client.
6. **Simplest and cheapest** — one EU VM, one backend image, free tiers, ≈ €485/yr.

## Components

| Layer | Choice | Owner |
|-------|--------|-------|
| Mobile | React Native + Expo (TypeScript, EAS dev builds), MapLibre RN + PMTiles, expo-location + task-manager (geofences), TanStack Query + Zustand, expo-sqlite + Drizzle, react-hook-form + zod, FCM, i18next | Salman |
| API | FastAPI + Pydantic v2, SQLAlchemy 2 async + GeoAlchemy2 + Alembic, JWT (15 min) + rotating refresh (30 d), Argon2 | Hassan |
| Jobs | APScheduler + Postgres `jobs` table (no Redis/Celery) | Hassan |
| Database | PostgreSQL 17 + PostGIS 3.5 + h3-pg | Hassan (schema), Sabih (ops) |
| Knowledge graph | rdflib + OWL (Turtle) + SPARQL rules (`.rq`), JSON-LD `@context` | Asmer |
| ML | YOLO11n on WildBe → ONNX + onnxruntime (CPU); XGBoost quantile regression | Remon |
| Data | Python pipelines in `data/` (FMI WFS, Sentinel-2, geopandas, h3, PMTiles) | Awais |
| Media | S3-compatible bucket (MinIO in dev), presigned URLs | Sabih |
| Deploy | docker compose (api, db, Caddy) on one EU VM; GitHub Actions → GHCR → SSH; EAS Build | Sabih, Sayeem |
| Quality | ruff, mypy, pytest, ESLint, Prettier, Jest, RN Testing Library, Maestro, k6; Sentry | everyone, Sayeem (QA) |

## Backend modules (`backend/app/modules/`)

| Module | Responsibility | Key tables | Features | Co-owner |
|--------|----------------|-----------|----------|----------|
| accounts | register, login, refresh, roles, consent, GDPR export/delete | users, refresh_tokens, consents, devices | 6.1, 6.9 | Hassan |
| zones | zone polygons, species per zone, bbox/radius queries, current scores | zones, zone_species, zone_scores | 6.2 | Hassan |
| visits | synced visits, validation, idempotent upsert | visits | 6.3 | Hassan |
| feedback | ratings, amounts, photo metadata, enqueue YOLO | reports, photos | 6.4 | Hassan |
| trust | user trust, report weights, consensus | user_trust, report_weights | 6.5 | Hassan |
| prediction | features, XGBoost/baseline, fusion, model registry | zone_features, predictions, model_versions | 6.2, 6.6 | Remon |
| reasoning | ontology, rules, alerts with explanation, push | alerts, alert_rules_log | 6.7 | Asmer |
| analytics | median stay, visits/day, trends (materialised views) | mv_zone_daily, mv_user_stats | 6.8 | Hassan / Sayeem |
| ingest | FMI weather, Sentinel-2 NDVI, ingest runs — thin wrapper over `data/` | weather_*, ndvi_obs, ingest_runs | 6.2, 6.6 | Awais |
| media | presigned upload/download, thumbnails | photos (shared) | 6.4 | Sabih |

Rule: a module calls another module's `service.py`, never its tables.

## Scheduled jobs

| Job | Trigger | Feature |
|-----|---------|---------|
| ingest_weather | daily 05:30 | 6.2, 6.6 |
| ingest_ndvi | daily 06:00 | 6.2, 6.6 |
| predict_yield | daily 07:00 | 6.2, 6.6 |
| run_reasoning | after predict_yield and each new score | 6.7 |
| detect_berries | photo uploaded | 6.4, 6.5 |
| recompute_zone_score | new report/visit (de-duplicated), nightly | 6.2, 6.5 |
| refresh_analytics | hourly | 6.8 |
| purge_personal_data | nightly | 6.9 |

## End-to-end acceptance flows
* **Flow A – one visit, forest to map:** geofence → visit → offline feedback + photo → sync → YOLO → trust → score → map.
* **Flow B – morning alert:** ingest → predict → fuse → reasoning → throttle → FCM.
* **Flow C – delete my account:** revoke tokens → purge job → anonymise reports/visits.

If all three run on demo day, every core feature is exercised.
