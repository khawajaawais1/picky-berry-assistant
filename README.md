# Picky — Berry Picker Assistant

**A mobile app and cloud service that helps people in Finland find good wild-berry spots at the right time.**
A live zone map with yield score, confidence and ripeness · automatic GPS visit detection ·
trust-weighted feedback · berry detection from photos · yield prediction · explainable push
alerts · offline and privacy-first — and later a picker-to-buyer marketplace.

> New here? Read **[CONTEXT.md](CONTEXT.md)** first (one-page brief), then
> **[CONTRIBUTING.md](CONTRIBUTING.md)** (how we work).

**Team Picky** · TIES4570 CSDP · University of Jyväskylä · Pilot: 60 × 60 km around Jyväskylä ·
Species: bilberry, lingonberry, cloudberry, crowberry · Final demo **17 Dec 2026**.

---

## Features

9 core features (MVP), 5 desired extras, 6 future developments.
Full catalogue with owners, modules, sprints and status: **[docs/features/README.md](docs/features/README.md)**.

Status names the layer, because the app is built ahead of the services: **app 🟡** means the
screens exist and run on device records or the committed zone stub, while the API, model or
pipeline behind them is still **⬜**. ✅ still means the feature's acceptance criteria pass on
staging, which none does.

| ID | Core feature | Sprint | Status |
|----|-------------|--------|--------|
| 6.1 | Accounts and roles | 1–2 | 🟡 app screens (stand-in session) · API ⬜ |
| 6.2 | Live site map with yield score & confidence | 1–2 | 📝 deep dive · 🟡 app screens on the zone stub · data 🟡 · API ⬜ |
| 6.3 | GPS visit detection | 2 | 🟡 app tracker + screen (no zone list, so no caller) · API ⬜ |
| 6.4 | Feedback (rating + photo) | 2 | 🟡 app feedback screen + device queue (no transport) · API ⬜ |
| 6.5 | Validation and trust weighting | 2 | ⬜ |
| 6.6 | Yield prediction | 2–3 | ⬜ |
| 6.7 | Reasoning and explainable push alerts | 3 | 🟡 app alerts screen (design sample) · API ⬜ |
| 6.8 | Analytics | 3 | 🟡 app season screen (design sample) · API ⬜ |
| 6.9 | Offline mode and privacy | 3 | 🟡 app privacy/offline screens, device records only · API ⬜ |

Extras: E1 marketplace with escrow · E2 video analysis & fraud checks · E3 rewards · E4 safety route back & SOS · E5 admin tools.

## Repository layout

```
picky-berry-assistant/
├── CONTEXT.md               ← start here: project brief
├── CONTRIBUTING.md          ← branches, PRs, definition of done, new features
├── .env.example             ← copy to .env (never commit .env)
├── docker-compose.dev.yml   ← local Postgres 17 + PostGIS + h3, MinIO
├── app/                     ← React Native (Expo) app                       — Salman (Prottoy)
├── backend/                 ← FastAPI modular monolith, 10 modules           — Hassan (+ module co-owners)
│   └── app/modules/ingest/  ← daily ingest jobs, thin wrapper over data/     — Awais
├── data/                    ← data pipelines: zones, weather, NDVI, basemap  — Awais
├── ml/                      ← YOLO (WildBe), phenology baseline, XGBoost     — Remon
├── ontology/                ← Berry ontology (OWL/Turtle), SPARQL alert rules — Asmer
├── docker/                  ← Postgres + PostGIS + h3 image                  — Sabih + Hassan
├── deploy/                  ← production compose, Caddy, backups             — Sabih
├── scripts/                 ← repo-wide helpers (seed data)                  — Sayeem + Hassan
├── docs/                    ← features, architecture, ADRs, sprints, privacy, licences
└── .github/                 ← CI, PR/issue templates, CODEOWNERS             — Sayeem
```

| Folder | Status |
|--------|--------|
| `app/` | ✅ Expo app: every v1 design screen, 118 suites / 1187 tests, layout + accessibility CI; MapLibre draws the pilot stub's zones — a basemap and the zone service are next ([`app/README.md`](app/README.md)) |
| `data/` | ✅ Pipelines for 6.2 + 28 tests; 50 stub zones committed; the real backfill and bucket upload are not run |
| `docker/` | 🟡 Postgres 17 + PostGIS + h3 image and dev compose defined; no CI build |
| `backend/`, `ml/`, `ontology/`, `deploy/` | ⬜ Planned layout in each README; no code in any of them yet |

Sprint plan and first deliverables (due 3 Nov): [docs/sprints.md](docs/sprints.md).

## Getting started

**Prerequisites (everyone):** Git · Docker Desktop · Node LTS · Python 3.12 · Android Studio emulator · Expo account.

```bash
git clone <repo-url> picky-berry-assistant
cd picky-berry-assistant
cp .env.example .env                                     # Windows: copy .env.example .env
docker compose -f docker-compose.dev.yml up -d --build   # Postgres :5432, MinIO console :9001
```

Then follow your folder's README. For data tooling:

```powershell
cd data
.\scripts\setup_windows.ps1      # macOS/Linux: python3.12 -m venv .venv && source .venv/bin/activate && pip install -e ".[all,dev]"
.venv\Scripts\activate
picky-data --help
```

**Working before real data exists:** `data/test_zones.geojson` has 50 zones around Laajavuori in the
exact `GET /api/v1/zones?species=bilberry` shape — use it for app mocks, Prism and API tests.

The app is the `app/` folder; its own commands run from there (`cd app && npm ci && npm start`),
and its gate is [`.github/workflows/mobile.yml`](.github/workflows/mobile.yml).

## Architecture at a glance

React Native app → HTTPS/JWT → Caddy → **one FastAPI image** (accounts, zones, visits, feedback,
trust, prediction, reasoning, analytics, ingest, media + job queue) → PostgreSQL 17 + PostGIS + h3,
S3 bucket, rdflib ontology, YOLO/XGBoost models ← FMI, Sentinel-2, OSM/Protomaps, Firebase FCM.
One EU VM, ≈ €485/yr. Details: [docs/architecture.md](docs/architecture.md) and the
[MVP Architecture doc](https://claude.ai/artifact/EnkBHuaL7DENBFutQMPEqw).

**That chain is the target design.** Only the app and the `data/` package exist today: the app runs
on device records and the committed zone stub, and there is no API, bucket, ontology or model in
the repository. [docs/architecture.md](docs/architecture.md) keeps the per-layer status.

## Tech stack

Expo + MapLibre React Native · FastAPI + SQLAlchemy 2 + Alembic · PostgreSQL 17 + PostGIS + h3-pg ·
rdflib + SPARQL · YOLO11 (ONNX) + XGBoost · Python data stack (geopandas, h3, rasterio, sentinelhub) ·
Protomaps PMTiles · MinIO / S3 · Firebase Cloud Messaging · Caddy · GitHub Actions + EAS ·
pytest, Jest, Maestro, k6 · Sentry. All free and open source.

## Documentation

| Doc | |
|-----|---|
| [CONTEXT.md](CONTEXT.md) | Project brief, team, timeline, conventions, glossary |
| [docs/features/](docs/features/README.md) | Feature catalogue + deep-dive template |
| [docs/architecture.md](docs/architecture.md) | Modules, jobs, end-to-end flows |
| [docs/decisions/](docs/decisions/) | Architecture decision records |
| [docs/sprints.md](docs/sprints.md) | Sprints, deliverables, deadlines |
| [docs/data-contract.md](docs/data-contract.md) | Tables `data/` provides to other modules |
| [docs/privacy.md](docs/privacy.md) · [docs/licences.md](docs/licences.md) | GDPR records · licences & attribution |

## Data sources and attribution

© OpenStreetMap contributors (ODbL) via Geofabrik and Protomaps · Finnish Meteorological Institute
open data (CC BY 4.0) · Copernicus Sentinel-2 data · WildBe dataset, FBK-TeV (CC BY-NC 4.0, non-commercial) ·
optional: Luke MS-NFI and NLS Finland (CC BY 4.0). See [docs/licences.md](docs/licences.md).

## Team

| | Role |
|---|---|
| Mohammad Sayeem Sadat Hossain | PM, QA & Speaker |
| Md Salman Hossan Prottoy | Frontend (React Native) & Archivarius |
| Rakibul Hasan Remon | ML Engineer |
| Awais Amir | Data Engineer |
| Hassan Haider Syed | Backend |
| Syed Ali Asmer | Domain Research & Tech Lead |
| Syed Sabih Ahmed Zaidi | Frontend, Cloud & UI/UX |
