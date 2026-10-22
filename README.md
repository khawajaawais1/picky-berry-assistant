# Picky – Berry Picker Assistant (monorepo)

Team Picky's MVP. The first feature is **6.2 Live Site Map with Yield Score & Confidence**
(sprints 1–2, 22 Oct – 17 Nov 2026). The design lives in the
"Feature 6.2 Deep Dive" doc; this repo implements it.

| Folder       | Owner (lead)       | What lives here                                                     |
|--------------|--------------------|---------------------------------------------------------------------|
| `app/`       | Salman             | Expo / React Native app, MapLibre map (D9)                          |
| `backend/`   | Hassan             | FastAPI modular monolith, Alembic migrations, jobs (D5, D7, D15)    |
| `ml/`        | Remon              | Phenology baseline + later XGBoost scoring (D16)                    |
| `data/`      | **Awais**          | Pilot area, zones, zone_species, weather + GDD, NDVI, basemap (D3, D10, D11, D13, D14, D18) |
| `ontology/`  | Asmer              | Species vocabulary + IRIs (D6), phenology sources (D12)             |
| `docs/`      | everyone           | Decisions, dependency checklist, runbooks                           |
| `docker/`    | Sabih + Hassan     | Postgres 17 + PostGIS + h3-pg image (D4), MinIO (D19)               |

## Quick start (Windows / macOS / Linux)

```bash
# 1. Database + object storage
docker compose -f docker-compose.dev.yml up -d --build

# 2. Data tooling (Awais)
cd data
py -3.12 -m venv .venv          # macOS/Linux: python3.12 -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -e ".[all,dev]"
picky-data --help
```

See `data/README.md` for the full data pipeline runbook.

## Branch rules (D1 – proposal for Sayeem)

* `main` is protected: PR + 1 review + green CI.
* Branch names: `feat/<D#>-short-name`, `fix/...`, `data/...`.
* Pin exact versions in the first PR of each folder; no upgrades mid-sprint.
* Never commit secrets: `.env` is git-ignored, copy from `.env.example`.
