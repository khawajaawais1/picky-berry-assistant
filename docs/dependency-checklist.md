# Dependency checklist — Feature 6.2 Live Site Map (mirror of §3 of the 6.2 deep dive)

Status as of 22 Oct 2026. Awais's rows reflect what is in this repo. Each later core feature gets its own checklist inside its deep dive (see features/TEMPLATE.md §2).

| ID | Dependency | Owner | Status |
|----|------------|-------|--------|
| D1 | Monorepo + branch rules | Sayeem | Skeleton scaffolded (folders, README, .gitignore, .env.example) – Sayeem to create the GitHub repo + rules |
| D2 | Dev setup on every laptop | Everyone | Not started |
| D3 | Pilot bbox (60 × 60 km, Jyväskylä) | Awais | **Proposed** – `data/config/pilot_area.yaml`, needs team agreement |
| D4 | Postgres 17 + PostGIS + h3-pg image | Sabih + Hassan | Dockerfile + compose drafted in `docker/` – needs a build on a laptop |
| D5 | FastAPI skeleton | Hassan | Not started |
| D6 | Species vocabulary | Asmer + Hassan | Stub: `data/config/species.yaml` (4 codes, placeholder IRIs) |
| D7 | OpenAPI contract | Hassan + Salman | Not started |
| D8 | Figma | Sabih | Not started |
| D9 | Expo dev build with MapLibre | Salman | Not started |
| D10 | Zones generated | Awais | **Code ready + tested**; stub `data/test_zones.geojson` committed; real run needs the Geofabrik download |
| D11 | zone_species | Asmer + Awais | **Code ready**; rules `verified: false` until Asmer reviews `data/config/zone_species_rules.yaml` |
| D12 | Species phenology | Asmer | Not started |
| D13 | Weather + GDD | Awais | **Code ready + tested** (FMI WFS client, GDD, IDW); real backfill to run on a laptop |
| D14 | NDVI per zone + anomaly | Awais | **Code ready**; stub (anomaly 0) works now; real run blocked on Copernicus OAuth client |
| D15 | Job runner | Hassan | Not started |
| D16 | Baseline model | Remon | Not started |
| D17 | Reports + trust | Hassan | Not started |
| D18 | Basemap PMTiles + style | Awais | **Scripts ready**; needs the pmtiles CLI installed |
| D19 | Object storage bucket | Sabih | MinIO added to `docker-compose.dev.yml` |
| D20 | VM + domain + HTTPS | Sabih | Not started |
| D21 | Login + JWT | Hassan | Not started |
