# Backend API Brief: Feature 6.2 (NestJS + Supabase)

**Project:** Berry Picker Assistant (Team Picky, TIES4570 CSDP)
**Scope:** the NestJS API for feature 6.2, the live site map with yield score and confidence.
**Audience:** GitHub Copilot coding agent (and any human reading along).
**Where to put this file:** `docs/backend-api-brief.md`. Add one line to `.github/copilot-instructions.md`: "Read `docs/backend-api-brief.md` before any backend work."

---

## 0. Rules for the agent (read first)

1. **Do not invent.** If something is not in this brief or in the database, add a `TODO(question)` comment and list it in the PR description. Do not guess table names, column names, or species codes.
2. **Introspect the database before writing queries** (Phase 0). The schema was built by another teammate. Some facts (SRID, indexes, whether `weather_daily` is a view) are unknown to this brief.
3. **Never modify, drop or rename tables owned by the data engineer** (Section 5.1). Only add new tables through migrations (Section 5.3).
4. **Contract first.** Write `docs/openapi/zones.yaml` (Phase 1) before the controllers. The mobile developer builds against a Prism mock of that file. Any later change to a request or response shape updates the YAML in the same PR.
5. **Read path never computes scores.** Endpoints only read `zone_scores_current`. Scoring is a background job (a Python worker, built later). Until it exists, a seed script fills fake scores (Section 9).
6. **JSON is `snake_case`** everywhere (query params, bodies, GeoJSON properties). The Python side uses the same names.
7. **Small PRs, one phase each** (Section 12). Every PR must pass lint, unit tests and e2e tests, and update docs.
8. **No secrets in git.** Only `.env.example` with placeholders is committed.
9. **Free and simple.** Do not add Redis, Kafka, microservices or paid services. Postgres is the queue (Section 8).

---

## 1. Project context (short)

- Pickers open the app and see forest **zones** (H3 resolution-8 hexagons, about 0.74 km²) coloured by a **yield score 0-100** for a chosen berry species, a **confidence** (`high | medium | low`), a **ripeness** (`unripe | ripening | ripe | past | off_season`), a last-updated time and plain-words **reasons**.
- 4 species: bilberry, lingonberry, cloudberry, crowberry. Pilot area is about 60 x 60 km around Jyväskylä, about 3,500 zones.
- **Write path (background, not in this repo part):** ingest jobs bring weather and NDVI into Postgres. A scoring job computes one row per zone x species into `zone_scores_current` (daily 07:00 and within 5 minutes of a new trusted report).
- **Read path (this brief):** NestJS endpoints select from `zone_scores_current` and return GeoJSON with ETag and gzip.
- Basemap tiles (PMTiles) never touch this API; the app fetches them from object storage.
- Out of scope here: visit detection, feedback forms, push alerts, login screens (features 6.1, 6.3-6.5). This feature only **reads** reports they create.

### Acceptance criteria this API must support

| ID | Criterion |
|---|---|
| A1 | `GET /zones` answers in under 300 ms (p95) for a 20 x 20 km view; map loads in under 3 s on 4G |
| A2 | Every pilot zone has a score for every allowed species, even with zero reports (data check) |
| A4 | Zone detail and explanation give score, confidence, ripeness, updated time and at least 2 plain-words reasons |
| A7 | Scores refresh daily at 07:00 and within 5 min of a new trusted report (this API enqueues the job) |

---

## 2. Architecture and repo layout

Monorepo (already created by the project manager):

```
app/                  React Native (Expo) app: not your concern
backend/
  api/                NestJS API  <-- this brief
  worker/             Python worker + ML (later, Section 13)
data/                 ingest scripts (data engineer)
ontology/             knowledge graph (domain researcher)
docs/
  backend-api-brief.md
  openapi/zones.yaml  API contract (source of truth)
  contracts/          cross-language contracts (explanation JSON, job types)
  db/baseline_ingest.sql   schema-only dump of the ingest tables (for local/test DBs)
```

Runtime picture:

```
Mobile app ──HTTPS──> NestJS API ──SQL──> Supabase Postgres + PostGIS <──SQL── Python worker (later)
                         │                        ▲
                         └── INSERT INTO jobs ────┘   (Postgres is the only contract between API and worker)
```

**Rule:** the NestJS API and the Python worker never call each other on the user request path. They communicate through Postgres (tables and the `jobs` table). The single exception is an optional internal HTTP call described in Section 13.

---

## 3. Tech stack

Pin exact versions in the first PR (`package.json`, `.nvmrc`) and do not upgrade during the sprint.

| Concern | Choice |
|---|---|
| Runtime | Node.js (current LTS, pinned in `.nvmrc`), TypeScript strict mode |
| Framework | NestJS 11 with the default Express adapter |
| Database driver | `pg` (node-postgres) |
| Query builder | **Kysely** for ordinary queries; raw SQL via `sql` template for PostGIS parts |
| DB types | `kysely-codegen` generates `src/db/db.types.ts` from the live schema |
| Migrations | `node-pg-migrate` with plain `.sql` files |
| Validation | `class-validator` + `class-transformer` (global `ValidationPipe`, `whitelist: true`, `transform: true`) |
| OpenAPI | `docs/openapi/zones.yaml` is the source of truth; `@nestjs/swagger` UI at `/docs` in development only |
| H3 helpers | `h3-js` (for parent hexagon outlines; **do not rely on the `h3-pg` extension**, Supabase does not provide it as far as we know) |
| Auth | `@nestjs/jwt` (verify only), global guard, roles decorator |
| Security | `helmet`, CORS allow-list, `@nestjs/throttler` |
| Compression | `compression` middleware (gzip) |
| Logging | `nestjs-pino` with request id; optional `@sentry/node` |
| Tests | Jest, `supertest`, `testcontainers` (`postgis/postgis:17-3.5`), k6 for load |

Do **not** use Prisma (poor PostGIS geometry support) or TypeORM migrations (two sources of truth).

---

## 4. Environment and Supabase connection

`.env.example` (commit this; real `.env` is git-ignored):

```env
NODE_ENV=development
PORT=3000

# Supabase Postgres. Use the pooled or direct string from Dashboard -> Connect.
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres
DB_POOL_MAX=10
DB_SSL=require            # set to "disable" only for the local docker database

JWT_SECRET=change_me
DEV_AUTH_BYPASS=false     # true only in local .env; app must refuse to start if true and NODE_ENV=production

CORS_ORIGINS=http://localhost:8081
THROTTLE_LIMIT=300        # requests per minute per user or IP
THROTTLE_DISABLED=false   # true for k6 load tests only

MAX_BBOX_KM_DETAIL=50
MAX_BBOX_KM_GROUPED=150
```

### Which Supabase connection string to use

Confirm the exact strings in the Supabase dashboard (Connect panel); the options are:

| Option | Use for |
|---|---|
| **Direct connection** (port 5432) | A long-running server on a network with IPv6 |
| **Session pooler** (port 5432 on the pooler host, user `postgres.<project-ref>`) | **Default for this API and for migrations.** Works over IPv4 and supports everything a long-lived server needs |
| **Transaction pooler** (port 6543) | Serverless or very many short connections. Do not use for migrations. Never use named prepared statements |

Keep the pool small (`max` about 10); the free tier has a low connection limit.

### Connection code (`src/db/db.module.ts`)

```ts
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  // Supabase requires SSL. TODO: pin the Supabase CA certificate instead of rejectUnauthorized:false.
  ssl: process.env.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
});

// PostGIS may live in `public` or in Supabase's `extensions` schema. Cover both.
pool.on('connect', (client) => client.query('SET search_path TO public, extensions'));

export const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
```

Provide it as an injectable `DbService` with `onModuleDestroy` closing the pool. Add a health check that runs `SELECT 1`.

### Supabase specifics to respect

- **Row Level Security (RLS).** Supabase exposes tables in `public` through its auto-generated Data API. Every table (ours and the data engineer's) must have RLS **enabled with no policies**. Our API connects as the `postgres` role, which bypasses RLS, so this does not affect us, and it keeps the anon key from reading data. Migrations in Section 5.3 do this for new tables; list the existing tables in the PR so the data engineer can enable it for theirs.
- **Free projects pause after about a week of inactivity.** If the API cannot connect, check the project is not paused before debugging code.
- Do not use `supabase-js` in the API. We talk to Postgres directly.

---

## 5. Database

### 5.1 Existing tables (owned by the data engineer; read-only for you)

Relevant columns, taken from the real schema:

| Table | Key columns | Notes |
|---|---|---|
| `species` | PK `code`; `latin`, `name_fi`, `name_en`, `iri`, `colour`, `season_start_doy`, `season_end_doy` | 4 rows. Do not hard-code species codes; read them |
| `zones` | PK `id` uuid; unique `h3` (text); `h3_parent6`, `name`, `forest_type`, `forest_fraction`, `mire_fraction`, `habitat` (jsonb), `fertility_class`, `area_km2`, `centroid` (geometry), `geom` (geometry), `built_at`, `source_version` | About 3,500 rows. Full hexagon polygons |
| `zone_species` | PK (`zone_id`, `species`); `suitability` (0-1), `rules_version` | Which species can occur in which zone |
| `weather_stations`, `weather_station_daily`, `zone_weather_weights`, `weather_daily` | weather inputs | **The API does not read these.** Scoring (Python) does |

### 5.2 Phase 0: introspect before coding

Run these against Supabase (SQL editor) and save the output in `docs/db/introspection.md`. Later phases depend on the answers.

```sql
-- tables vs views
SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
```
```sql
-- indexes
SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1;
```
```sql
-- geometry SRIDs and types (the bbox query assumes 4326)
SELECT f_table_name, f_geometry_column, srid, type FROM geometry_columns;
```
```sql
-- where PostGIS is installed
SELECT extname, extnamespace::regnamespace AS schema FROM pg_extension WHERE extname = 'postgis';
```
```sql
-- row counts
SELECT (SELECT count(*) FROM zones) AS zones,
       (SELECT count(*) FROM zone_species) AS zone_species,
       (SELECT count(*) FROM species) AS species;
```
```sql
-- sample habitat json keys (used for reason codes)
SELECT DISTINCT jsonb_object_keys(habitat) FROM zones LIMIT 50;
```

**Already verified (checked in Supabase):**

- SRID is **4326** for `zones.geom` (POLYGON), `zones.centroid` (POINT) and `weather_stations.geom` (POINT). No `ST_Transform` is needed; the queries in Section 7 are correct as written.
- Indexes on `zones`: `zones_pkey` (id), `zones_h3_key` (unique, h3), `zones_h3_ix` (h3, redundant with the unique index but harmless), `zones_geom_gix` (**GiST on geom**) and `zones_parent_ix` (btree on h3_parent6). Do not create these again.
- Not present: a geography index on `centroid`, which `/zones/near` benefits from; migration `0002` adds it.

Still to run in Phase 0: the table/view check, the PostGIS schema check, row counts and the habitat keys query.

Also generate the schema-only dump used by local and test databases:

```bash
pg_dump --schema-only --no-owner --no-privileges --table='public.*' "$DATABASE_URL" > docs/db/baseline_ingest.sql
```

(The dump contains only ingest tables at that moment. Commit it once. Do not apply it to Supabase; those tables already exist there.)

### 5.3 New migrations (owned by the API)

Place plain SQL files in `backend/api/migrations/`, numbered so they sort (`0002_...`, `0003_...`). The baseline (`0001`) is the existing Supabase schema, not a file in this folder. Migrations run against Supabase through the session pooler.

**`0002_scoring_tables.sql`**

```sql
-- Up Migration

CREATE TABLE species_phenology (
  species text PRIMARY KEY REFERENCES species(code),
  gdd_flowering real, gdd_ripe real, gdd_past real,        -- base 5 C, from 1 April
  source_url text,
  verified boolean NOT NULL DEFAULT false
);

CREATE TABLE zone_scores (                                  -- full history
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  computed_at timestamptz NOT NULL DEFAULT now(),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence text NOT NULL CHECK (confidence IN ('high','medium','low')),
  ripeness text NOT NULL CHECK (ripeness IN ('unripe','ripening','ripe','past','off_season')),
  s_reports smallint, s_model smallint, n_eff real, band_width real,
  explanation jsonb NOT NULL,
  PRIMARY KEY (zone_id, species, computed_at)
);

CREATE TABLE zone_scores_current (                          -- latest row per zone x species; the map reads this
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence text NOT NULL CHECK (confidence IN ('high','medium','low')),
  ripeness text NOT NULL CHECK (ripeness IN ('unripe','ripening','ripe','past','off_season')),
  s_reports smallint, s_model smallint, n_eff real, band_width real,
  explanation jsonb NOT NULL,
  computed_at timestamptz NOT NULL,
  PRIMARY KEY (species, zone_id)                            -- species first: the map filters by species
);

CREATE TABLE jobs (                                         -- Postgres-as-queue (Section 8)
  id bigserial PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  dedupe_key text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  attempts int NOT NULL DEFAULT 0,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX jobs_dedupe_ix ON jobs (dedupe_key) WHERE status = 'queued';
CREATE INDEX jobs_pick_ix ON jobs (run_at) WHERE status = 'queued';

-- Provisional: features 6.4 / 6.5 define these properly. Keep columns minimal.
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                                    -- no FK until feature 6.1 defines users
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  visit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_trust (
  user_id uuid PRIMARY KEY,
  trust real NOT NULL DEFAULT 0.5 CHECK (trust BETWEEN 0 AND 1)
);

CREATE INDEX zs_hist_ix ON zone_scores (zone_id, species, computed_at DESC);
CREATE INDEX reports_zone_ix ON reports (zone_id, species, created_at DESC);

-- Already in Supabase (verified; created by the data engineer). Do NOT recreate them:
--   zones_geom_gix (GiST on geom), zones_parent_ix (btree on h3_parent6),
--   zones_h3_key / zones_h3_ix (btree on h3)
-- Missing, needed for /zones/near (ST_DWithin on geography):
CREATE INDEX IF NOT EXISTS zones_centroid_geog_ix ON zones USING gist ((centroid::geography));

-- Supabase: keep new tables private to the Data API (our postgres role bypasses RLS)
ALTER TABLE species_phenology ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_scores_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust ENABLE ROW LEVEL SECURITY;

-- Down Migration
DROP INDEX IF EXISTS zones_centroid_geog_ix;
DROP TABLE user_trust, reports, jobs, zone_scores_current, zone_scores, species_phenology;
```

`scripts/check-a2.sql` (acceptance A2): zone x species pairs allowed by `zone_species` that have no `zone_scores_current` row.

```sql
SELECT zs.zone_id, zs.species
FROM zone_species zs
LEFT JOIN zone_scores_current c ON c.zone_id = zs.zone_id AND c.species = zs.species
WHERE c.zone_id IS NULL;   -- must return 0 rows
```

### 5.4 Decision recorded: which species appear on a zone

Open question from the design doc: show zones where a species is unsuitable (score 0) or hide them? **Working assumption: hide.** The scorer writes `zone_scores_current` only for rows in `zone_species` with `suitability > 0`, and the API only returns zones that have a current row for the requested species. Isolate this in one repository function so it is easy to change.

---

## 6. API conventions

- **Base path:** `/api/v1`. `GET /health` is the only route outside it.
- **Format:** JSON, `snake_case`, UTF-8. Timestamps ISO 8601 UTC (`2026-11-03T05:02:11.000Z`).
- **Coordinates:** WGS84. Query params use `lat` / `lng` as numbers; `bbox=west,south,east,north`.
- **Express ETag:** disable the automatic one (`app.set('etag', false)`) and set ETags manually where specified.
- **Error format** (all errors, including validation):

```json
{
  "error": {
    "code": "BBOX_TOO_LARGE",
    "message": "Area is too large. Zoom in.",
    "details": { "max_km": 50, "width_km": 71.3, "height_km": 40.2 }
  },
  "request_id": "b6f1c3e0-..."
}
```

| Status | `error.code` | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `NOT_FOUND` | Unknown zone id or species |
| 422 | `VALIDATION_ERROR` | Bad or missing query/body value |
| 422 | `BBOX_TOO_LARGE` | Bbox exceeds the limit for the mode |
| 429 | `RATE_LIMITED` | Throttled |
| 500 | `INTERNAL` | Anything else (log the stack, return a generic message) |

Implement with one global exception filter. Every response carries `x-request-id`.

- **Auth:** a global `JwtAuthGuard` protects everything except routes marked `@Public()` (`/health`). Roles come from the JWT claim `role` (`picker | buyer | admin`) and are enforced with `@Roles('admin')`.
- **Species parameter:** validated against `species.code` (list cached in memory for 1 hour). Unknown code gives `422 VALIDATION_ERROR`.
- **Caching headers:** `Cache-Control: private, max-age=<seconds from the table>` plus `ETag` where noted.

---

## 7. Endpoints

### 7.1 Overview

| Method and path | Auth | Returns | Cache |
|---|---|---|---|
| `GET /health` | public | `{ "status": "ok", "db": "ok" }` | none |
| `GET /api/v1/species` | any | 4 species | 1 day |
| `GET /api/v1/zones` | any | GeoJSON zones in a bbox | 5 min + ETag |
| `GET /api/v1/zones/near` | any | Ranked list of nearby zones | 5 min |
| `GET /api/v1/zones/snapshot` | any | Offline snapshot, all species | ETag |
| `GET /api/v1/zones/{id}` | any | Zone detail | 5 min + ETag |
| `GET /api/v1/zones/{id}/explanation` | any | Reasons in FI/EN | 5 min |
| `GET /api/v1/zones/{id}/history` | any | Daily score series | 1 hour |
| `POST /api/v1/admin/scores/recompute` | admin | `202` with job id | none |

**Route order matters in Nest:** declare `near` and `snapshot` **before** `:id` in the controller, otherwise they match as ids.

### 7.2 `GET /api/v1/species`

Response `200`:

```json
{
  "species": [
    {
      "code": "bilberry",
      "name_fi": "Mustikka",
      "name_en": "Bilberry",
      "latin": "Vaccinium myrtillus",
      "colour": "#5b4a9e",
      "season_start_doy": 190,
      "season_end_doy": 260
    }
  ]
}
```

(The values above are examples. Return what is in the table; use the real codes.)

### 7.3 `GET /api/v1/zones`

Query params:

| Param | Type | Rules |
|---|---|---|
| `bbox` | `w,s,e,n` | Required. Four finite numbers, `w < e`, `s < n`, valid lat/lng ranges |
| `species` | string | Required. Must exist |
| `zoom` | number | Optional, default 12. **`zoom < 10` selects grouped mode** |

**Size limit (computed server-side):**

```ts
const KM_PER_DEG = 111.32;
export function bboxKm([w, s, e, n]: number[]) {
  const midLat = ((s + n) / 2) * Math.PI / 180;
  return { width: (e - w) * KM_PER_DEG * Math.cos(midLat), height: (n - s) * KM_PER_DEG };
}
// detail mode: both <= MAX_BBOX_KM_DETAIL (50); grouped mode: both <= MAX_BBOX_KM_GROUPED (150)
```

> **Deviation to confirm with the team:** the design doc says bbox must be <= 50 x 50 km and also describes a zoomed-out mode for zoom < 10. A phone screen at zoom 9 or lower is wider than 50 km, so a single 50 km limit would make zoomed-out mode unreachable. This brief applies 50 km to detail mode and 150 km to grouped mode (about 100 parent cells in the whole pilot area, so the payload stays tiny). Make both limits env-configurable.

**Detail mode (`zoom >= 10`)**, one feature per zone:

```sql
SELECT z.id, z.h3, z.name,
       ST_AsGeoJSON(z.geom, 6)::json AS geometry,
       c.score, c.confidence, c.ripeness, c.computed_at
FROM zones z
JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
WHERE z.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326);
```

**Grouped mode (`zoom < 10`)**, one feature per `h3_parent6` with the **maximum** score of its children:

```sql
SELECT DISTINCT ON (z.h3_parent6)
       z.h3_parent6 AS h3, c.score, c.confidence, c.ripeness, c.computed_at,
       count(*) OVER (PARTITION BY z.h3_parent6)::int AS zone_count
FROM zones z
JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
WHERE z.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
ORDER BY z.h3_parent6, c.score DESC, c.computed_at DESC;
```

Build each parent polygon in Node with `h3-js`: `cellToBoundary(h3, true)` returns `[lng, lat]` pairs (GeoJSON order); close the ring by repeating the first point. Grouped features have `id` = the parent H3 string (not a UUID) and `properties.grouped = true`. The app must not open a zone sheet for grouped features.

**Response `200` (GeoJSON `FeatureCollection` with a `meta` foreign member):**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "3f2c9a1e-0d3b-4c1e-9a55-1c6f2a7e9b10",
      "geometry": { "type": "Polygon", "coordinates": [[[25.3, 62.2], "..."]] },
      "properties": {
        "h3": "881260...",
        "name": "Laajavuori 3",
        "species": "bilberry",
        "score": 78,
        "confidence": "high",
        "ripeness": "ripe",
        "updated_at": "2026-11-03T05:02:11.000Z"
      }
    }
  ],
  "meta": { "species": "bilberry", "mode": "detail", "count": 540, "bbox": [25.1, 62.1, 25.5, 62.3], "computed_at": "2026-11-03T05:02:11.000Z" }
}
```

**Caching and ETag:**

1. Run a cheap query first: `SELECT max(c.computed_at), count(*) ... same JOIN and WHERE`.
2. ETag = weak hash of `species | mode | bbox string | max(computed_at) | count`.
3. If `If-None-Match` matches, return `304` without running the geometry query.
4. Otherwise run the full query, set `ETag` and `Cache-Control: private, max-age=300`.
5. Enable gzip on the whole app (`compression`).

Targets: about 540 zones for a 20 x 20 km view, about 100 KB raw and about 25 KB gzipped. Raw JSON must stay under 300 KB per request.

### 7.4 `GET /api/v1/zones/near`

Query: `lat`, `lng` (required), `species` (required), `radius_km` (default 10, max 50), `limit` (default 10, max 50).

Sorted by **score descending, then distance ascending**. Zones with `ripeness = 'off_season'` are excluded (they are not "best" spots).

```sql
SELECT z.id, z.name, z.h3,
       c.score, c.confidence, c.ripeness, c.computed_at,
       ST_Distance(z.centroid::geography, p.g) / 1000.0 AS distance_km
FROM zones z
JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography AS g) p
WHERE c.ripeness <> 'off_season'
  AND ST_DWithin(z.centroid::geography, p.g, $4)       -- $4 = radius in metres
ORDER BY c.score DESC, distance_km ASC
LIMIT $5;
```

Response:

```json
{
  "species": "bilberry",
  "origin": { "lat": 62.24, "lng": 25.75 },
  "radius_km": 10,
  "zones": [
    { "id": "...", "name": "Laajavuori 3", "h3": "...", "distance_km": 2.1,
      "score": 78, "confidence": "high", "ripeness": "ripe", "updated_at": "..." }
  ]
}
```

Round `distance_km` to 1 decimal in the response.

### 7.5 `GET /api/v1/zones/snapshot`

For offline use. Query: `bbox` (required, up to 60 x 60 km), `since` (optional ISO timestamp).

- Without `since`: every zone in the bbox with **all** species scores.
- With `since`: only zone x species rows where `c.computed_at > since`. Each feature carries only the changed species in `scores`; the client merges them into its local copy.

```sql
SELECT z.id, z.h3, z.name, z.forest_type,
       ST_AsGeoJSON(z.geom, 6)::json AS geometry,
       jsonb_object_agg(c.species, jsonb_build_object(
         'score', c.score, 'confidence', c.confidence,
         'ripeness', c.ripeness, 'updated_at', c.computed_at)) AS scores
FROM zones z
JOIN zone_scores_current c ON c.zone_id = z.id
WHERE z.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
  AND ($5::timestamptz IS NULL OR c.computed_at > $5)
GROUP BY z.id;
```

Response: GeoJSON `FeatureCollection`; each feature has `properties: { h3, name, forest_type, scores: { "<species>": { score, confidence, ripeness, updated_at } } }` and `meta: { generated_at, since, bbox, count }`. Use ETag (same approach as 7.3) and gzip. Size target: at most 150 MB per 30 km area including map tiles, and the snapshot itself should be a few MB at most.

### 7.6 `GET /api/v1/zones/{id}`

Path `id` must be a UUID. Optional `lat`/`lng` add `distance_km` to the response (for the "2.1 km" label).

```json
{
  "id": "3f2c9a1e-...",
  "h3": "881260...",
  "name": "Laajavuori 3",
  "forest_type": "spruce",
  "area_km2": 0.74,
  "centroid": { "lat": 62.2431, "lng": 25.7482 },
  "distance_km": 2.1,
  "scores": [
    { "species": "bilberry", "score": 78, "confidence": "high", "ripeness": "ripe", "updated_at": "..." },
    { "species": "lingonberry", "score": 41, "confidence": "medium", "ripeness": "ripening", "updated_at": "..." }
  ],
  "reports_7d": [
    { "species": "bilberry", "count": 4, "avg_rating": 4.2 }
  ]
}
```

- Use `ST_Y(centroid)` for lat and `ST_X(centroid)` for lng.
- `scores`: all current rows for the zone (species the zone does not support are simply absent, per Section 5.4).
- `reports_7d`: `count(*)` and `round(avg(rating), 1)` over the last 7 days. **Privacy default:** `avg_rating` is `null` unless there are reports from at least 3 distinct users (open question for the project manager; keep the threshold in config).
- ETag = hash of `max(computed_at)` for the zone plus the report count. `404 NOT_FOUND` if the zone does not exist.

### 7.7 `GET /api/v1/zones/{id}/explanation`

Query: `species` (required), `lang` (`fi` | `en`, default `en`).

Reads `zone_scores_current.explanation` (JSON, Section 7.10) and renders each reason code into a sentence with numbers filled in.

```json
{
  "zone_id": "3f2c9a1e-...",
  "species": "bilberry",
  "lang": "fi",
  "reasons": [
    { "code": "ripe_by_gdd", "text": "Kausi on ollut riittävän lämmin: marjat ovat kypsiä (812 lämpösummayksikköä, kypsyys alkaa 780)." },
    { "code": "recent_reports_high", "text": "4 poimijaa arvioi paikan tällä viikolla keskiarvolla 4.2★." },
    { "code": "good_habitat", "text": "Hyvä kasvupaikka tälle marjalle (sopivuus 90 %)." }
  ],
  "inputs": { "gdd_since_apr1": 812, "gdd_ripe": 780, "reports_7d": 4, "avg_rating_7d": 4.2, "suitability": 0.9 },
  "model_version": "baseline-0.1",
  "computed_at": "2026-11-03T05:02:11.000Z"
}
```

Rules:

- Reasons are stored as **codes, never sentences**. All translation lives in this one service (`src/zones/explanation/templates.ts`) so the alert feature can reuse it.
- Unknown code: log a warning and return a generic fallback sentence. Never fail the request.
- Format numbers: degree-days as integers, ratings with 1 decimal, `suitability_pct = round(suitability * 100)`.
- The acceptance criterion needs **at least 2 reasons**. If the stored explanation has fewer, log a warning (the scorer is at fault) and still return what exists.

**Draft template catalogue.** These texts are drafts: the domain researcher must review the wording, and a native Finnish speaker should proofread.

| Code | English | Finnish |
|---|---|---|
| `ripe_by_gdd` | The season has been warm enough: berries are ripe here ({gdd_since_apr1} degree-days so far, ripe from {gdd_ripe}). | Kausi on ollut riittävän lämmin: marjat ovat kypsiä ({gdd_since_apr1} lämpösummayksikköä, kypsyys alkaa {gdd_ripe}). |
| `ripening_by_gdd` | Berries are ripening ({gdd_since_apr1} of {gdd_ripe} degree-days needed). | Marjat ovat kypsymässä ({gdd_since_apr1}/{gdd_ripe} tarvittavasta lämpösummasta). |
| `unripe_by_gdd` | Too early: berries are not ripe yet ({gdd_since_apr1} of {gdd_ripe} degree-days). | Liian aikaista: marjat eivät ole vielä kypsiä ({gdd_since_apr1}/{gdd_ripe} lämpösummasta). |
| `past_by_gdd` | The season is past its peak here ({gdd_since_apr1} degree-days). | Sesongin huippu on ohi täällä ({gdd_since_apr1} lämpösummayksikköä). |
| `off_season` | Out of season for this berry. | Tämän marjan sesonki ei ole käynnissä. |
| `recent_reports_high` | {reports_7d} pickers rated it {avg_rating_7d}★ this week. | {reports_7d} poimijaa arvioi paikan tällä viikolla keskiarvolla {avg_rating_7d}★. |
| `recent_reports_low` | Recent reports are weak: {reports_7d} pickers rated it {avg_rating_7d}★ this week. | Tuoreet raportit ovat heikkoja: {reports_7d} poimijaa arvioi keskiarvolla {avg_rating_7d}★. |
| `no_reports_baseline` | No recent reports, so this score is an estimate from weather and habitat. | Tuoreita raportteja ei ole, joten pisteet perustuvat säähän ja kasvupaikkaan. |
| `good_habitat` | Good habitat for this berry (habitat fit {suitability_pct}%). | Hyvä kasvupaikka tälle marjalle (sopivuus {suitability_pct} %). |
| `moderate_habitat` | Fair habitat for this berry (habitat fit {suitability_pct}%). | Kohtalainen kasvupaikka tälle marjalle (sopivuus {suitability_pct} %). |
| `poor_habitat` | Weak habitat for this berry (habitat fit {suitability_pct}%). | Heikko kasvupaikka tälle marjalle (sopivuus {suitability_pct} %). |
| `ndvi_good` | Vegetation is greener than usual this year. | Kasvillisuus on tänä vuonna tavallista vehreämpää. |
| `ndvi_poor` | Vegetation looks weaker than usual this year. | Kasvillisuus näyttää tänä vuonna tavallista heikommalta. |
| `weather_stale` | Weather data is more than 7 days old, so confidence is lowered. | Säätiedot ovat yli 7 päivää vanhoja, joten luotettavuutta on laskettu. |

### 7.8 `GET /api/v1/zones/{id}/history`

Query: `species` (required), `days` (default 30, max 365). One point per day, taking the **latest** score of each day in the `Europe/Helsinki` time zone.

```sql
SELECT DISTINCT ON (d) d AS date, score, confidence
FROM (
  SELECT (computed_at AT TIME ZONE 'Europe/Helsinki')::date AS d, score, confidence, computed_at
  FROM zone_scores
  WHERE zone_id = $1 AND species = $2
    AND computed_at >= now() - make_interval(days => $3)
) t
ORDER BY d, computed_at DESC;
```

Response: `{ "zone_id", "species", "days", "points": [ { "date": "2026-11-01", "score": 74, "confidence": "high" } ] }`. A zone with no history returns an empty `points` array, not 404.

### 7.9 `POST /api/v1/admin/scores/recompute`

Admin only. Body (all optional): `{ "zone_id": "<uuid>", "species": "<code>" }`.

- With `zone_id`: enqueue job `recompute_zone_score` (dedupe key `recompute:<zone_id>`).
- Without: enqueue `recompute_all` (dedupe key `recompute_all`).
- Response `202`: `{ "job_id": 123, "status": "queued", "deduplicated": false }`. If an equivalent queued job already exists, return its id with `deduplicated: true`.

### 7.10 Explanation JSON (cross-language contract)

Stored by the scorer in `zone_scores.explanation` and `zone_scores_current.explanation`. Copy to `docs/contracts/explanation.v1.md`. **Changing it requires a version bump and agreement with the ML engineer.**

```json
{
  "version": 1,
  "inputs": {
    "gdd_since_apr1": 812, "gdd_ripe": 780, "ndvi_anomaly": 0.04,
    "reports_7d": 4, "avg_rating_7d": 4.2, "n_eff": 2.6,
    "suitability": 0.9, "s_model": 66, "s_reports": 84, "alpha": 0.46
  },
  "reasons": ["ripe_by_gdd", "recent_reports_high", "good_habitat"],
  "model_version": "baseline-0.1"
}
```

---

## 8. Job queue contract (Postgres as the queue)

The API only **enqueues**. The Python worker (later) claims and runs jobs.

**Job types**

| Type | Payload | Dedupe key | Enqueued by |
|---|---|---|---|
| `recompute_zone_score` | `{ "zone_id": "<uuid>", "species": "<code>?" }` | `recompute:<zone_id>` | API when a trusted report is stored; admin endpoint |
| `recompute_all` | `{}` | `recompute_all` | Admin endpoint; the worker's own 07:00 schedule |
| `validate_report` | `{ "report_id": "<uuid>" }` | `validate:<report_id>` | API when a report arrives (feature 6.4/6.5, later) |

**Enqueue helper** (`src/jobs/jobs.service.ts`), de-duplicating so 10 reports in a minute produce 1 job:

```sql
INSERT INTO jobs (type, payload, dedupe_key)
VALUES ($1, $2::jsonb, $3)
ON CONFLICT (dedupe_key) WHERE status = 'queued' DO NOTHING
RETURNING id;
-- if no row returned: SELECT id FROM jobs WHERE dedupe_key = $3 AND status = 'queued'  (deduplicated = true)
```

**Worker claim query** (for reference; the Python side implements it):

```sql
UPDATE jobs SET status = 'running', locked_at = now(), attempts = attempts + 1
WHERE id = (
  SELECT id FROM jobs WHERE status = 'queued' AND run_at <= now()
  ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 1
)
RETURNING *;
```

**Score write contract (worker side):** in one transaction, insert the history row into `zone_scores` and upsert `zone_scores_current` (`ON CONFLICT (species, zone_id) DO UPDATE`). The API never writes scores except in the dev seed script.

---

## 9. Seed data (so the app can be built before the real scorer exists)

`scripts/seed-dev-scores.ts` (run with `npm run seed:scores`):

- For every `zone_species` row with `suitability > 0`, write a deterministic fake score derived from a hash of `zone_id + species` and the `suitability`: score 0-100, a confidence, a ripeness, `computed_at = now()`.
- `explanation` follows the v1 contract with `"model_version": "seed-0"` so everyone can see the data is fake, and at least 2 valid reason codes per row.
- Write both `zone_scores` and `zone_scores_current`. Idempotent: re-running updates in place.
- Optional flag `--with-reports`: insert about a dozen fake reports and `user_trust` rows for 2-3 zones.
- **Refuse to run when `NODE_ENV=production`.**

The real scorer (Python) overwrites these rows later. Remove the script (or keep it dev-only) once real scores exist.

---

## 10. Auth and security

- **Feature 6.1 (login, registration, roles) is a separate feature and its spec is not in this brief.** Do not invent login endpoints. Implement only:
  - `JwtAuthGuard` (global) verifying an `HS256` Bearer token with `JWT_SECRET`; payload has `sub` (user id, uuid) and `role`.
  - `@Public()` and `@Roles(...)` decorators and a `RolesGuard`.
  - `DEV_AUTH_BYPASS=true` injects a fake admin user (`id: 00000000-0000-0000-0000-000000000001`). The app **must fail to boot** if the bypass is on while `NODE_ENV=production`.
  - TODO(question): is token issuance done by this API or by Supabase Auth? If Supabase Auth, replace secret verification with the project's JWT secret or JWKS and keep the same `sub` and `role` mapping.
- `helmet()` on, CORS limited to `CORS_ORIGINS`, validation `whitelist: true` + `forbidNonWhitelisted: true`.
- Rate limit with `@nestjs/throttler` (`THROTTLE_LIMIT` per minute per user or IP). It must be switchable off (`THROTTLE_DISABLED=true`) so the k6 load test is not throttled.
- Never log tokens, passwords or full connection strings.
- Parameterise every SQL value. Never build SQL by string concatenation.

---

## 11. Testing and acceptance

| Level | Tooling | What |
|---|---|---|
| Unit | Jest | bbox size math, ETag builder, explanation rendering (every code in FI and EN, numbers filled), error filter |
| API e2e | Jest + supertest + **testcontainers** (`postgis/postgis:17-3.5`) | Load `docs/db/baseline_ingest.sql`, run migrations, load the golden fixture, hit every endpoint |
| Data check | `scripts/check-a2.sql` | A2: zero missing zone x species rows |
| Load | k6 (`perf/zones.k6.js`) | 50 virtual users panning a 20 x 20 km view, p95 < 300 ms (A1); run with `THROTTLE_DISABLED=true` |

**Golden fixture** (`test/fixtures/golden.sql`): 3 zones with hand-checked values: one ripe with 4 reports, one baseline-only (no reports, low confidence), one off-season. The same three cases are shared with the ML engineer's scoring tests. API e2e must assert, at minimum:

- `GET /zones` happy path returns exactly the expected features; grouped mode returns max score per parent
- bbox too large returns `422 BBOX_TOO_LARGE` in both modes
- `If-None-Match` with a matching ETag returns `304`; after a `computed_at` change it returns `200`
- unknown species returns `422`; unknown zone returns `404`
- `/near` ordering (score desc, then distance asc) and exclusion of `off_season`
- `/explanation` returns at least 2 reasons in both languages
- admin recompute: `403` for a picker, `202` for admin, second call returns `deduplicated: true`
- off-season zone returns a row with `ripeness: "off_season"`

---

## 12. Task plan for the agent (one PR per phase)

**Phase 0: Introspection.** Run the SQL in Section 5.2, save `docs/db/introspection.md`, commit `docs/db/baseline_ingest.sql`. Done when: SRIDs, indexes, PostGIS schema, row counts and habitat keys are written down.

**Phase 1: Contract and scaffold.** Create `backend/api` (Nest, TypeScript strict, ESLint, Prettier, Jest), `.env.example`, `.nvmrc`, `docker-compose.dev.yml` (local PostGIS for tests/dev), `GET /health`, global error filter, request id, pino logging, helmet, compression, CORS, config validation. Write `docs/openapi/zones.yaml` for every endpoint in Section 7. Done when: `npm run start:dev` serves `/health`, and the YAML validates (e.g. with Redocly or Prism).

**Phase 2: Database layer and migrations.** `DbModule` (Section 4), `node-pg-migrate` scripts, migration `0002`, `kysely-codegen` types, `npm run db:migrate`. Done when: migration applies cleanly to a fresh local DB (baseline + 0002) and to Supabase.

**Phase 3: Seed.** `scripts/seed-dev-scores.ts` and `scripts/check-a2.sql`. Done when: A2 check returns 0 rows after seeding.

**Phase 4: Auth plumbing.** `JwtAuthGuard`, `RolesGuard`, `@Public`, `@Roles`, `DEV_AUTH_BYPASS` with the production safety check, throttler. Done when: protected route returns 401 without a token and 200 with one.

**Phase 5: Species and zones list.** `GET /species`, `GET /zones` (detail + grouped, bbox limits, ETag/304, gzip). Done when: e2e tests for 7.2 and 7.3 pass and the 20 x 20 km response is within the size targets.

**Phase 6: Near and detail.** `GET /zones/near`, `GET /zones/{id}`. Done when: e2e tests for 7.4 and 7.6 pass.

**Phase 7: Explanation and history.** `ExplanationService` with the template catalogue, `GET /zones/{id}/explanation`, `GET /zones/{id}/history`. Done when: every code renders in FI and EN in unit tests.

**Phase 8: Snapshot.** `GET /zones/snapshot` with `since`. Done when: full snapshot and incremental snapshot tests pass.

**Phase 9: Jobs and admin.** `JobsService.enqueue` with de-duplication, `POST /admin/scores/recompute`. Done when: 10 rapid calls leave exactly 1 queued job per dedupe key.

**Phase 10: Performance and hardening.** k6 script, `EXPLAIN ANALYZE` on the main queries (attach output to the PR), add indexes if needed, optional Sentry. Done when: p95 < 300 ms on a 20 x 20 km view with the seeded pilot data.

For every phase: update `docs/openapi/zones.yaml` if the API shape changed, add tests, and list assumptions and `TODO(question)` items in the PR description.

---

## 13. Python worker and Python APIs (later)

These will be added by the ML engineer and the backend developer after the 6.2 API works. Design the NestJS code so none of this needs a rewrite.

### 13.1 What lives in Python

| Component | Location | Purpose |
|---|---|---|
| Scoring worker | `backend/worker/` | Daily 07:00 scoring, `recompute_*` jobs, writes score tables (Section 8). Implements the five-step pipeline from the feature design (ripeness, baseline model score, report score, fusion, confidence) |
| Ingest jobs | `data/` | Weather, NDVI, zone building (already owned by the data engineer) |
| ML feedback validation | `backend/worker/` | Validates and fraud-checks reports (feature 6.4/6.5); updates trust |
| Optional internal HTTP service | `backend/worker/` (FastAPI) | Only if a synchronous ML call is genuinely needed |

### 13.2 Integration rules

1. **Default: asynchronous through Postgres.** The API stores a report with `validation_status = 'pending'` (column to be added by feature 6.4), enqueues `validate_report`, and returns immediately. The worker validates, updates the report and `user_trust`, then enqueues `recompute_zone_score`.
2. **The mobile app only ever talks to the NestJS API.** Python endpoints are internal, never exposed publicly (single public surface, a simple gateway pattern).
3. **If a synchronous call is unavoidable**, put it behind `src/python-client/` (`PythonClientModule`) with:
   - base URL `PY_SERVICE_URL`, shared secret header `X-Internal-Token` from `PY_INTERNAL_TOKEN`
   - 2-second timeout, one retry at most, and graceful degradation (queue the work instead of failing the user request)
   - a feature flag `PY_SERVICE_ENABLED`
4. **Shared contracts** live in `docs/contracts/`: the explanation JSON (7.10), job types (Section 8), and the draft internal API below. Both sides update them in the same PR as any change.
5. **Same naming:** `snake_case`, same enum values (`confidence`, `ripeness`, species codes read from the DB).

### 13.3 Draft internal Python API (to be agreed with the ML engineer)

Not for the mobile app. All routes require `X-Internal-Token`.

| Method and path | Purpose | Request | Response |
|---|---|---|---|
| `GET /internal/v1/health` | Liveness | none | `{ "status": "ok", "model_version": "baseline-0.1" }` |
| `POST /internal/v1/validate-report` | Score a report for fraud or plausibility | `{ "report_id": "<uuid>" }` (service reads the DB itself) | `{ "report_id", "status": "accepted" \| "flagged" \| "rejected", "fraud_score": 0.12, "reasons": ["..."] }` |
| `POST /internal/v1/recompute` | Optional manual trigger, mirrors the job | `{ "zone_id": "<uuid>?" }` | `{ "queued": true }` |

### 13.4 What to prepare now in NestJS (no Python code yet)

- Keep `JobsService` generic (any `type`, any `payload`).
- Add an empty `ReportsModule` placeholder with a TODO that points here. Do not build feedback endpoints in this brief.
- Add `PY_SERVICE_URL`, `PY_INTERNAL_TOKEN` and `PY_SERVICE_ENABLED=false` to `.env.example` as commented placeholders.
- Do not import or depend on any Python tooling in the Node build.

---

## 14. Assumptions and open questions

Record any of these you hit as `TODO(question)` and list them in the PR.

1. **SRID and geometry columns**: verified as 4326 for `zones.geom`, `zones.centroid` and `weather_stations.geom`. Closed.
2. **Hide unsuitable species** (Section 5.4): working assumption is hide; owner is the domain researcher.
3. **bbox limit vs grouped mode** (Section 7.3): 50 km for detail, 150 km for grouped; confirm with the team.
4. **Privacy threshold** for `avg_rating` (3 distinct reporters): confirm with the project manager.
5. **Token issuance** (own API vs Supabase Auth): decided by feature 6.1.
6. **`weather_daily`** in the ingest schema looks like a view or an unconstrained table; the API does not use it, but the scorer will. Ask the data engineer whether it is materialized.
7. **Reason-code wording and Finnish texts** are drafts for review.
8. **H3 resolution** may change from 8 to 9 after the first walk test. Nothing here should hard-code resolution 8 other than the grouped parent column `h3_parent6`.
9. **Numbers from the design doc** (about 540 zones per 20 x 20 km, about 2,000 features per 50 x 50 km) were estimated without forest filtering; trust the real counts from Phase 0.
