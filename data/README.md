# data/ — Awais's pipelines for Feature 6.2 (Live Site Map)

Everything the map needs before a score can exist: the pilot area, the zones, which berries
can grow in each zone, weather + growing-degree days, NDVI, and the basemap.

| D#  | Deliverable                                   | Command                         | Stub until ready                    |
|-----|-----------------------------------------------|---------------------------------|-------------------------------------|
| D3  | Pilot bbox (60 × 60 km around Jyväskylä)      | `picky-data area`               | — (config/pilot_area.yaml)          |
| D10 | Zones: forest mask → H3 res-8 → zones         | `picky-data zones`              | `test_zones.geojson` (50 zones, committed) |
| D11 | zone_species suitability (with Asmer)         | `picky-data zone-species`       | `picky-data zone-species --stub`    |
| D13 | FMI daily weather + GDD per zone, 2021–2026   | `picky-data weather`            | `--stub-one-station` (Jyväskylä airport) |
| D14 | NDVI per zone + anomaly                       | `picky-data ndvi`               | `picky-data ndvi --stub` (anomaly = 0) |
| D18 | Basemap PMTiles + MapLibre style              | `picky-data basemap`            | public demo style (local dev only)  |
| —   | Data checks (C1–C12)                          | `picky-data check [--db]`       |                                     |
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
| MS-NFI rasters (optional) | https://kartta.luke.fi/opendata/valinta.html — volume of pine / spruce / broadleaf + site fertility class, 16 m | ~100 MB each (Central Finland tile) | forest type → better bilberry vs. lingonberry suitability |
| `pmtiles` CLI | https://github.com/protomaps/go-pmtiles/releases (Windows x86_64 zip) | 10 MB | basemap |

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
#   optional MS-NFI: --msnfi-pine raw/manty.tif --msnfi-spruce raw/kuusi.tif --msnfi-broadleaf raw/lehtip.tif --msnfi-fertility raw/kasvupaikka.tif
picky-data zone-species
picky-data weather --start 2021-01-01             # backfill, cached per month in cache/fmi
picky-data ndvi --stub                            # until the Copernicus client exists
picky-data check
picky-data load                                   # needs `docker compose -f ../docker-compose.dev.yml up -d`
picky-data check --db

# Week 3 – NDVI
picky-data ndvi --start 2021-05-01 --months 5,6,7,8,9
```

Daily (07:00, before scoring – Hassan's job runner calls these):

```bash
picky-data weather --start <today-14d> && picky-data ndvi --start <today-20d> && picky-data load
```

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
* **FMI via plain WFS + requests.** `fmiopendata` 0.5.0 fails to build on current setuptools/Python 3.12+.
* **NDVI via Process API tiles + local zonal stats**, not one Statistical API call per zone (≈ 9 requests per dekad instead of ~5,000). Dekads (1–10, 11–20, 21–end) keep bins identical across years, leap years included.
* **Missing NDVI → anomaly 0** (deep dive §13), windows with < 20 % clear pixels count as missing.

## 6. Tests

`pytest` – 25 tests: pilot square, H3 coverage maths, end-to-end zone build on a synthetic Geofabrik zip,
zone_species rules, GDD (season start, gaps, yearly reset), FMI XML parsing, IDW, NDVI zonal stats + anomaly,
and the shape of the test zones (matches the API's `ZoneProps`).
