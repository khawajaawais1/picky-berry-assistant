# Picky — Berry Picker Assistant

**A map app that tells berry pickers in Finland where the berries are ripe right now.**
Every forest zone gets a yield score (0–100), a confidence level, a ripeness stage and a
plain-words reason, built from forest data, weather, satellite greenness and pickers' own reports.

> New to the project? Read **[CONTEXT.md](CONTEXT.md)** first — the one-page brief on what we
> build, who owns what, how the score works and the 4-week plan.

**Status:** Sprint 1 · Feature 6.2 *Live Site Map with Yield Score & Confidence*
(22 Oct – 17 Nov 2026) · Pilot area: 60 × 60 km around Jyväskylä ·
Species: bilberry, lingonberry, cloudberry, crowberry.

---

## Repository layout

```
picky-berry-assistant/
├── CONTEXT.md               ← start here: project brief for the whole team
├── README.md                ← this file
├── .env.example             ← copy to .env (never commit .env)
├── docker-compose.dev.yml   ← Postgres 17 + PostGIS + h3-pg, MinIO
├── docker/postgres/         ← DB image + extensions
├── app/                     ← Expo / React Native app (Salman)
├── backend/                 ← FastAPI modular monolith (Hassan)
├── ml/                      ← scoring: phenology baseline → XGBoost later (Remon)
├── data/                    ← data pipelines: zones, weather, NDVI, basemap (Awais)
├── ontology/                ← species vocabulary + phenology sources (Asmer)
├── docs/                    ← dependency checklist, data contract, decisions
└── .github/workflows/       ← CI
```

| Folder | Owner | Status |
|--------|-------|--------|
| `data/` | Awais | ✅ Pipelines + 25 tests; stub zones ready to use |
| `docker/` | Sabih + Hassan | 🟡 Drafted, needs a first build on a laptop |
| `backend/` | Hassan | ⬜ Not started |
| `app/` | Salman | ⬜ Not started |
| `ml/` | Remon | ⬜ Not started |
| `ontology/` | Asmer | 🟡 Species stub in `data/config/species.yaml` |

Full D1–D21 status: [docs/dependency-checklist.md](docs/dependency-checklist.md).

## Getting started

### Prerequisites (D2 — everyone)

Git · Docker Desktop · Node LTS · Python 3.12 · Android Studio emulator · Expo account

### 1. Clone and configure

```bash
git clone <repo-url> picky-berry-assistant
cd picky-berry-assistant
cp .env.example .env            # Windows: copy .env.example .env
```

### 2. Start the database and object storage

```bash
docker compose -f docker-compose.dev.yml up -d --build
# Postgres → localhost:5432 (picky / picky)   MinIO console → http://localhost:9001
```

### 3. Data tooling (needed by anyone loading zones locally)

```powershell
cd data
.\scripts\setup_windows.ps1     # macOS/Linux: python3.12 -m venv .venv && source .venv/bin/activate && pip install -e ".[all,dev]"
.venv\Scripts\activate
picky-data --help
```

### 4. Working before real data exists

Use **`data/test_zones.geojson`** — 50 zones around Laajavuori, already in the exact
`GET /api/v1/zones?species=bilberry` response shape. Good for the app's mock data,
Prism mocks and API tests.

## Per-folder guides

* **Data pipelines:** [data/README.md](data/README.md) — run order, inputs, outputs, design decisions
* **Data contract** (what `data/` gives backend, ML and app): [docs/data-contract.md](docs/data-contract.md)
* **App / backend / ML / ontology:** each folder's `README.md` (owners fill in during week 1)

## How we work

* **Branches:** `feat/<D#>-short-name`, `fix/…`, `data/…`
* **Pull requests:** into `main` only, 1 review + green CI; link the D# or acceptance criterion (A1–A8)
* **Versions:** pinned exactly in the first PR of each folder; no upgrades mid-sprint
* **Secrets:** `.env` only — never in code, never in git
* **Large files** (`.pbf`, `.pmtiles`, `.tif`, `.parquet`): object storage, not git
* **Stubs first:** if you depend on something that isn't ready, use its stub (see the checklist) and keep going

## Tech stack

Expo + MapLibre React Native · FastAPI + SQLAlchemy 2 + Alembic · Postgres 17 + PostGIS + h3-pg ·
Python (geopandas, h3, rasterio, sentinelhub) · Protomaps PMTiles · MinIO / S3 ·
pytest · Jest · Maestro · k6. All free and open source.

## Data sources and attribution

* Forest, mire and place names: © OpenStreetMap contributors (ODbL), via Geofabrik
* Weather: Finnish Meteorological Institute open data (CC BY 4.0)
* Satellite: Copernicus Sentinel-2 data, via Copernicus Data Space Ecosystem
* Forest inventory (optional): Natural Resources Institute Finland (Luke), MS-NFI (CC BY 4.0)
* Basemap: Protomaps, built from OpenStreetMap

## Team

Team Picky — Sayeem · Awais · Hassan · Salman · Remon · Asmer · Sabih
