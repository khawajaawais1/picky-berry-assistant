# Project context — Picky, the Berry Picker Assistant (BPA)

> **Read this first.** One-page brief for everyone on Team Picky, and for any AI assistant
> you paste it into. Details live in the source docs below; where they disagree, the
> **feature deep dive wins for its feature**, then the **MVP Architecture doc**, then this file.

| Source of truth                                     | Link                                               |
| --------------------------------------------------- | -------------------------------------------------- |
| MVP Architecture & Tech Stack (all 9 core features) | https://claude.ai/artifact/EnkBHuaL7DENBFutQMPEqw  |
| Feature 6.2 Deep Dive – Live Site Map               | https://claude.ai/artifact/5crUR5hVSYNFmu1GrDujp7  |
| Feature catalogue (all 20 features, status)         | [docs/features/README.md](docs/features/README.md) |
| Architecture summary                                | [docs/architecture.md](docs/architecture.md)       |
| Timeline & sprints                                  | [docs/sprints.md](docs/sprints.md)                 |
| Decisions (ADRs)                                    | [docs/decisions/](docs/decisions/)                 |

## 1. The product

A mobile app + cloud service that helps people in Finland find good wild-berry spots
at the right time. Pickers see a **live zone map** with a **yield score (0–100)**,
**confidence** and **ripeness**; the phone **detects visits** by GPS; pickers give
**feedback** that is **trust-weighted**; a **yield model** and **ontology rules** send
**explainable push alerts**; it all works **offline** and **privacy-first**.
Later, pickers can sell surplus to buyers in a **marketplace** (desired extra).

- **Users:** picker (core), buyer (marketplace extra), admin.
- **Pilot:** 60 × 60 km around Jyväskylä. **Species:** bilberry, lingonberry, cloudberry, crowberry.
- **Course:** TIES4570 CSDP, University of Jyväskylä. Design & implementation due
  **17 Dec 2026** (final demo); final defense **14 Jan 2027**.

## 2. Twenty functions in three levels

**9 core (MVP — all designed in the architecture doc)**

| ID  | Feature                                     | Lead owner                      |
| --- | ------------------------------------------- | ------------------------------- |
| 6.1 | Accounts and roles                          | Hassan                          |
| 6.2 | Live site map with yield score & confidence | Awais · Hassan · Salman · Remon |
| 6.3 | GPS visit detection (arrive / pick / leave) | Salman · Hassan                 |
| 6.4 | Feedback (rating + photo)                   | Hassan · Salman                 |
| 6.5 | Validation and trust weighting              | Hassan                          |
| 6.6 | Yield prediction                            | Remon · Awais                   |
| 6.7 | Reasoning and explainable push alerts       | Asmer · Sabih                   |
| 6.8 | Analytics (median stay time, trends)        | Hassan · Sayeem                 |
| 6.9 | Offline mode and privacy                    | Salman · Hassan                 |

**5 desired extras (after core is stable):** E1 marketplace with escrow · E2 video analysis
& fraud checks · E3 rewards, tiers, badge · E4 safety route back & SOS · E5 admin &
verification tools.

**6 future (not in the course scope, but the design leaves a door open):** F1 LLM assistant
(FI/EN) · F2 Planner & multi-agent backend · F3 Linked Data · F4 drone & wild-bee data ·
F5 cognitive zone judgement · F6 growing beyond Finland (microservices/Kubernetes).

Full table with modules, sprints and status: [docs/features/README.md](docs/features/README.md).

## 3. Team

| Person                                          | Role                        | Owns in the build                                                       | Repo folder                             |
| ----------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| **Mohammad Sayeem Sadat Hossain** (Sayeem)      | PM, QA & Speaker            | Repo, CI, integration, test plan, demo, homework reports                | root, `.github/`, `docs/`               |
| **Md Salman Hossan Prottoy** (Salman / Prottoy) | Frontend & Archivarius      | React Native app (iOS + Android): map, visits, feedback, dashboard      | `app/`                                  |
| **Rakibul Hasan Remon**                         | ML Engineer                 | YOLO on WildBe, yield prediction, model store                           | `ml/`, `backend/…/prediction`           |
| **Awais Amir**                                  | Data Engineer               | FMI weather, Sentinel-2 NDVI, zones, map tiles, pipelines               | `data/`, `backend/…/ingest`             |
| **Hassan Haider Syed**                          | Backend                     | FastAPI, PostgreSQL + PostGIS, accounts, zones, visits, feedback, trust | `backend/`                              |
| **Syed Ali Asmer**                              | Domain Research & Tech Lead | Berry ontology, knowledge graph (rdflib), alert rules                   | `ontology/`, `backend/…/reasoning`      |
| **Syed Sabih Ahmed Zaidi**                      | Frontend, Cloud & UI/UX     | Figma designs, Docker, cloud deploy, Firebase push, media               | `docker/`, `deploy/`, `backend/…/media` |

How we work: each person owns one layer, so nobody blocks anybody in the first weeks;
every dependency has a **stub**; weekly 15-min check-in; blockers in the team chat the same day.

## 4. Architecture in one picture

```
React Native app (Expo, MapLibre, SQLite outbox, geofences, FCM)
        │  HTTPS, JSON / GeoJSON / JSON-LD, JWT (picker · admin · buyer)
        ▼
Caddy ─► FastAPI modular monolith — ONE Docker image, 10 modules:
         accounts · zones · visits · feedback · trust · prediction ·
         reasoning · analytics · ingest · media     (+ jobs: APScheduler + Postgres queue)
        │
        ▼
PostgreSQL 17 + PostGIS + h3   ·   S3 bucket (photos, tiles, models, backups)
rdflib ontology + SPARQL rules (files in git)   ·   YOLO (ONNX) + XGBoost models
        ▲
External (free): FMI weather · Sentinel-2 (Copernicus) · OSM / Protomaps / NLS · Firebase FCM · WildBe
```

Rules that keep it simple and cheap (≈ €485/yr): one VM in the EU, one backend image,
no Kubernetes, no Redis/Celery, modules talk only through each other's `service.py`.
Summary: [docs/architecture.md](docs/architecture.md).

**What exists today:** the app and the `data/` package. Everything above the app in that picture —
the API, job runner, bucket, knowledge graph and models — is planned, and the app's own line is
ahead of itself too: it has MapLibre and a foreground location watch, but no geofences, SQLite
outbox or FCM. [docs/architecture.md](docs/architecture.md) keeps the layer-by-layer status.

## 5. Daily data → score → alert loop

```
05:30 ingest_weather (FMI)  ─┐
06:00 ingest_ndvi (S2)      ─┼─► 07:00 predict_yield (every zone × species)
       reports + visits     ─┘        └─► fuse with trust-weighted reports → zone_scores
                                          └─► run_reasoning (SPARQL rules) → throttle → FCM push
```

Score = α·S_reports + (1−α)·S_model with α = N_eff / (N_eff + 3). Every score and alert
stores **why**, so the app can explain it in plain words. Details: architecture doc §6.2
and the 6.2 deep dive §7.

**None of the loop runs yet:** the two ingests are CLI commands run by hand, and prediction,
reasoning and push are unbuilt. The app's map and zone screens read the committed 50-zone stub.

## 6. Timeline

| When                      | What                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Wed 21 Oct 2026, 18:00    | HW5 progress report (Moodle, group Picky)                                           |
| Sprint 1 · 21 Oct – 3 Nov | Foundations — everyone's first deliverable (see [docs/sprints.md](docs/sprints.md)) |
| Sprint 2 · 4 – 17 Nov     | Core: live map, visit detection, feedback, trust, yield model v1                    |
| Sprint 3 · 18 Nov – 1 Dec | Reasoning & alerts, analytics, offline, privacy; marketplace starts                 |
| Sprint 4 · 2 – 17 Dec     | User tests in Jyväskylä, fixes, extras, cloud deploy, **final demo 17 Dec**         |
| Weeks 49–50               | Thesis consultation with Prof. Vagan Terziyan                                       |
| 14 Jan 2027               | Final defense                                                                       |

## 7. Conventions (everyone)

- **Feature ids** everywhere: branches `feat/6.3-geofence-visits`, PR titles `[6.3] …`, issues labelled `feature:6.3`.
- **Coordinates:** store/serve EPSG:4326; measure in **EPSG:3067** (ETRS-TM35FIN).
- **Ids:** UUID everywhere; client-generated UUIDs are idempotency keys; zone id = uuid5(H3 index).
- **Species codes:** `bilberry`, `lingonberry`, `cloudberry`, `crowberry`.
- **API:** `/api/v1`, OpenAPI-first, errors as RFC 9457 problem JSON, the app's client is generated from OpenAPI.
- **Privacy:** raw GPS tracks never leave the phone; the server only knows zone + duration.
- **Secrets** only in `.env` (git-ignored). **Big files** (`.pbf`, `.pmtiles`, `.tif`, `.parquet`, model weights, images) go to object storage, not git.
- **Strings** FI + EN from day one. **Accessibility:** colour is never the only signal.
- **Decisions** that change a doc go into `docs/decisions/` as a short ADR.

How to contribute (branches, PRs, definition of done, starting a new feature): [CONTRIBUTING.md](CONTRIBUTING.md).

## 8. Licences to keep in mind

WildBe dataset is **CC BY-NC 4.0** (non-commercial, cite the paper) and Ultralytics YOLO is
**AGPL-3.0** — both fine for the course, both must be replaced before any paid launch.
OSM data is ODbL, FMI open data CC BY 4.0. Full list: [docs/licences.md](docs/licences.md).

## 9. Open decisions (sprint 1)

- Cloud provider: Hetzner Helsinki vs. CSC cPouta — Sabih
- GDD ripeness thresholds per species, with sources — Asmer; no threshold file exists yet, only the
  unverified zone-species rules in `data/config/zone_species_rules.yaml`
- Pilot bbox and H3 res 8 vs. 9 — Awais + Hassan; the bbox is written down in
  `data/config/pilot_area.yaml` (res 8, 3,000–6,300 expected zones) and still marked a proposal
- Visit thresholds — Salman, after the first field test; the app runs a stand-in (5 min dwell,
  30 min grace) against the team's 10 min / 5 min target, and the foreground watch's 50 m / 60 s
  budget is decided but unmeasured ([ADR-063](app/docs/adr/ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md),
  [docs/field-test.md](app/docs/field-test.md))
- Domain name, store accounts (Apple Developer for TestFlight), task board (GitHub Projects) — Sayeem
- Payload budget at the data config's 3,000–6,300 expected zones — Hassan (H3 res-8 cells are
  ≈ 0.57 km² at 62° N)

## 10. Glossary

| Term           | Meaning                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| Zone           | One H3 res-8 hexagon of forest or mire — the unit everything is scored on             |
| Yield score    | 0–100: how good a zone is for a species right now (a forecast, not a picker's answer) |
| Harvest rating | 1–5: how plentiful the picker found the berries on one visit; not a yield score       |
| Confidence     | high / medium / low — how much evidence backs the score                               |
| GDD            | Growing-degree days: Σ max(0, daily mean °C − 5) since 1 April; drives ripeness       |
| NDVI           | Satellite greenness (Sentinel-2); anomaly = this year vs. 2021–2025                   |
| N_eff          | Effective number of reports after trust × recency × visit weighting                   |
| Trust          | Per-user reputation 0–1 (Beta), starts at 0.5                                         |
| Outbox         | Phone-side queue of writes made offline, synced later with idempotency keys           |
| Stub           | Temporary stand-in so nobody is blocked                                               |
| ADR            | Architecture Decision Record — one short file per decision in `docs/decisions/`       |
