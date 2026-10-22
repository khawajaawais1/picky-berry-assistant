# Project context — Picky, the Berry Picker Assistant

> Read this first. It is the one-page brief for everyone on Team Picky (and for any AI
> assistant you paste it into). Source of truth for details: the **Feature 6.2 Deep Dive**
> doc and the **MVP Architecture** doc. Where numbers differ, the deep dive wins.

## 1. The product in one paragraph

A mobile app for berry pickers in Finland. A picker opens it and sees, on a map of the
forests around them, how good each zone is for a chosen berry **right now**: a **yield score
0–100**, a **confidence level** (high / medium / low), a **ripeness stage**, and a
plain-words reason why. Pilot area: 60 × 60 km around **Jyväskylä**. Species:
**bilberry, lingonberry, cloudberry, crowberry**.

## 2. What we are building first: Feature 6.2 — Live Site Map

Sprints 1–2, **22 Oct – 17 Nov 2026**. It is the app's home screen; every later feature
(visit detection, feedback, alerts) plugs into it.

**User stories**

1. Coloured zones around my location within 3 s of opening the app.
2. Pick a berry → the colours change to that species.
3. Tap a zone → score, confidence, ripeness, last update, and why.
4. "Near me" list: best 10 zones within my radius.
5. Offline in the forest → last downloaded scores with a "last updated" label.
6. At a glance: is this score a guess (low confidence) or backed by reports?

**Definition of done (A1–A8)**

| # | Criterion |
|---|-----------|
| A1 | Map loads in < 3 s on 4G; `GET /zones` p95 < 300 ms for a 20 × 20 km view |
| A2 | Every forest zone has a score for every species, even with zero reports |
| A3 | 5 colour bands; low confidence shown faded/hatched; legend always visible |
| A4 | Zone sheet: score, confidence, ripeness, updated time, ≥ 2 reasons |
| A5 | Species switch re-colours the map in < 1 s |
| A6 | Offline: map, zones and last scores work in airplane mode |
| A7 | Scores refresh daily at 07:00 and within 5 min of a new trusted report |
| A8 | iOS 16+ and Android 10+ |

Not in 6.2: visit detection, feedback forms, push alerts (they are their own features).

## 3. Who owns what

| Person | Area | Repo folder | Key deliverables (D#) |
|--------|------|-------------|-----------------------|
| **Sayeem** | Repo, CI, QA, progress | root, `.github/` | D1 repo + branch rules, D2 dev setup, A1–A8 test runs |
| **Awais** | Data engineering | `data/` | D3 pilot bbox, D10 zones, D11 zone_species, D13 weather + GDD, D14 NDVI, D18 basemap |
| **Hassan** | Backend | `backend/` | D4 DB image, D5 FastAPI, D7 OpenAPI, D15 jobs, D17 reports, D21 auth |
| **Salman** | Mobile app | `app/` | D9 Expo + MapLibre build, map screen, zone sheet, offline |
| **Remon** | Scoring / ML | `ml/` | D16 phenology baseline → `zone_scores_current` |
| **Asmer** | Domain / ontology | `ontology/` | D6 species vocabulary, D11 rules review, D12 phenology |
| **Sabih** | Design + cloud | `docker/`, Figma | D8 Figma, D19 object storage, D20 VM + HTTPS |

Every dependency has a **stub** so nobody waits on anybody — see `docs/dependency-checklist.md`.

## 4. How it fits together

```
 OSM forest/mire ─┐
 Luke MS-NFI ─────┤  data/ (Awais)                       ml/ + backend/            app/ (Salman)
 FMI weather ─────┼─► zones · zone_species ──► ScoringService (07:00 daily ──► GET /api/v1/zones ──► MapLibre map
 Sentinel-2 NDVI ─┤   weather_daily · ndvi     + 5 min after a report)        /zones/{id} …        zone sheet
 Protomaps ───────┘   finland.pmtiles ─────────► zone_scores_current ─────────────────────────────► basemap from
                                                 (one row per zone × species)                      object storage
```

* **Scoring and serving are split.** Background jobs write `zone_scores_current`; the API
  only reads it, so a map request is one indexed query. The map never computes a score
  while a user waits.
* **The basemap never touches the API.** The app reads the PMTiles file straight from
  object storage.

## 5. The score (Remon + Hassan, deep dive §7)

For every zone × species:

1. **Ripeness** from growing-degree days (base 5 °C since 1 April) vs. species thresholds →
   `off_season · unripe · ripening · ripe · past`.
2. **Model score** `S_model = 100 · suitability · f_season · f_ndvi`
   (f_season: 0.2 / 0.6 / 1.0 / 0.3 / 0; f_ndvi = clip(1 + 2·NDVI anomaly, 0.7, 1.3)).
3. **Report score** from the last 21 days: rating (1–5★ → 0–100), weighted by reporter
   trust × e^(−age/4 days) × (1 if tied to a visit, else 0.5). `N_eff` = sum of weights.
4. **Fusion** `score = α·S_reports + (1 − α)·S_model`, α = N_eff / (N_eff + 3).
5. **Confidence** (first match wins): high if N_eff ≥ 3, or N_eff ≥ 1 and model band ≤ 25;
   medium if N_eff ≥ 1, or model band ≤ 35; else low. The v1 baseline band is fixed at 50,
   so baseline-only zones are always low. Weather older than 7 days drops it one level;
   off-season zones show grey "Out of season".

All constants live in one `scoring_config.py`, are unit-tested, and get tuned in the
November user tests.

## 6. Data (Awais — `data/`)

| Output | Table | What it is |
|--------|-------|------------|
| Zones | `zones` | H3 resolution-8 hexagons (≈ 0.57 km² here) that are ≥ 40 % forest or mire. Stable ids. |
| Habitat fit | `zone_species` | Suitability 0–1 per zone × species from forest type (rules reviewed by Asmer) |
| Weather | `weather_station_daily` + `zone_weather_weights` → view `weather_daily` | FMI daily obs, GDD, inverse-distance weighted to zones |
| Vegetation | `ndvi_obs` → view `ndvi_zone_latest` | Sentinel-2 NDVI per dekad + anomaly vs. 2021–2025 |
| Basemap | `finland.pmtiles` + `style.json` | Protomaps vector tiles, max zoom 14 |
| Stub | `data/test_zones.geojson` | 50 fake zones in the exact API shape — use it now |

Contract for consumers: `docs/data-contract.md`. Runbook: `data/README.md`.

## 7. API (Hassan — deep dive §5)

| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/species` | 4 species, names, colours, season windows |
| `GET /api/v1/zones?bbox=w,s,e,n&species=&zoom=` | GeoJSON zones with score, confidence, ripeness, updated_at (bbox ≤ 50 × 50 km; zoom < 10 → H3 res-6 parents) |
| `GET /api/v1/zones/near?lat=&lng=&radius_km=10&species=&limit=10` | Ranked "Near me" list |
| `GET /api/v1/zones/{id}` | Zone detail, all species |
| `GET /api/v1/zones/{id}/explanation?species=&lang=fi` | 2–4 plain-words reasons |
| `GET /api/v1/zones/{id}/history?species=&days=30` | Daily score for the sparkline |
| `GET /api/v1/zones/snapshot?bbox=&since=` | Gzipped offline package |

Responses are gzip + ETag/304; cache 5 min.

## 8. Tech stack

* **App:** Expo (dev client + EAS), TypeScript, `@maplibre/maplibre-react-native`, TanStack Query, Zustand, expo-sqlite + drizzle, i18next (FI/EN), Sentry.
* **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2 async + asyncpg + GeoAlchemy2, Alembic, APScheduler.
* **Database:** Postgres 17 + PostGIS 3.5 + h3-pg (`docker-compose.dev.yml`).
* **Data:** Python 3.12, geopandas, shapely, pyproj, h3 v4, rasterio, sentinelhub; go-pmtiles CLI.
* **Testing:** pytest, Jest + RN Testing Library, Maestro (E2E), k6 (load), Prism (API mock).
* Everything is free and open source. Pin exact versions; no upgrades mid-sprint.

## 9. Build plan

| Week | Dates | Goal |
|------|-------|------|
| 1 | 22–28 Oct | Remove blockers: repo, dev setup, DB image, OpenAPI, Expo + MapLibre build, pilot bbox, basemap, Figma |
| 2 | 29 Oct – 3 Nov | Map with stub data (Sprint 1 demo): real zones + weather in DB, `/zones` live, baseline scores |
| 3 | 4–10 Nov | Real data end to end: job runner, report fusion, explanations, NDVI, zone sheet, deploy |
| 4 | 11–17 Nov | Offline, polish, A1–A8 acceptance, first forest walk test |

## 10. Conventions

* **Coordinates:** store and serve EPSG:4326; measure areas/distances in **EPSG:3067** (ETRS-TM35FIN).
* **Ids:** zone id = uuid5 of its H3 index, so it never changes between rebuilds.
* **Species codes:** `bilberry`, `lingonberry`, `cloudberry`, `crowberry` (lower-case, English).
* **Branches:** `feat/<D#>-short-name`, `fix/…`, `data/…`; PR + 1 review + green CI into `main`.
* **Secrets:** only in `.env` (git-ignored); copy from `.env.example`.
* **Big files** (`*.pbf`, `*.pmtiles`, `*.tif`, `*.parquet`) never go in git → object storage.
* **Strings:** FI + EN from day one (`i18n/fi.json`, `i18n/en.json`).
* **Accessibility:** colour is never the only signal; colour-blind-safe palette; touch targets ≥ 44 pt.

## 11. Open questions

* Final colour palette and low-confidence style (hatch vs. fade) — Sabih
* H3 resolution 8 vs. 9 for a picker's sense of a "spot" — decide after the first walk test — Awais + Salman
* Show unsuitable species as score 0 or hide them? Proposal: hide — Asmer
* Public report list in the zone sheet: show from 3 reporters or hide in MVP? — Sayeem
* Zone count is ~4–5k, not 3.5k (smaller hexagons at this latitude) — re-check payload budgets — Hassan

## 12. Glossary

| Term | Meaning |
|------|---------|
| Zone | One H3 res-8 hexagon of forest or mire, the unit everything is scored on |
| GDD | Growing-degree days: Σ max(0, daily mean °C − 5) since 1 April; drives ripeness |
| NDVI | Vegetation greenness from Sentinel-2; anomaly = this year vs. 2021–2025 average |
| N_eff | Effective number of reports after trust/age/visit weighting |
| Dekad | 10-day period: 1–10, 11–20, 21–end of month |
| MS-NFI | Luke's Multi-Source National Forest Inventory rasters (tree species, site fertility) |
| PMTiles | Single-file vector tile archive the app reads directly from storage |
| Stub | Temporary stand-in so work isn't blocked (each D# has one) |
