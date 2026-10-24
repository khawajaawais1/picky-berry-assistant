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
| Mobile | **Built:** React Native + Expo (TypeScript, Expo Router, EAS builds), MapLibre RN drawing the pilot's real zone geometry (no basemap or offline packs yet), TanStack Query with its cache persisted on the device, zod, the app's own fi/en catalogues, expo-location (foreground only, no geofences), and Firebase Authentication's password-reset request behind the app's session port (Identity Toolkit's `accounts:sendOobCode`, only when `EXPO_PUBLIC_FIREBASE_API_KEY` is configured; no reset token is kept, and sign-in remains the stand-in — [ADR-062](../app/docs/adr/ADR-062-password-reset-belongs-to-the-provider.md)). **Installed, not wired:** Zustand, expo-sqlite + Drizzle, react-hook-form. **Planned:** the generated OpenAPI client, PMTiles/offline packs, FCM, Maestro (a Playwright web harness stands in today). **Not adopted:** i18next (the app's own catalogues, [ADR-017](../app/docs/adr/ADR-017-localization.md)); background geofencing is out of scope for v1 ([ADR-056](../app/docs/adr/ADR-056-background-capture-is-out-of-scope.md)) | Salman |
| API | **Not built:** only the planned package layout and the `ingest` module's schedule note ([backend/README.md](../backend/README.md)); there is no FastAPI app, router, `service.py` or OpenAPI YAML. **Planned:** the FastAPI + Pydantic v2 skeleton with `/health`, SQLAlchemy 2 async + GeoAlchemy2 + Alembic, JWT (15 min) + rotating refresh (30 d), Argon2, and the zone endpoints; the client's side of that contract is written down in [app/docs/api-contract.md](../app/docs/api-contract.md) | Hassan |
| Jobs | **Not built:** no APScheduler or worker code. The two daily ingests are documented CLI commands run by hand (`picky-data weather … && picky-data load`) until the job runner (D15) exists; every job in §Scheduled jobs below is planned | Hassan |
| Database | **Built locally:** the Postgres 17 + PostGIS 3.5 + h3-pg image ([docker/postgres/Dockerfile](../docker/postgres/Dockerfile)) initialising `postgis`, `h3`, `h3_postgis` and `pgcrypto`, plus the reference data DDL and its loader (`data/sql/001_data_tables.sql`, `picky-data load`) for species, zones, zone_species, ingest_runs, weather and NDVI. **Planned:** Alembic migrations and every API-owned table (users, refresh_tokens, consents, visits, reports) | Hassan (schema), Sabih (ops) |
| Knowledge graph | **Not built:** only the proposed layout ([ontology/README.md](../ontology/README.md)); there are no `.ttl` files, `.rq` rules, JSON-LD context or rdflib code. The species list and habitat rules it would formalise live as YAML in `data/config/` and are marked unverified. **Planned:** ontology v1 and three rules by 3 Nov | Asmer |
| ML | **Not built:** no training code, exported model or model card — [ml/README.md](../ml/README.md) is the plan. The app's scores come from the data team's 50-zone stub and its forecasts are sample data, so nothing it shows is model output. **Planned:** the YOLO11n ONNX detector, a phenology baseline, the XGBoost quantile model and `eval.py` in CI | Remon |
| Data | **Built (code + tests):** the pilot-area config, forest-mask → H3 zone builder, zone-species rules, FMI weather + GDD with station IDW, Sentinel-2 NDVI zonal statistics and anomaly (credentials required), PMTiles basemap extract, data checks and the Postgres loader, with pytest and a ruff + pytest CI job. **Exercised, not at scale:** the committed 50-zone `test_zones.geojson`; the real 2021–2026 backfill and `zone_features` are **planned** ([data/README.md](../data/README.md) §7), and outputs stay in the git-ignored `data/out/` rather than a bucket | Awais |
| Media | **Built locally:** the MinIO container in [docker-compose.dev.yml](../docker-compose.dev.yml). **Not built:** no S3 client, presigned upload/download endpoint, thumbnail generation or bucket policy; `data/` writes parquet to `data/out/` instead of uploading. **Planned:** the presigned endpoints and thumbnails | Sabih |
| Deploy | **Built:** the local dev compose (Postgres + MinIO) and its Postgres image, the app and data verification workflows in GitHub Actions, and EAS build profiles configured in [app/eas.json](../app/eas.json) (no build has been run from CI). **Planned:** `docker-compose.prod.yml` (api, db, Caddy), `Caddyfile`, the nightly backup and restore test, and the GHCR → SSH → `alembic upgrade head` → `/health` pipeline; no production VM or deployment exists | Sabih, Sayeem |
| Quality | **Built:** ESLint, Prettier, Jest with React Native Testing Library (app: 120 suites / 1194 tests, 2026-10-25), TypeScript, `expo-doctor`, the Playwright web harness that measures every built screen and walks its accessibility tree (app CI), and a CI job that exports the iOS and Android JavaScript bundles; ruff and pytest (data CI). **Planned:** mypy and pytest for the API (there is no backend code yet), Maestro (the Playwright web harness stands in today), k6 and Sentry | everyone, Sayeem (QA) |

Every component row separates **what exists in this repository from what the plan lists for it**
(as of 2026-10-24); the app and `data/` are the only layers with working code behind them, and
“built locally” means the dev compose brings the service up. What each remaining frontend item needs is
tracked in [the app's plan](../app/docs/plans/team-mvp-plan.md) §6, and the backend's week-1
deliverables in [its README](../backend/README.md).

## Backend modules (`backend/app/modules/`)

Status uses the same rule as the component table above, on the same date (2026-10-24):
**Built** means the module's `router.py`, `service.py` and `models.py` exist with passing tests;
**Stubbed** means no module code exists, but something the repository already owns stands in for it
at a named boundary — the app's session port, the committed zone stub, the device report queue, the
hand-run `data/` CLI — so the rest of the system can be written and tested against it today (the
project's stub convention, [CONTRIBUTING.md](../CONTRIBUTING.md) §2); **Planned** means only the
design, this table and the folder layout name it. Nothing under `backend/app/` is Python yet — the
module tree's only file is `ingest/README.md` — so no module is built. The `Key tables` column is
the design's list. The only tables it names that exist anywhere in the repository are `zones`, `zone_species`,
`ingest_runs`, `weather_stations`, `weather_station_daily`, `zone_weather_weights` and `ndvi_obs`,
as reference DDL in `data/sql/001_data_tables.sql`; every API-owned table, score table, alert table
and materialised view is a name in the design, and no Alembic migration creates any of them.

| Module | Status in this repository | Responsibility | Key tables | Features | Co-owner |
|--------|---------------------------|----------------|-----------|----------|----------|
| accounts | **Stubbed (client side):** no module code and no `users`, `refresh_tokens`, `consents` or `devices` table. The app's session port has a stand-in provider that issues a session for any credential the form accepted outside a production build and refuses every credential in one; [ADR-054](../app/docs/adr/ADR-054-the-account-belongs-to-the-api.md) fixes what the real service must answer | register, login, refresh, roles, consent, GDPR export/delete | users, refresh_tokens, consents, devices | 6.1, 6.9 | Hassan |
| zones | **Stubbed (client side):** no module code and no `zone_scores` table. The app reads the data team's 50-zone `data/test_zones.geojson` (copied into its assets) through its one `ZoneSource` (`app/src/features/discover/services/test-zone-source.ts`), every feature marked `stub: true`; [ADR-036](../app/docs/adr/ADR-036-the-zone-service-what-it-must-return.md) is the contract `GET /zones` has to meet | zone polygons, species per zone, bbox/radius queries, current scores | zones, zone_species, zone_scores | 6.2 | Hassan |
| visits | **Stubbed (client side):** no module code and no `visits` table. The app mints visit ids on the device ([ADR-005](../app/docs/adr/ADR-005-offline-first-sync.md)'s idempotency key) and applies a local stand-in policy to location fixes (`app/src/features/visits/hooks/use-visit-presence.ts`), but no screen calls it — it needs the zone list above — and nothing is sent | synced visits, validation, idempotent upsert | visits | 6.3 | Hassan |
| feedback | **Stubbed (client side):** no module code and no `reports` or `photos` table. Saving a post-visit report writes rating, species, amount and duration to the device's queue (`app/src/services/report-queue.ts`), which has no transport ([ADR-005](../app/docs/adr/ADR-005-offline-first-sync.md) is design only); the design's photo row is deliberately absent because it needs an image picker, camera, photo permissions and evidence-media rules the app does not have | ratings, amounts, photo metadata, enqueue YOLO | reports, photos | 6.4 | Hassan |
| trust | **Planned:** nothing outside this row and the design; no `user_trust` or `report_weights` table and no client code computing a weight | user trust, report weights, consensus | user_trust, report_weights | 6.5 | Hassan |
| prediction | **Planned:** no module code, `model_versions` table or exported model — [ml/README.md](../ml/README.md) is still the plan. The scores the map and zone screens print are the committed stub's `scores` object, and the `zone_features` input it would read is itself unbuilt | features, XGBoost/baseline, fusion, model registry | zone_features, predictions, model_versions | 6.2, 6.6 | Remon |
| reasoning | **Planned:** no module code and no `alerts` or `alert_rules_log` table. The alert screen's forecast and its three reasons are the design's sample — `app/src/features/discover/domain/alert.ts` says nothing it shows is observed — and no push is sent | ontology, rules, alerts with explanation, push | alerts, alert_rules_log | 6.7 | Asmer |
| analytics | **Planned:** no module code and no materialised view. The season screen's totals and chart are the design's demo because there is no analytics service (`app/src/features/discover/domain/season-insights.ts`) | median stay, visits/day, trends (materialised views) | mv_zone_daily, mv_user_stats | 6.8 | Hassan / Sayeem |
| ingest | **Stubbed:** the module tree's only file, `backend/app/modules/ingest/README.md`, fixes the two jobs and their schedules. The `data/` package they would call is built and tested ([ADR-0004](decisions/0004-data-package-and-ingest-module.md)) and its CLI does the work by hand (`picky-data weather … && picky-data load`); `ingest_runs` exists in the reference DDL. There is no Python module, APScheduler job or `jobs` table | FMI weather, Sentinel-2 NDVI, ingest runs — thin wrapper over `data/` | weather_*, ndvi_obs, ingest_runs | 6.2, 6.6 | Awais |
| media | **Planned:** no module code, S3 client, presigned endpoint or thumbnail code. The dev compose defines the MinIO container it would write to, and that is all that exists | presigned upload/download, thumbnails | photos (shared) | 6.4 | Sabih |

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
