# data/ — Awais's data pipelines (features 6.2, 6.6 and later)

Everything the scores need before they can exist: the pilot area, the zones, which berries
can grow in each zone, weather + growing-degree days, NDVI, and the basemap. Built first for
feature 6.2 (Live Site Map); feature 6.6 (Yield prediction) reads the same tables.
The backend's `ingest` module runs the daily jobs by importing this package
([ADR 0004](../docs/decisions/0004-data-package-and-ingest-module.md)).

| D#  | Deliverable                                   | Command                         | Stub until ready                    |
|-----|-----------------------------------------------|---------------------------------|-------------------------------------|
| D3  | Pilot bbox (60 × 60 km around Jyväskylä)      | `picky-data area`               | — (config/pilot_area.yaml)          |
| D10 | Zones: forest mask → H3 res-8 → zones         | `picky-data zones`              | `test_zones.geojson` (50 zones, committed) |
| D11 | zone_species suitability (with Asmer)         | `picky-data zone-species`       | `picky-data zone-species --stub`    |
| D13 | FMI daily weather + GDD per zone, 2021–2026   | `picky-data weather`            | `--stub-one-station` (Jyväskylä airport) |
| D14 | NDVI per zone + anomaly                       | `picky-data ndvi`               | `picky-data ndvi --stub` (anomaly = 0) |
| D18 | Basemap PMTiles + MapLibre style              | `picky-data basemap`            | public demo style (local dev only)  |
| —   | Data checks (C1–C14)                          | `picky-data check [--db]`       |                                     |
| —   | Load into Postgres                            | `picky-data load`               |                                     |

## 1. One-time setup (Windows)

```powershell
cd data
.\scripts\setup_windows.ps1          # venv + install + tests
.venv\Scripts\activate
picky-data --help
```

Manual equivalent: `py -3.12 -m venv .venv; .venv\Scripts\activate; pip install -e ".[all,dev]"; pytest`.

Accounts to request **now** (lead time):

* Copernicus Data Space account + OAuth client → `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` in `../.env`
  (https://dataspace.copernicus.eu → User settings → OAuth clients)
* NLS open-data API key → `NLS_API_KEY` (not used by the MVP pipeline yet; needed for NLS topographic data later)
* FMI open data needs **no key**.

## 2. Inputs to download (into `data/raw/`, git-ignored)

| File | From | Size | Used by |
|------|------|------|---------|
| `finland-latest-free.shp.zip` | https://download.geofabrik.de/europe/finland.html | ~1 GB | zones, names (read straight from the zip with a bbox filter) |
| MS-NFI 2023 rasters (strongly recommended) | Luke / Funet — `picky-data msnfi-download` cuts the pilot square, see §2a | ~10–30 MB after the cut | forest type, fertility and **bogs** (OSM maps only ~10 km² of bog in the pilot) |
| `pmtiles` CLI | https://github.com/protomaps/go-pmtiles/releases (Windows x86_64 zip) | 10 MB | basemap |

## 2a. MS-NFI forest inventory (why and how)

First real run (24 Oct 2026): OSM gave 4,863 zones but **no forest type** and only **9.6 km² of bog**,
so bilberry, lingonberry and crowberry came out allowed everywhere and cloudberry in 18 zones.
Luke's MS-NFI rasters fix that (CC BY 4.0, 16 m, EPSG:3067, GeoTIFF, split by TM35 map sheet).

Luke publishes each 2023 layer as **one whole-Finland GeoTIFF** on the Funet mirror
(`https://www.nic.funet.fi/index/geodata/luke/vmi/2023/<layer>_vmi1x_1923.tif`, 0.3–1.7 GB each).
You do **not** need to download them: this reads only the pilot square over HTTP and writes six
small files to `data/raw/msnfi/`:

```powershell
picky-data msnfi-download
picky-data zones --msnfi-dir raw/msnfi
```

| File prefix | Layer | Used for |
|-------------|-------|----------|
| `paatyyppi_` | Site main class (1 mineral soil, 2 spruce mire, 3 pine mire, 4 treeless peatland) | bog share of each zone |
| `kasvupaikka_` | Site fertility class (1 herb-rich … 6 barren, 7 rocky/sandy) | bilberry ↔ lingonberry/crowberry shift |
| `manty_` | Volume, pine (m³/ha) | forest_pine |
| `kuusi_` | Volume, spruce | forest_spruce |
| `koivu_` | Volume, birch | forest_broadleaf |
| `muulp_` | Volume, other broadleaf | forest_broadleaf |

If the HTTP read is slow or blocked, download the six whole-Finland files with a browser into one
folder and cut them locally: `picky-data msnfi-download --source-dir <that folder>`.
Individual layers can also be passed by hand (`--msnfi-site-type`, `--msnfi-pine`, …; several files
or `*` patterns allowed). The `_tukki` / `_kuitu` (saw timber / pulpwood) variants are ignored.

Glob patterns work (the tool expands them), and several map sheets per layer are mosaicked.
Codes 32766/32767 are ignored. Bogs: the larger of OSM's and MS-NFI's estimate is used; extra bog
is taken out of OSM forest first (OSM tags wooded pine bogs as forest).

## 3. Run order (deep dive §11)

```bash
# Week 1 – unblock everyone
picky-data area                                   # → out/pilot_area.geojson: share it, agree D3
picky-data test-zones                             # → test_zones.geojson (already committed)
picky-data basemap --scope pilot                  # → out/jyvaskyla-pilot.pmtiles (fast, for Salman's D9 test)
picky-data basemap --scope finland                # → out/finland.pmtiles (D18, ~1–2 GB at z14)
cd scripts && npm i @protomaps/basemaps@5 && node make_style.mjs pmtiles://http://localhost:9000/picky-public/tiles/finland.pmtiles > ../out/style.json

# Week 2 – real zones + weather
picky-data zones --osm raw/finland-latest-free.shp.zip
#   better: picky-data msnfi-download && picky-data zones --msnfi-dir raw/msnfi   (§2a)
picky-data zone-species
picky-data weather --start 2021-01-01             # backfill, cached per month in cache/fmi
picky-data ndvi --stub                            # until the Copernicus client exists
picky-data check
picky-data load                                   # needs `docker compose -f ../docker-compose.dev.yml up -d`
picky-data check --db

# Week 3 – NDVI
picky-data ndvi --start 2021-05-01 --months 5,6,7,8,9
```

Daily, before the 07:00 `predict_yield` job (architecture doc §5 — `ingest_weather` 05:30,
`ingest_ndvi` 06:00; Hassan's job runner calls these through `backend/app/modules/ingest`):

```bash
picky-data weather --start <today-14d> && picky-data load      # 05:30
picky-data ndvi --start <today-20d> && picky-data load         # 06:00
```

Every `load` writes one row per source to `ingest_runs`.

## 3a. Loading into Supabase (team database)

The team's database is the Supabase project **Picky** (Postgres + PostGIS). `picky-data load`
creates the tables (idempotent), turns on Row Level Security, and upserts everything in `data/out/`.

1. Supabase dashboard → **Database → Extensions** → enable **postgis**. (If **h3** is offered,
   enable it too; otherwise H3 ids are stored as text automatically.)
2. Dashboard → **Connect** → **Session pooler** (works on IPv4 networks) → note host, port, user.
3. In the repo-root `.env`, comment out `DATABASE_URL` and add these lines. The password is used
   exactly as written (characters like `@` or `#` need no encoding):

```
# DATABASE_URL=...
PGHOST=aws-0-eu-west-1.pooler.supabase.com
PGPORT=5432
PGUSER=postgres.<project-ref>
PGPASSWORD=<database password>
PGDATABASE=postgres
```

   (A single `DATABASE_URL=postgresql://…` also works, but then special characters in the
   password must be %-encoded, e.g. `@` → `%40`. `PGHOST` wins when both are set.)
4. Run:

```powershell
picky-data load
picky-data check --db
```

Security: `species`, `zones` and `zone_species` are readable by the app (`anon`/`authenticated`,
read-only); weather, NDVI and `ingest_runs` are not exposed through the Data API at all. Nobody can
write through the API — only the pipeline (database owner). The views run with the caller's
rights (`security_invoker`). Never commit `.env`.

## 4. Outputs (`data/out/`, git-ignored → object storage)

| File | Table | Notes |
|------|-------|-------|
| `zones.parquet` / `zones.geojson` | `zones` | stable `id` = uuid5(h3) – rebuilds never change ids |
| `zone_species.parquet` | `zone_species` | `rules_version` ends `-unverified` until Asmer signs off |
| `weather_stations.parquet`, `weather_station_daily.parquet` | `weather_stations`, `weather_station_daily` | GDD base 5 °C from 1 April |
| `zone_weather_weights.parquet` | `zone_weather_weights` | IDW over 3 nearest stations; view `weather_daily` gives per-zone values |
| `ndvi_obs.parquet` | `ndvi_obs` | dekad composites; view `ndvi_zone_latest` |
| `habitat_mask.parquet` | — | forest/mire polygons for QA in QGIS |

Schema: `sql/001_data_tables.sql` (reference DDL for Hassan's Alembic migrations).
Checks: `sql/900_data_checks.sql` + `src/picky_data/checks.py`.

## 5. Design decisions (and why)

* **Metric CRS = EPSG:3067 (ETRS-TM35FIN).** All areas and distances are computed there; storage is EPSG:4326 for the API.
* **Pilot = 405–465 km E, 6872–6932 km N in EPSG:3067** – a true 60 × 60 km square snapped to whole km so every tool agrees.
* **H3 res-8 cells are ≈ 0.57 km² here, not 0.74 km²** (0.74 is H3's global mean). The square holds 6,271 cells; after the 40 % forest/mire filter expect roughly 4,000–5,000 zones, not the 3,500 in the doc. Payload estimates in §5 of the deep dive should be re-checked with real zones.
* **Zone ids are deterministic** (uuid5 of the H3 id) so the app's offline cache, reports and score history survive rebuilds.
* **Mire wins over forest** where OSM polygons overlap (wooded bogs are cloudberry land).
* **Weather is stored per station + IDW weights, not per zone × day.** 6 years × 4–5k zones × 365 days would be ~10M rows; the `weather_daily` view gives the same per-zone numbers from ~10k station-days per year.
* **FMI via plain WFS + requests** ([ADR 0005](../docs/decisions/0005-fmi-plain-wfs.md)). `fmiopendata` 0.5.0 fails to build on current setuptools/Python 3.12+.
* **NDVI via Process API tiles + local zonal stats** ([ADR 0006](../docs/decisions/0006-ndvi-process-api-tiles.md)), not one Statistical API call per zone (≈ 9 requests per dekad instead of ~5,000). Dekads (1–10, 11–20, 21–end) keep bins identical across years, leap years included.
* **Weather per station + IDW view** ([ADR 0007](../docs/decisions/0007-weather-per-station-idw.md)).
* **Quality ranges** (architecture doc §10): temperatures outside −50..+40 °C → NaN, precipitation ≥ 0, NDVI within −1..1, ≥ 80 % of zones must get weather on the latest day.
* **Missing NDVI → anomaly 0** (deep dive §13), windows with < 20 % clear pixels count as missing.

## 6. Tests

`pytest` – 39 tests: pilot square, H3 coverage maths, end-to-end zone build on a synthetic Geofabrik zip,
MS-NFI enrichment across two map sheets (bog share, volume shares, fertility, glob patterns), zone_species rules, GDD (season start, gaps, yearly reset), FMI XML parsing, temperature ranges, IDW,
NDVI zonal stats + anomaly, data checks, and the shape of the test zones (matches the API's `ZoneProps`).

## 7. Roadmap — what data/ delivers to each feature

| Feature | Deliverable | Sprint | Status |
|---------|-------------|--------|--------|
| 6.2 Live map | Pilot area, zones, zone_species, weather + GDD, NDVI, basemap | 1–2 | ✅ code + tests · ⬜ real run |
| 6.2 / 6.6 | `ingest_runs` bookkeeping + daily jobs wired into `backend/…/ingest` | 2 | ✅ table · ⬜ job wiring (needs D15) |
| 6.6 Yield prediction | FMI 7-day forecast rows (`is_forecast`) | 2 | ⬜ |
| 6.6 Yield prediction | `zone_features` (zone × species × day): gdd_since_apr1, precip_30d, frost days during flowering, ndvi_latest, ndvi_anomaly, doy, forest type — agreed with Remon | 2–3 | ⬜ |
| 6.6 Yield prediction | Historical seasons 2021–2025 backfill for training + baseline comparison | 2 | ⬜ (CLI ready) |
| 6.9 Offline | Offline basemap packs / pilot PMTiles for the app | 3 | ✅ CLI · ⬜ upload to bucket |
| F4 Drone & wild-bee data | New ingest pipeline → extra `zone_features` columns | future | — |
