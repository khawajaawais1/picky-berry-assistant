# Dependency checklist — Feature 6.2 Live Site Map (mirror of §3 of the 6.2 deep dive)

Status as of 24 Oct 2026. The frontend rows say what the app actually has; Awais's rows say what
`data/` holds. A row is only ✅ when the thing it names exists in the repository — a design, a
proposal or a stub is named as such. Each later core feature gets its own checklist inside its
deep dive (see features/TEMPLATE.md §2).

| ID | Dependency | Owner | Status |
|----|------------|-------|--------|
| D1 | Monorepo + branch rules | Sayeem | Repo, `.github/` workflows (app and data) and the skeleton exist; branch protection and the task board are still Sayeem's |
| D2 | Dev setup on every laptop | Everyone | Not verified for the team; this checkout runs the app and `data/` tests |
| D3 | Pilot bbox (60 × 60 km, Jyväskylä) | Awais | **Written down** in `data/config/pilot_area.yaml` (EPSG:3067, res 8); the file still says proposal, so team agreement and res 8 vs 9 remain open |
| D4 | Postgres 17 + PostGIS + h3-pg image | Sabih + Hassan | Dockerfile + dev compose define it; no image build runs in CI |
| D5 | FastAPI skeleton | Hassan | Not started — no `main.py`, module package or test |
| D6 | Species vocabulary | Asmer + Hassan | Stub: `data/config/species.yaml` (4 codes, placeholder IRIs), and the app's catalogue carries the same four labels |
| D7 | OpenAPI contract | Hassan + Salman | The app's side is written down (`app/docs/api-contract.md`); no OpenAPI spec exists |
| D8 | Figma | Sabih | The design file exists — 19 top-level frames recorded in `app/docs/design-source.md`; several app-drawn screens behind it have no frame, and that file names each |
| D9 | Expo dev build with MapLibre | Salman | **Built:** every v1 design screen behind a route, MapLibre on the device and an SVG map on the web export, no basemap or offline pack |
| D10 | Zones generated | Awais | **Code ready + tested**; stub `data/test_zones.geojson` committed; real run needs the Geofabrik download |
| D11 | zone_species | Asmer + Awais | **Code ready**; rules `verified: false` until Asmer reviews `data/config/zone_species_rules.yaml` |
| D12 | Species phenology | Asmer | Not started; the app's species copy is labels only |
| D13 | Weather + GDD | Awais | **Code ready + tested** (FMI WFS client, GDD, IDW); real backfill to run on a laptop |
| D14 | NDVI per zone + anomaly | Awais | **Code ready**; stub (anomaly 0) works now; real run blocked on Copernicus OAuth client |
| D15 | Job runner | Hassan | Not started |
| D16 | Baseline model | Remon | Not started |
| D17 | Reports + trust | Hassan | No server; the app queues reports on the device (`app/src/services/report-queue.ts`), with no transport |
| D18 | Basemap PMTiles + style | Awais | **Scripts ready**; needs the pmtiles CLI installed; no tiles are committed or uploaded |
| D19 | Object storage bucket | Sabih | MinIO defined in `docker-compose.dev.yml`; no bucket policy, S3 client or uploaded object |
| D20 | VM + domain + HTTPS | Sabih | Not started |
| D21 | Login + JWT | Hassan | No server or JWT; the app's session port has a stand-in (ADR-054) |
