# Berry Picker Assistant – MVP Architecture & Tech Stack

**Team Picky · TIES4570 CSDP · Oct 22, 2026**

> Saved copy of the architecture document pasted into the chat, kept as context. The diagram in Section 2 and the score-fusion equations in Section 6.2 did not survive the paste; the fusion formulas are in the 6.2 deep dive (Section 7 there): `alpha = N_eff / (N_eff + 3)`, `S = round(alpha * S_reports + (1 - alpha) * S_model)`. Where numbers differ (confidence rules, report window), the 6.2 deep dive wins.

---

## 1. Scope, constraints and principles

The current MVP uses a React Native (Expo) app, a NestJS/TypeScript core API, a separate Python ML API, and PostgreSQL + PostGIS. The core API is deployed to Vercel, the database is managed by Supabase, and the ML API is hosted separately. The original single-VM proposal below is historical where it conflicts with the current implementation.

**In scope (designed in full) – the 9 core features:**

1. Accounts and roles
2. Live site map with yield score (0–100) and confidence
3. GPS visit detection (arrive / pick / leave)
4. Feedback (rating + photo)
5. Validation and trust weighting
6. Yield prediction
7. Reasoning and explainable push alerts
8. Analytics (median stay time, trends)
9. Offline mode and privacy

Out of scope for this document: the 4 desired extras (video analysis & fraud checks, rewards, safety route back & SOS, admin verification tools) and the 6 future items. Section 16 only names the hooks that keep them cheap to add later.

### Constraints we design against

| Constraint | What it means for the design |
|---|---|
| Course rule: simplest and cheapest | One backend image, free tiers, no Kubernetes, no microservices |
| Budget ≈ €485/yr | Cloud ≈ €360/yr; weather, maps and push must be free |
| 7 students, 8 weeks (21 Oct – 17 Dec) | Clear module boundaries so each owner works without blocking others |
| No berry season before the demo | Must be testable with WildBe images, historical weather and simulated GPS |
| WildBe is CC BY-NC 4.0 | Non-commercial use only; cite the paper; collect own images before any paid launch |
| Location data is personal data (GDPR) | Privacy by default; raw GPS tracks stay on the phone |

### Architecture principles

- **Modular monolith.** One deployable, internally split into modules with their own tables and service interfaces. A module can be extracted later without rewriting it.
- **Postgres does the heavy lifting.** Spatial queries, the job queue, analytics views and the model registry all live in one database. Fewer moving parts, one backup.
- **Offline-first app.** The phone works in the forest without signal and syncs when it can. Every write carries a client-generated UUID so retries are safe.
- **Explainable by design.** Every score and alert stores why (inputs + rule fired), so the app can show the reason in plain words.
- **Contract-first API.** The NestJS core API serves committed OpenAPI contracts; client types are generated from those contracts.

---

## 2. System overview

Read it top down: the phone does detection and offline work, the NestJS core API serves application routes, a separate Python service handles ML requests, and Postgres + PostGIS holds shared data. The app uploads photos and downloads map tiles directly from object storage; FCM delivers alerts to the phone.

*(Diagram not included in the pasted text.)*

---

## 3. Preferred tech stack

The current stack uses React Native, NestJS, PostgreSQL/PostGIS, a separate Python ML service, YOLO, gradient boosting, and FCM.

| Layer | Choice | Why this one |
|---|---|---|
| Mobile framework | React Native + Expo (latest stable SDK, TypeScript, dev builds via EAS) | No Mac needed for iOS builds (EAS cloud), config plugins for native modules, OTA updates for fixes |
| Maps | MapLibre React Native + OSM vector tiles (Protomaps PMTiles extract of Finland); NLS open background map as optional layer | Free, no API-key billing, real offline packs; react-native-maps cannot do offline vector maps well |
| Location | expo-location + expo-task-manager (background location + geofencing) | Background visit detection on iOS and Android from one API |
| App state | TanStack Query (server data, persisted cache) + Zustand (UI state) | Caching, retries and offline cache out of the box; tiny learning curve |
| App local DB | expo-sqlite + Drizzle ORM | Outbox queue, cached zones and visits for offline use |
| Forms / validation | react-hook-form + zod | Same validation rules on every screen |
| Push | Firebase Cloud Messaging via @react-native-firebase/messaging (FCM token on both iOS and Android) | Free; team decision; backend sends with Firebase Admin SDK |
| Core API language | TypeScript on Node.js 24 | Matches the implemented NestJS service and admin client |
| Core API framework | NestJS | Modular API, validation, and dependency injection |
| Database access / migrations | `pg` + Kysely and `node-pg-migrate` SQL migrations | Typed queries and versioned SQL changes |
| Database | PostgreSQL 17 + PostGIS 3.5 (+ h3 extension) | Spatial queries, job queue, analytics views in one engine |
| Background jobs | APScheduler (schedules) + Postgres job table with SKIP LOCKED (work queue) | No Redis, no Celery: one less service to run |
| Auth | JWT access token (15 min) + rotating refresh token (30 days), passwords hashed with Argon2 (pwdlib) | Standard, stateless, works offline until expiry |
| Knowledge graph | rdflib + OWL ontology in Turtle, rules as SPARQL; JSON-LD output via @context | Team decision; files live in git, no triple-store server to host |
| Berry detection | Ultralytics YOLO11n trained on WildBe, exported to ONNX, served with onnxruntime (CPU) | Small model, ~CPU-only inference on the server, no GPU bill |
| Yield prediction | XGBoost (quantile regression) + scikit-learn pipeline | Works on small tabular data; quantiles give us the confidence band |
| Training compute | Google Colab / Kaggle free GPU (or JYU resources) | Free; only the exported model file reaches the server |
| Data pipelines | fmiopendata (FMI WFS), Copernicus Data Space Sentinel Hub Statistical API, geopandas, h3 | Zone-level weather and NDVI with a few hundred lines of Python |
| Media storage | S3-compatible object storage (MinIO in dev, provider bucket in prod) via boto3 presigned URLs | Photos never pass through the API process; cheap |
| Packaging | Vercel for the core API; Docker Compose for local PostGIS development | Matches current deployment while retaining a reproducible local setup |
| Reverse proxy / TLS | Caddy | Automatic HTTPS with one config file |
| Hosting | One EU VM in Finland (e.g. Hetzner Helsinki or CSC cPouta if the course qualifies) | Data stays in the EU; fits the ≈ €360/yr cloud budget |
| CI/CD | GitHub Actions → image to GHCR → SSH deploy; EAS Build for app binaries | Free for a student repo |
| Quality | ruff + mypy + pytest (backend), ESLint + Prettier + Jest + RN Testing Library (app), Maestro (mobile E2E) | Fast, free, simple |
| Monitoring | Sentry free tier (app + backend), structured JSON logs, free uptime checker | See errors from testers' phones without asking them |
| Design | Figma (Sabih) | Already in the plan |

**Licence watch:** Ultralytics YOLO is AGPL-3.0 and WildBe is CC BY-NC 4.0. Both are fine for a course project. A paid launch needs an Ultralytics licence (or an Apache-licensed detector) and our own training images.

---

## 4. Mobile app (React Native)

The app is offline-first: it reads from its local SQLite cache, writes to a local outbox, and a sync engine talks to the API whenever the network is up. Owner: Salman (Prottoy); screens from Sabih's Figma.

### Folder layout (`app/`)

```
app/
  app/                 # expo-router screens (file-based routes)
    (auth)/login.tsx, register.tsx
    (tabs)/map.tsx, visits.tsx, alerts.tsx, profile.tsx
    zone/[id].tsx, visit/[id]/feedback.tsx
  src/
    api/               # generated OpenAPI client + TanStack Query hooks
    db/                # Drizzle schema, migrations, outbox
    sync/              # sync engine (push outbox, pull deltas)
    location/          # background task, geofences, visit state machine
    map/               # MapLibre setup, offline pack manager, layers
    features/          # map, visits, feedback, alerts, profile
    store/             # Zustand stores (UI, settings)
    i18n/              # fi + en strings
```

### Core screens (MVP)

| Screen | What it shows / does | Main API calls |
|---|---|---|
| Login / register | Email + password, consent screen, language | `POST /auth/register`, `/auth/login` |
| Map (home) | Zones coloured by yield score, species filter, confidence shading, "near me" list | `GET /zones?bbox=&species=` |
| Zone detail | Score, confidence, ripeness, last reports, "why this score" explanation | `GET /zones/{id}`, `/zones/{id}/explanation` |
| Active visit | Timer, zone, "I'm picking" toggle, end visit | Local only, synced later |
| Feedback | 1–5 rating per species, amount estimate, optional photo | `POST /visits/{id}/feedback`, presigned upload |
| Alerts | Inbox of push alerts with their reason | `GET /alerts` |
| My stats | My visits, median stay time, zones visited | `GET /me/analytics` |
| Profile & privacy | Sharing level, background location on/off, download offline area, export / delete my data | `PATCH /me/privacy`, `POST /me/export`, `DELETE /me` |

### Visit state machine (on device)

1. **Idle** → phone registers geofences for the 20 nearest zones (iOS caps an app at 20 regions; we refresh the set every 2 km moved).
2. **Entered** on geofence enter → start a dwell timer.
3. **Visiting** after 10 min inside (filters people driving through). Optionally the user taps "Start visit" to skip the wait.
4. **Left** on geofence exit + 5 min outside → visit ends; a local notification asks for feedback.
5. **Synced** when the outbox uploads the visit (zone id, start, end, duration). The raw GPS track never leaves the phone.

Thresholds (10 min, 5 min, 2 km) are config values, tuned in user tests.

### Offline mode

- **Map:** user downloads an "offline area" (MapLibre offline pack, default 30 km around home, ≈ 50–150 MB). Zone polygons and latest scores are stored in SQLite with the pack.
- **Writes:** visits, feedback and photos go to an outbox table with a client UUID. The sync engine retries with backoff; the server treats the UUID as an idempotency key.
- **Reads:** TanStack Query cache is persisted to storage; the map shows the cached score with a "last updated" label.
- **Conflicts:** none by design – users only create their own records; server-computed scores always win.

**Permissions flow:** ask for "while using" location first, explain the benefit, and only then ask for background location. The app still works (manual visit start) if the user says no.

---

## 5. Backend (NestJS core API)

The core API is a NestJS application with feature modules and a shared Postgres database. Python is used by the separately deployed ML service.

### Folder layout (`picky-server/`)

```
picky-server/
  src/
    main.ts            # NestJS app bootstrap
    auth/              # JWT authentication and roles
    zones/             # zone queries, details, scores
    visits/            # accepted/rejected visit records
    reports/           # feedback and reports
    analytics/         # personal and anonymous analytics
    jobs/              # PostgreSQL queue runner
    admin/             # audited operator endpoints
  migrations/          # node-pg-migrate SQL
  docs/openapi/        # committed API contracts
  test/                # PostGIS integration tests
ml/                    # separate Python inference API
```

### Modules

| Module | Responsibility | Key tables | Co-owner |
|---|---|---|---|
| accounts | Register, login, refresh, roles (picker, admin), consent, GDPR export / delete | users, refresh_tokens, consents, devices | Hassan |
| zones | Zone polygons (H3 cells), species per zone, map queries by bbox / radius, current scores | zones, zone_species, zone_scores | Hassan |
| visits | Store synced visits, validate zone + timing, idempotent upsert | visits | Hassan |
| feedback | Ratings, amount estimates, photo metadata, enqueue YOLO job | reports, photos | Hassan |
| trust | User trust score, report weights, consensus per zone | user_trust, report_weights | Hassan |
| prediction | Feature building, XGBoost inference, score fusion, model registry | zone_features, predictions, model_versions | Remon |
| reasoning | Load ontology, run rules, create alerts with explanation, send push | alerts, alert_rules_log | Asmer |
| analytics | Live personal stats and privacy-suppressed zone trends | mv_zone_daily, analytics_refresh | Hassan / Sayeem |
| ingest | Pull FMI weather and Sentinel-2 NDVI per zone, keep raw + aggregated | weather_daily, ndvi_obs, ingest_runs | Awais |
| media | Presigned upload / download URLs, thumbnails | photos (shared) | Sabih |

Request path: Vercel → NestJS routing and validation → feature service → `pg`/Kysely → PostgreSQL. Errors use the API's standard error envelope.

### Background work – no Redis, no Celery

- **Trigger:** the existing Vercel cron calls the internal runner; no in-process scheduler is used.
- **Work queue:** PostgreSQL's `jobs` table and lease-aware `claim_job()` coordinate work. Failed jobs retry with backoff and eventually become failed for an operator to inspect.

| Job | Trigger | What it does |
|---|---|---|
| detect_berries | New photo uploaded | YOLO on the photo → species + box count → attached to the report |
| recompute_zone_score | New report / visit, or nightly | Trust-weighted report score + model prediction → new zone_scores row |
| ingest_weather | Daily 05:30 | FMI observations + forecast for pilot area |
| ingest_ndvi | Daily 06:00 (skips cloudy scenes) | Sentinel-2 NDVI mean per zone |
| predict_yield | Daily 07:00 | Build features, run XGBoost for every zone × species |
| run_reasoning | After predict_yield, and after each new score | Rules → alerts → FCM push |
| refresh_analytics | After daily score finalization; lazily when the runner sees stale data | Refreshes `mv_zone_daily` concurrently |
| purge_personal_data | Nightly | Delete expired tokens, apply retention rules, finish account deletions |

If one day the queue gets heavy, the same image can run a second container with `ROLE=worker`. No code change needed.

---

## 6. The 9 core features, one by one

Each feature below names the screens, the backend module, the data it touches and the rule that makes it work. Together they cover all 9 core functions from the HW4 deck.

### 6.1 Accounts and roles

- Email + password sign-up with email verification link; phone/OTP login is deferred (SMS costs money).
- Roles: `picker` (default) and `admin`. `buyer` remains in the legacy enum but is currently unused.
- Tokens: 15-min JWT access token with `sub`, `role`, `exp`; 30-day refresh token stored hashed and rotated on every use (reuse = revoke all).
- Consent recorded at sign-up (terms, privacy policy version, background location yes/no).

### 6.2 Live site map with yield score and confidence

- Zones = H3 hexagons at resolution 8 (≈ 0.74 km² each) clipped to forest land in the pilot area around Jyväskylä. H3 gives stable ids, easy neighbours and cheap aggregation; the PostGIS polygon is stored for map drawing and point-in-zone tests.
- `GET /zones?bbox=…&species=bilberry` returns GeoJSON with score, confidence, ripeness, updated_at. One GiST-indexed query, < 100 ms.
- The app colours zones by score (5 bands) and fades them when confidence is low.
- **Score fusion** – the final score blends what pickers report with what the model predicts. The more trusted, recent reports a zone has, the more the reports count. *(Equations missing in the pasted text; see the note at the top.)* Here `r` is a rating scaled to 0–100 and `T` is the reporter's trust (6.5). Confidence = High if N_eff ≥ 3 and the model's 10–90 % prediction band is narrower than 25 points; Low if N_eff < 0.5 and the band is wider than 50; otherwise Medium. The "why this score" panel lists the top inputs (e.g. "4 recent reports, avg 4.2 ★; NDVI above normal; 60 growing-degree days since flowering").

### 6.3 GPS visit detection

- Detection runs on the phone (section 4 state machine); the server receives only `{client_id, zone_id, started_at, ended_at, manual}`.
- Server checks: zone exists, duration 5 min – 10 h, no overlapping visit for the same user, not in the future. Failing visits are stored with `status = rejected` and a reason.

### 6.4 Feedback

- After a visit: per-species rating 1–5, optional amount picked (litres), optional photo(s).
- Photo upload: app asks for a presigned URL → uploads straight to object storage → tells the API → `detect_berries` job runs YOLO.
- Feedback without a visit is allowed but gets half weight (cannot prove the user was there).

### 6.5 Validation and trust

- Every user has trust `T` in [0, 1], a Beta reputation: `T = (agree + 1) / (agree + disagree + 2)`. New users start at 0.5.
- A report *agrees* if its rating is within 1 star of the zone consensus from other users that week, or if YOLO finds the reported species in its photo.
- Simple fraud checks: visit-backed reports only count once per zone per day; more than 10 reports a day are flagged; a report from > 50 km away from the user's last visit is flagged.
- Trust is recomputed nightly and on each new report in the zone.

### 6.6 Yield prediction

- One XGBoost model per target "expected rating next 7 days" with species as a feature (see section 9).
- Runs daily for every zone × species; outputs median + 10 % and 90 % quantiles.
- Until enough real labels exist, a transparent phenology baseline (growing-degree days + NDVI anomaly + species season window) produces `S_model`, so the map is never empty.

### 6.7 Reasoning and explainable push alerts

- Rules live in the ontology repo as SPARQL (section 8). Example: IF zone within user's radius AND species in user's interests AND score ≥ 70 AND confidence ≠ Low AND ripeness = ripe THEN alert.
- Every alert stores `rule_id`, the facts that matched and a filled-in sentence: "Bilberries look ripe 2.1 km from you (score 78, high confidence, 4 recent reports)."
- Throttle: max 2 alerts per user per day, quiet hours 21:00–07:00, never the same zone twice in 3 days.

### 6.8 Analytics

- `GET /me/analytics` reads personal visits and reports live; `GET /analytics/zones/{id}` combines a live summary with a daily series from `mv_zone_daily`.
- Zone visit and report aggregates are independently hidden until at least three distinct, non-anonymized users contribute. Private users count; no identifiers are returned.
- `mv_zone_daily` stores daily visit/report counts and an internal median; daily median is never exposed. The existing `GET /admin/analytics` remains the admin overview.
- One materialized view is sufficient: per-user statistics are queried live, so `mv_user_stats` is not needed unless measured query latency justifies it.

### 6.9 Offline mode and privacy

- Offline: see section 4 (offline pack, SQLite cache, outbox, idempotent sync).
- Privacy levels per user: **private** (my data counts in scores but nobody sees my visits), **shared** (friends see my zones – extra, later), **public** (my reports show with my nickname). Default = private.
- Zone-level data only on the server; no raw tracks. Public report lists hide exact times (day only) and need ≥ 3 reporters before a zone's report list is shown.

---

## 7. Data model (PostgreSQL + PostGIS)

About 22 tables in one database, all UUID primary keys, all times in UTC (timestamptz), all geometry in EPSG:4326 for storage and EPSG:3067 (ETRS-TM35FIN) for distance and area maths. Hassan owns the schema; Asmer agrees the species and zone names with him in week 1.

### Core tables (simplified DDL)

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY, email citext UNIQUE NOT NULL, password_hash text NOT NULL,
  nickname text, role text NOT NULL DEFAULT 'picker',          -- picker | admin (buyer is unused)
  privacy_level text NOT NULL DEFAULT 'private',               -- private | shared | public
  alert_radius_km int DEFAULT 10, species_interest text[], lang text DEFAULT 'fi',
  created_at timestamptz DEFAULT now(), deleted_at timestamptz
);

CREATE TABLE species (code text PRIMARY KEY, name_fi text, name_en text, onto_iri text);
-- bilberry, lingonberry, cloudberry, crowberry (+ raspberry later)

CREATE TABLE zones (
  id uuid PRIMARY KEY, h3 h3index UNIQUE NOT NULL, name text,
  geom geometry(Polygon, 4326) NOT NULL, centroid geometry(Point, 4326),
  forest_type text, area_m2 int
);
CREATE INDEX ON zones USING gist (geom);

CREATE TABLE zone_scores (                                      -- history; latest = current
  zone_id uuid REFERENCES zones, species text REFERENCES species,
  computed_at timestamptz, score smallint, confidence text, ripeness text,
  s_reports smallint, s_model smallint, n_eff real, explanation jsonb,
  PRIMARY KEY (zone_id, species, computed_at)
);

CREATE TABLE visits (
  id uuid PRIMARY KEY,                                         -- = client UUID (idempotency)
  user_id uuid REFERENCES users, zone_id uuid REFERENCES zones,
  started_at timestamptz, ended_at timestamptz,
  duration_s int GENERATED ALWAYS AS (extract(epoch FROM ended_at - started_at)) STORED,
  manual bool, status text DEFAULT 'accepted', reject_reason text
);

CREATE TABLE reports (
  id uuid PRIMARY KEY, user_id uuid REFERENCES users, visit_id uuid REFERENCES visits,
  zone_id uuid REFERENCES zones, species text REFERENCES species,
  rating smallint CHECK (rating BETWEEN 1 AND 5), amount_l real,
  created_at timestamptz, weight real, flags text[]
);

CREATE TABLE photos (
  id uuid PRIMARY KEY, report_id uuid REFERENCES reports, object_key text,
  status text,                                                  -- uploaded | processed | failed
  detections jsonb, detected_species text, berry_count int, model_version text
);
```

Other tables: `refresh_tokens`, `consents`, `devices` (FCM tokens), `zone_species` (which species can grow where), `user_trust`, `weather_daily`, `ndvi_obs`, `zone_features`, `predictions`, `model_versions`, `alerts`, `jobs`, `ingest_runs`, `audit_log`.

### Data engineering tables (Awais)

| Table | Grain | Key columns |
|---|---|---|
| weather_daily | zone × day | t_mean, t_min, t_max, precip_mm, gdd5 (growing-degree days above 5 °C), source_station, is_forecast |
| ndvi_obs | zone × Sentinel-2 scene | obs_date, ndvi_mean, ndvi_std, valid_pixel_ratio (after cloud mask) |
| zone_features | zone × species × day | gdd_since_apr1, precip_30d, ndvi_latest, ndvi_anomaly, doy, reports_7d, last_year_score |
| ingest_runs | run | source, started_at, status, rows, error |

### Spatial queries we rely on

- Zones in view: `WHERE geom && ST_MakeEnvelope(:w, :s, :e, :n, 4326)`.
- Zones near a user: `ST_DWithin(ST_Transform(centroid, 3067), ST_Transform(:pt, 3067), :radius_m)`.
- Point in zone (server check): `ST_Contains(geom, :pt)`, or simply `h3_lat_lng_to_cell(:pt, 8)`.

**Retention:** visits and reports kept 3 years (needed for "last year" features), anonymised on account deletion (user_id → null). Refresh tokens 30 days. Raw photos 1 year, detections forever.

---

## 8. Knowledge graph, ontology and reasoning

The ontology is the shared vocabulary (species, zones, visits, reports, ripeness) and the home of the alert rules; Postgres stays the system of record. Owner: Asmer.

### How it works

- The Berry ontology (OWL, Turtle files in `ontology/`) defines classes and properties: `bpa:Species`, `bpa:Zone`, `bpa:Visit`, `bpa:Report`, `bpa:RipenessStage`, `bpa:hasSpecies`, `bpa:hasScore`, `bpa:floweringGDD`, `bpa:ripeGDD`, and links to Wikidata IRIs for each species.
- Species knowledge is facts in the ontology: season window, growing-degree days needed to ripen, typical habitat (pine heath, spruce mire), e.g. bilberry ripens after ≈ X GDD (value to be researched by Asmer and cited).
- Each reasoning run builds a small in-memory rdflib graph: ontology + today's facts for the zones involved (scores, ripeness, weather) pulled from Postgres. No triple-store server.
- Rules are SPARQL SELECT/CONSTRUCT queries stored as `.rq` files with an id, a version and a sentence template. The engine runs them, and each match becomes an alert candidate with the matched bindings as its explanation.
- Ripeness is inferred the same way: GDD since flowering vs. the species threshold → unripe / ripening / ripe / past.
- Alert candidates go through the throttle (6.7) and then to FCM.

### Example rule (`rules/ripe_nearby.rq`)

```sparql
PREFIX bpa: <https://picky.example/bpa#>
SELECT ?user ?zone ?species ?score ?distKm WHERE {
  ?user  bpa:interestedIn ?species ; bpa:alertRadiusKm ?radius .
  ?zone  bpa:hasSpeciesScore [ bpa:species ?species ; bpa:score ?score ;
                               bpa:confidence ?conf ; bpa:ripeness bpa:Ripe ] .
  ?pair  bpa:user ?user ; bpa:zone ?zone ; bpa:distanceKm ?distKm .   # precomputed in PostGIS
  FILTER (?score >= 70 && ?conf != bpa:Low && ?distKm <= ?radius)
}
```

Template: "{species} look ripe {distKm} km from you (score {score}, {confidence} confidence)."

**JSON-LD:** zone and species endpoints return a `@context` that maps fields to ontology IRIs, so the API is Linked-Data ready without extra work (supports the future Linked Data item).

**Scale note:** a run touches at most a few thousand zones × users in the pilot, well within rdflib's comfort zone. Distance pairs are computed in PostGIS first, so SPARQL never does geometry.

---

## 9. Machine learning

Two models: YOLO tells us what is in a photo, XGBoost tells us what a zone will yield. Both are trained offline on free GPUs and shipped to the server as versioned files. Owner: Remon.

### 9.1 Berry detection (YOLO on WildBe)

| Step | Detail |
|---|---|
| Data | WildBe from HuggingFace `FBK-TeV/WildBe` (3,516 images, 18,468 boxes, 4 classes: bilberry, cloudberry, crowberry, lingonberry). Keep the authors' split; add a small "phone photo" test set the team takes in October–November (leaves, unripe or frozen berries are fine). |
| Model | YOLO11n (nano) first; YOLO11s if accuracy is too low. Image size 640. |
| Training | Colab / Kaggle GPU, ~100 epochs, Ultralytics default augmentations + strong colour jitter (phone photos differ from drone images). |
| Metrics | mAP@50 and mAP@50-95 per class on the test split; report in `ml/reports/`. Target for MVP: mAP@50 ≥ 0.6 on WildBe test. |
| Export | ONNX (opset 17) + `model_card.md` (data, licence, metrics). Uploaded to the model store; row in `model_versions`. |
| Serving | onnxruntime CPU session loaded once at startup; the `detect_berries` job resizes to 640, runs, applies NMS, stores boxes + species + count. Expected 100–300 ms per photo on a 2-vCPU VM. |
| Use in app | Photo evidence raises report agreement (trust) and feeds `berry_count` into zone features. |

### 9.2 Yield prediction (XGBoost)

Target: mean trust-weighted rating of a zone × species over the next 7 days (0–100). Labels come from our own user tests and the phenology baseline until real season data arrives in summer 2027.

- **Features (from Awais's tables):** species, day of year, GDD since 1 April, precipitation last 30 days, frost days during flowering, NDVI latest + anomaly vs. zone's 5-year mean, forest type, last year's score, reports last 7 days, YOLO berry count.
- **Model:** XGBoost with quantile loss at 0.1 / 0.5 / 0.9 → median = `S_model`, band width = confidence input.
- **Validation:** time-based split (train on earlier dates, test on later ones), never random. Compare against the phenology baseline; ship only if it beats it.
- **Model store:** files in object storage under `models/{name}/{version}/`; `model_versions` row with metrics, training data hash and `is_active`. Switching model = flip `is_active`; rollback is one SQL update.

**Honest note for the demo:** without a berry season the yield model is trained on simulated + baseline labels. We say so on the slide and show the pipeline working end to end, not a claimed accuracy.

---

## 10. External data pipelines

Three free sources feed the zone features: FMI weather daily, Sentinel-2 NDVI every few days, and OSM/NLS map data once. Each pipeline is a plain Python module in `backend/app/modules/ingest/`, idempotent (re-running a day overwrites it), logged in `ingest_runs`. Owner: Awais.

| Source | Access | What we pull | Frequency | Lands in |
|---|---|---|---|---|
| FMI open data | WFS stored queries via fmiopendata (no key) | Daily min / mean / max temperature, precipitation from stations in the pilot bbox; point forecast for the next 7 days | Daily 05:30 | weather_daily |
| Sentinel-2 L2A via Copernicus Data Space | Sentinel Hub Statistical API (free account, OAuth client) | Mean / std NDVI per zone polygon, cloud-masked with the SCL band | Daily 06:00, keeps scenes with ≥ 60 % valid pixels | ndvi_obs |
| OSM (Protomaps build) | pmtiles extract of a Finland bbox | Vector basemap for the app, offline packs | Once, then quarterly | Object storage `tiles/finland.pmtiles` |
| NLS / Maanmittauslaitos | Open WMTS background map (free API key) | Topographic background layer (optional toggle) | Live | App only |
| Forest land mask | OSM landuse=forest / natural=wood (or Finnish Forest Centre open data later) | Which H3 cells are forest → become zones | Once | zones |

### Weather pipeline

1. Fetch stations inside the pilot bbox (Central Finland) and their daily observations for yesterday.
2. Map each zone to its nearest 3 stations; inverse-distance-weight the values.
3. Compute `gdd5 = max(0, t_mean − 5)` and cumulative GDD since 1 April.
4. Upsert into `weather_daily`; append the 7-day forecast rows with `is_forecast = true` (replaced daily).
5. Backfill once: 2021–2026 history so the model and baseline have past seasons.

### NDVI pipeline

1. Group zones into tiles (~50 zones per request) to stay inside the free processing quota.
2. Evalscript: `NDVI = (B08 − B04) / (B08 + B04)`, mask SCL classes for cloud, shadow, snow and water.
3. Statistical API returns mean, std and valid-pixel ratio per zone per scene date.
4. Store; compute the anomaly vs. the zone's 2021–2025 mean for the same 10-day window.
5. Backfill once: 2021–2026 growing seasons (May–September only, to save quota).

**Data quality checks (fail the run, don't write garbage):** temperature in −50..+40 °C, precipitation ≥ 0, NDVI in −1..1, at least 80 % of zones covered for weather, row counts logged. A failed run keeps yesterday's data and raises a Sentry alert.

**Pilot area:** a box around Jyväskylä (≈ 60 × 60 km) → roughly 3,000–4,000 forest H3 cells. Small enough for free quotas, big enough for user tests.

---

## 11. Key end-to-end flows

These three flows are the acceptance tests for the architecture: if they run end to end on the demo day, every core feature is exercised.

### Flow A – One visit, from forest to map (offline-tolerant)

1. Picker walks into zone 8a1f… (geofence enter). Phone starts the dwell timer.
2. After 10 min the app marks the visit active and shows the timer.
3. Picker leaves; 5 min later the visit ends and a local notification asks for feedback.
4. Picker rates bilberry 4 ★, 3 litres, takes one photo. No signal: all three go into the SQLite outbox.
5. Back in coverage, the sync engine sends `POST /visits` (client UUID), `POST /visits/{id}/feedback`, requests a presigned URL and uploads the photo.
6. API validates the visit, stores the report with `weight = trust × recency`, enqueues `detect_berries` and `recompute_zone_score`.
7. Worker runs YOLO: 46 bilberries found → report marked "agrees"; reporter's trust ticks up.
8. Zone score recomputed (more reports → higher α, higher confidence); `zone_scores` row with explanation written.
9. Other users' map refreshes on next query; `run_reasoning` checks whether anyone nearby should be alerted.

### Flow B – Morning alert

1. 05:30 / 06:00 ingest weather and NDVI → 07:00 `predict_yield` for every zone × species.
2. Scores fused, ripeness inferred from GDD vs. species threshold.
3. `run_reasoning` builds the rdflib graph for zones that changed, runs all active rules.
4. Throttle filters candidates (quiet hours, 2 per day, 3-day zone cooldown).
5. FCM push sent; alert stored with rule id and explanation; app opens the zone on tap.

### Flow C – Delete my account (GDPR)

1. User taps "Delete my data" and confirms with password.
2. API revokes tokens, sets `deleted_at`, enqueues `purge_personal_data`.
3. Job deletes email, nickname, devices, photos; reports and visits are anonymised (user_id → null) so zone history stays correct.
4. Confirmation email sent; done within 30 days (we target same night).

---

## 12. REST API contract (v1)

All endpoints live under `/api/v1`, speak JSON (GeoJSON for map data, JSON-LD on request via `Accept: application/ld+json`), and are documented automatically at `/docs`. Writes accept an `Idempotency-Key` header (the client UUID).

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` | none | Create picker account, record consent |
| `POST /auth/login` | none | Email + password → access + refresh token |
| `POST /auth/refresh` | refresh token | Rotate tokens |
| `POST /auth/logout` | user | Revoke refresh token |
| `GET /me` · `PATCH /me` | user | Profile, interests, alert radius, language |
| `PATCH /me/privacy` | user | Privacy level, background location flag |
| `POST /me/devices` | user | Register FCM token |
| `POST /me/export` | user | GDPR export (JSON zip by email link) |
| `DELETE /me` | user | Delete account (Flow C) |
| `GET /species` | none | Species list with names and IRIs |
| `GET /zones?bbox=&species=` | user | GeoJSON zones with current score, confidence, ripeness |
| `GET /zones/near?lat=&lng=&radius_km=` | user | Nearest zones list (also for geofence set) |
| `GET /zones/{id}` | user | Zone detail, per-species scores, recent public reports |
| `GET /zones/{id}/explanation?species=` | user | Inputs behind the score |
| `GET /zones/{id}/history?species=` | user | Score history (chart) |
| `POST /visits` | user | Upload a finished visit (idempotent) |
| `GET /visits` | user | My visits |
| `POST /visits/{id}/feedback` | user | Ratings + amount for one visit |
| `POST /reports` | user | Feedback without a visit (half weight) |
| `POST /media/upload-url` | user | Presigned PUT URL for a photo |
| `POST /media/{id}/complete` | user | Photo uploaded → start YOLO job |
| `GET /alerts` | user | My alerts with explanations |
| `GET /me/analytics` | user | Rolling personal visits, reports, and daily activity |
| `GET /analytics/zones/{id}` | user | Zone trends with independent minimum-user suppression |
| `POST /admin/analytics/refresh` | admin | Audited, deduplicated materialized-view refresh |
| `GET /admin/jobs` · `/admin/ingest-runs` · `/admin/models` | admin | Ops views; activate a model version |
| `GET /health` | none | Liveness + DB check |

### Example – `GET /zones?bbox=25.5,62.1,25.9,62.3&species=bilberry`

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "id": "6a3e…",
    "geometry": { "type": "Polygon", "coordinates": [[[25.71, 62.24], "…"]] },
    "properties": {
      "h3": "881f1d4a3bfffff", "species": "bilberry",
      "score": 78, "confidence": "high", "ripeness": "ripe",
      "updated_at": "2026-08-04T07:02:11Z"
    }
  }]
}
```

**Conventions:** cursor pagination (`?cursor=&limit=`), errors as RFC 9457 problem JSON, rate limit 60 writes/min per user (slowapi), API version in the path; breaking changes go to `/api/v2`.

---

## 13. Security, privacy and GDPR

Location history is sensitive personal data, so the core privacy move is architectural: raw GPS tracks never leave the phone; the server only knows which zone and for how long.

| Area | Measure |
|---|---|
| Transport | HTTPS only (Caddy, automatic Let's Encrypt), HSTS; app rejects plain HTTP |
| Authentication | Argon2id hashes, 15-min access JWT, rotating refresh tokens with reuse detection, login rate limit 5/min per IP + email |
| Authorisation | Role check dependency on every router; users can only read/write their own visits, reports, alerts (checked in the service, tested) |
| Tokens on device | Stored in expo-secure-store (Keychain / Keystore), never in AsyncStorage |
| Secrets | `.env` on the server only (never in git), GitHub Actions secrets for CI; rotate on team changes |
| Input | NestJS DTO validation, parameterized database queries, upload size limits, image MIME check, EXIF GPS stripped from photos |
| Data location | VM, database and bucket in the EU (Finland); Firebase used only for push tokens |
| Backups | Nightly `pg_dump` to object storage, 14 days kept, restore tested once per sprint |
| Dependencies | Dependabot + pip-audit / npm audit in CI |
| Logging | No passwords, tokens or coordinates in logs; user id only |

### GDPR checklist (MVP)

- [ ] Privacy notice (FI + EN) in the app and on a web page: what we collect, why, how long
- [ ] Lawful basis: consent for background location and push; contract for the account itself
- [ ] Data minimisation: zone + duration instead of tracks; nickname instead of real name
- [ ] Rights: export (`POST /me/export`), delete (`DELETE /me`), change privacy level any time
- [ ] Retention rules enforced by the nightly `purge_personal_data` job
- [ ] Records of processing kept in `docs/privacy.md`; test users sign a short consent form for user tests
- [ ] Ask JYU whether the course project needs its own data-protection review before user tests

---

## 14. Deployment, DevOps and cost

The core API runs on Vercel, PostgreSQL/PostGIS is managed by Supabase, and the Python ML API is deployed separately. Photos and other object assets use external object storage.

### `docker-compose.yml` (production, simplified)

```yaml
services:
  api:
    image: ghcr.io/team-picky/bpa-backend:${TAG}
    env_file: .env
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
    depends_on: [db]
    restart: unless-stopped
  db:
    image: postgis/postgis:17-3.5
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddy_data:/data]
    restart: unless-stopped
volumes: { pgdata: {}, caddy_data: {} }
```

The database needs the h3 extension too, so we build a small db image `FROM postgis/postgis` that adds h3-pg.

### Environments

| Env | Where | Data | Deployed by |
|---|---|---|---|
| local | Each laptop, `docker compose up` (+ MinIO) | Seed script: pilot zones, fake users, sample reports | Developer |
| staging = prod (MVP) | The one VM, `api.picky…` domain | Pilot data + test users | GitHub Actions on merge to main |
| app builds | EAS Build | Points at staging API | EAS on tag; testers via TestFlight / Play internal testing |

One cloud environment is enough for a course MVP; a separate staging VM is added only if the team starts breaking the demo.

### CI/CD pipeline (GitHub Actions)

- On every pull request: ruff, mypy, pytest (with a PostGIS service container), ESLint, Jest, OpenAPI client regenerated and diff-checked.
- Production schema changes are applied with the API's `node-pg-migrate` SQL migrations; Vercel deploys the NestJS core API and the ML service is deployed independently.
- On tag `app-v*`: `eas build` for iOS + Android, submit to internal tracks.
- Branch rule: `main` protected, 1 review required, CI must pass.

### Sizing and cost (approximate)

| Item | Size | ≈ Cost / year |
|---|---|---|
| VM (Finland / EU) | 2–4 vCPU, 4–8 GB RAM, 80 GB disk | within the ≈ €360 cloud budget |
| Object storage | < 100 GB (tiles ≈ 5 GB, photos, models, backups) | small part of the cloud budget |
| Domain | 1 | ≈ €10–15 |
| Apple Developer + Google Play | needed only for store/TestFlight distribution | ≈ €125 (from HW3) |
| FMI, Copernicus, OSM, NLS, FCM, Sentry, GitHub, EAS free tier | — | €0 |

Compare current prices for 2 providers in sprint 1 (e.g. Hetzner Helsinki vs. CSC cPouta through JYU) and record the choice in `docs/decisions/`.

---

## 15. Testing, quality and observability

We test without a berry season by replaying data: simulated GPS walks, WildBe photos, and historical weather/NDVI. Owner: Sayeem (test plan, QA), every module owner writes their own unit tests.

| Level | Tool | What it covers | Target |
|---|---|---|---|
| Unit | pytest, Jest | Score fusion, trust formula, visit validation, rule templates, GDD maths, sync engine | Every formula in this doc has a test |
| API / integration | pytest + httpx + PostGIS container | Every endpoint, auth rules (user A cannot read user B), idempotent retries | All endpoints in section 12 |
| Data pipelines | pytest with recorded FMI / Sentinel responses | Parsing, quality checks, idempotent re-runs | Each pipeline |
| ML | Fixed test split + metric threshold in CI (`ml/eval.py`) | YOLO mAP and yield model vs. baseline never regress silently | mAP@50 ≥ 0.6 |
| Reasoning | Fixture graphs → expected alerts | Each SPARQL rule fires / does not fire as written | Each rule |
| Mobile E2E | Maestro flows on emulator with mocked location (GPX route through 2 test zones) | Register → map → visit detected → feedback offline → sync | Flow A |
| Field tests | Team + 5–10 volunteers in Jyväskylä forests (sprint 4) | Real GPS, battery use, offline maps, usability | Battery < 5 %/hour with background tracking |

**Seed and demo data:** `scripts/seed.py` loads the pilot zones, 20 fake users with different trust levels, 200 reports across past seasons and WildBe photos, so the map looks alive on demo day.

### Observability

- **Errors:** Sentry in app and backend (free tier), release-tagged so we know which build broke.
- **Logs:** JSON logs (structlog) with request id; `docker compose logs` is enough at this size.
- **Health:** `/health` checks DB; a free uptime monitor pings it every 5 min.
- **Job health:** admin page lists failed / dead jobs and the last `ingest_runs`; Sentry alert on any pipeline failure.
- **Product metrics:** analytics views give daily active pickers, visits, reports and alerts sent – the numbers for the final report.

---

## 16. Hooks for extras and future features

None of these are built in the MVP; the design only leaves a door open for each, so adding them later needs no rewrite.

| Item | Type | Hook already in the MVP design |
|---|---|---|
| Video analysis & fraud checks | Extra | Media pipeline + job queue already handle uploads and async inference; `reports.flags` column exists |
| Rewards, tiers, badge | Extra | Trust score and visit/report history already stored; rewards = a new module reading them |
| Safety route back & SOS | Extra | Phone keeps the GPS track locally – route back can be drawn offline from it without any server change |
| Admin & verification tools | Extra | `admin` role, `/admin/*` routes and `audit_log` table exist |
| LLM assistant (FI/EN) | Future | Explanations and rules are structured data an LLM can read; add a `/assistant` route |
| Planner & multi-agent backend | Future | Modules talk through service interfaces, so an agent can call them as tools |
| Linked Data | Future | Ontology IRIs + JSON-LD `@context` already on the API |
| Drone & wild bee data | Future | New ingest pipeline writing extra `zone_features` columns |
| Microservices / Kubernetes beyond Finland | Future | Module boundaries + one image with `ROLE` switch = extract a service when real load demands it |
| Cognitive zone judgement | Future | Plugs into the same place as the yield model: reads `zone_features` and writes a score into the fusion step in 6.2 |

---

## 17. Ownership, risks and open decisions

### Who owns what in this architecture

| Person | Owns | First deliverable (3 Nov) |
|---|---|---|
| Sayeem | Repo, CI, integration, test plan, demo, reports | Repo + board, test plan v1 |
| Salman (Prottoy) | React Native app (section 4) | Expo skeleton, MapLibre map with test zones |
| Hassan | NestJS core API, DB schema, accounts, zones, visits, feedback, trust (5, 7) | Schema + login + `POST /visits` running locally |
| Remon | YOLO + yield model + model store (9) | WildBe downloaded, first YOLO run with mAP |
| Awais | Ingest pipelines, zones from H3 + forest mask, tiles (10) | Weather + NDVI for Central Finland in the DB |
| Asmer | Ontology, rules, reasoning module (8) | Ontology v1 + 3 rules as `.rq` files |
| Sabih | Figma, Docker, VM, Caddy, FCM, media module (14) | 5 core screens in Figma + backend Dockerfile |

### Top risks

| Risk | Impact | Mitigation |
|---|---|---|
| No berry season before 17 Dec | Yield model has no real labels | Phenology baseline + simulated labels; show pipeline, not accuracy claims |
| Background location killed by iOS/Android battery savers | Visits missed | Geofencing (OS-level, cheap) instead of continuous GPS; manual "Start visit" button |
| Schema not ready in week 1 | App and ML blocked | Hassan publishes the zone/visit schema and OpenAPI stub first; app uses fake zones until then |
| Copernicus free quota runs out | NDVI gaps | Small pilot area, May–Sept backfill only, cache everything |
| WildBe photos (drone) differ from phone photos | Weak detection in the app | Colour/scale augmentation + team's own phone test set |
| Team new to React Native / Expo | Slow start | Expo templates, dev build in week 1, pair sessions |
| Licences (WildBe NC, Ultralytics AGPL) | Blocks a paid launch | Fine for the course; note in report; replace before any commercial use |

### Open decisions (decide in sprint 1)

- [ ] Cloud provider: Hetzner Helsinki vs. CSC cPouta (ask JYU) – Sabih
- [ ] Exact GDD ripeness thresholds per species, with sources – Asmer
- [ ] Pilot area bbox and zone resolution (H3 res 8 vs. 9) – Awais + Hassan
- [ ] Visit thresholds (10 min dwell, 5 min exit) – confirm in first field test – Salman
- [ ] Domain name and store accounts (Apple Developer needed for TestFlight) – Sayeem
- [ ] Task board tool (GitHub Projects recommended: free, next to the code) – Sayeem
