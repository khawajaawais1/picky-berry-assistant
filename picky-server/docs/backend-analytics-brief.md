# Backend API Brief: Feature 6.8 (Analytics)

**Project:** Berry Picker Assistant (Team Picky, TIES4570 CSDP)
**Audience:** GitHub Copilot coding agent.
**Extends:** the earlier briefs in `docs/` (6.2, 6.1 and 6.3, 6.4 to 6.6). Everything in them still applies: stack (NestJS, `pg` + Kysely, `node-pg-migrate`), Supabase connection, error envelope, `snake_case`, contract-first OpenAPI, RLS, Postgres-as-queue and the job runner, testing approach.
**Source of truth for behaviour:** `docs/bpa-mvp-architecture.md`, sections 6.8, 6.9, 5 (jobs table) and 12 (endpoint list).
**Where to put this file:** `docs/backend-analytics-brief.md`, and add a line to `.github/copilot-instructions.md`.

---

## 0. Rules for the agent

1. Same rules as Section 0 of the 6.2 brief. Raise unclear points as `TODO(question)` in the PR.
2. **Look before you build.** Several analytics-like endpoints already exist: `GET /me/season`, `GET /zones/{id}/reports`, `GET /zones/{id}` (with `reports_7d`), `GET /zones/{id}/history`, `GET /admin/analytics`. Read their code first. **Reuse their helpers** (Helsinki date handling, the minimum-users threshold) and **do not change their response shapes**.
3. **Privacy first.** Zone analytics are anonymous aggregates. No response may contain a user id, email, nickname, or any value that identifies one person. Apply the minimum-users rule in Section 4.4.
4. **Write the OpenAPI YAML first** (`docs/openapi/analytics.yaml`). Define **full response schemas**, not `type: object`. The app's generated client depends on them. Use OpenAPI 3.1 and the shared `Error` schema.
5. Never log user ids together with coordinates or zone details. Log ids only.

---

## 1. What this feature is

The architecture lists three outputs for 6.8:

| Output | Where it shows | Status |
|---|---|---|
| "My stats": my visits, median stay time, zones visited | App, profile area | **New: `GET /me/analytics`** |
| Zone trends and median stay time | App, zone sheet | **New: `GET /analytics/zones/{id}`** |
| Admin page: daily series, coverage, distributions | Admin console | Already exists: `GET /admin/analytics` |

Plus the plumbing the architecture names: a materialised view `mv_zone_daily` and a `refresh_analytics` job.

Out of scope: app screens, alerts (6.7, done by a teammate), the marketplace (dropped), showing a user's trust number, ML or yield analytics.

---

## 2. Design decisions (and why)

| Decision | Reason |
|---|---|
| `/me/analytics` reads the base tables **live** | A user who just finished a visit expects to see it immediately. Per-user queries are small and already indexed |
| `/analytics/zones/{id}`: **summary live, daily series from `mv_zone_daily`** | The privacy rule needs the distinct number of users over the window, which a view cannot provide. The series is the heavier part and a view suits it |
| Only **one** materialised view, `mv_zone_daily` | `mv_user_stats` from the architecture is not needed; add it only if `EXPLAIN ANALYZE` shows `/me/analytics` slower than 200 ms |
| No scheduler exists beyond one daily cron, so refresh is **lazy** | `refresh_analytics` is enqueued after the nightly scoring and whenever the runner starts and the view is older than 60 minutes. No new infrastructure |
| Responses show `as_of` | The daily series can lag by up to an hour; the client can see it |
| `private` users **do** count in anonymous zone aggregates | The architecture defines "private" as: my data counts in scores, nobody sees my visits. Aggregates are not "seeing my visits". Confirmed by the backend owner (open question 1) |

Day boundaries are **Europe/Helsinki** calendar days everywhere (same as the ML and report rules).

---

## 3. Environment (add to `.env.example`)

```env
ANALYTICS_MIN_USERS=3              # minimum distinct people before a zone statistic is shown
ANALYTICS_REFRESH_MINUTES=60       # lazy refresh interval for mv_zone_daily
```

---

## 4. Endpoints

All under `/api/v1`, authenticated with the JWT, `snake_case`, standard error envelope. Any role may call both endpoints. Only `GET`.

### 4.1 `GET /me/analytics` (the caller's own stats)

Query: `days` integer 1-365, default 30, else `422 VALIDATION_ERROR`. `top` integer 1-20, default 5.

Rules:
- Only the caller's own data. Visits counted: `status = 'accepted'`. Reports counted: all of the caller's own (do not hide flagged ones; flags must never leak).
- The window is the last `days` Helsinki calendar days **including today**.
- `median_stay_min` uses `percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s)` over accepted visits, converted to minutes (one decimal).
- The `daily` series is **zero-filled** (one entry per day in the window) so the app can chart it directly.
- A user with no activity gets `200` with zeros and `null` medians, not 404.
- Header `Cache-Control: private, max-age=60`.

Response `200`:

```json
{
  "window": { "days": 30, "from": "2026-10-30", "to": "2026-11-28", "timezone": "Europe/Helsinki" },
  "visits": { "count": 12, "total_stay_min": 540.0, "median_stay_min": 41.0, "longest_stay_min": 95.0 },
  "zones_visited": {
    "count": 5,
    "top": [
      { "zone_id": "uuid", "zone_name": "Laajavuori 3", "visits": 4, "median_stay_min": 44.0, "last_visit_at": "2026-11-27T10:15:00.000Z" }
    ]
  },
  "reports": {
    "count": 9,
    "by_species": [ { "species": "bilberry", "count": 6, "avg_rating": 4.1 } ]
  },
  "daily": [ { "date": "2026-11-20", "visits": 1, "stay_min": 45.0, "reports": 2 } ]
}
```

Queries (parameters are UTC instants computed from the Helsinki window, so the indexes are used):

```sql
-- window bounds, computed once
--   to_day   = (now() AT TIME ZONE 'Europe/Helsinki')::date
--   from_ts  = ((to_day - ($days - 1))::timestamp AT TIME ZONE 'Europe/Helsinki')
--   to_ts    = (((to_day + 1))::timestamp AT TIME ZONE 'Europe/Helsinki')

SELECT count(*)::int AS visits,
       COALESCE(sum(duration_s), 0) / 60.0 AS total_stay_min,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s) / 60.0 AS median_stay_min,
       max(duration_s) / 60.0 AS longest_stay_min
FROM visits
WHERE user_id = $1 AND status = 'accepted' AND started_at >= $2 AND started_at < $3;

-- top zones
SELECT v.zone_id, z.name AS zone_name, count(*)::int AS visits,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY v.duration_s) / 60.0 AS median_stay_min,
       max(v.started_at) AS last_visit_at
FROM visits v JOIN zones z ON z.id = v.zone_id
WHERE v.user_id = $1 AND v.status = 'accepted' AND v.started_at >= $2 AND v.started_at < $3
GROUP BY v.zone_id, z.name ORDER BY visits DESC, last_visit_at DESC LIMIT $4;
```

Build the zero-filled `daily` with `generate_series(from_day, to_day, interval '1 day')` left-joined to per-day aggregates of visits and reports. Keep all aggregates in the same module; do not scatter SQL.

### 4.2 `GET /analytics/zones/{id}` (anonymous zone trends)

Path `id` must be a UUID of an existing zone (`404 NOT_FOUND` otherwise). Query: `days` integer 1-90, default 30.

Rules (Section 4.4 has the privacy rule):
- Counted data: accepted visits and **unflagged** reports (`cardinality(flags) = 0`) of the window. Rows with `user_id IS NULL` (anonymised after account deletion) are **excluded**, because distinct people cannot be verified.
- `summary` is computed live from the base tables for that one zone (small, indexed).
- `daily` comes from `mv_zone_daily`, zero-filled over the window, and may lag; `as_of` is the last refresh time from `analytics_refresh`.
- Each statistic group is suppressed **independently**: visit statistics need at least `ANALYTICS_MIN_USERS` distinct visitors in the window; report statistics need at least that many distinct reporters.
- Header `Cache-Control: private, max-age=300`.

Response `200`:

```json
{
  "zone_id": "uuid",
  "zone_name": "Sapelinmäki 20",
  "window": { "days": 30, "from": "2026-10-30", "to": "2026-11-28", "timezone": "Europe/Helsinki" },
  "as_of": "2026-11-28T08:00:00.000Z",
  "min_users": 3,
  "visits": { "suppressed": false, "count": 14, "visitors": 6, "median_stay_min": 38.0 },
  "reports": {
    "suppressed": false, "count": 11, "reporters": 5, "avg_rating": 3.9,
    "by_species": [ { "species": "bilberry", "reports": 8, "avg_rating": 4.0 } ]
  },
  "daily": [ { "date": "2026-11-20", "visits": 2, "reports": 1 } ]
}
```

When a group is suppressed it is exactly `{ "suppressed": true }` (no counts at all). In `daily`, a suppressed group's field is `null` for every day (for example `"visits": null`); if both groups are suppressed, `daily` is `[]`.

### 4.3 Summary queries

```sql
-- visits group (zone-scoped; $2/$3 = window instants)
SELECT count(*)::int AS visits,
       count(DISTINCT user_id)::int AS visitors,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s) / 60.0 AS median_stay_min
FROM visits
WHERE zone_id = $1 AND status = 'accepted' AND user_id IS NOT NULL
  AND started_at >= $2 AND started_at < $3;

-- reports group
SELECT count(*)::int AS reports,
       count(DISTINCT user_id)::int AS reporters,
       avg(rating)::float AS avg_rating
FROM reports
WHERE zone_id = $1 AND cardinality(flags) = 0 AND user_id IS NOT NULL
  AND created_at >= $2 AND created_at < $3;

-- per species (keep only species with >= ANALYTICS_MIN_USERS distinct reporters)
SELECT species, count(*)::int AS reports, avg(rating)::float AS avg_rating
FROM reports
WHERE zone_id = $1 AND cardinality(flags) = 0 AND user_id IS NOT NULL
  AND created_at >= $2 AND created_at < $3
GROUP BY species HAVING count(DISTINCT user_id) >= $4;
```

Round `avg_rating` to one decimal and `median_stay_min` to one decimal **after** the suppression check.

### 4.4 The minimum-users rule

A number is shown only if at least `ANALYTICS_MIN_USERS` (3) **different** people contributed to it in the window. Otherwise the whole group is `{ "suppressed": true }`. Reason: with one or two contributors, a "median stay" or "average rating" is one picker's own data, which would reveal where a person was and when. The same rule is already used for `reports_7d`; use the same constant and helper. Never return user ids, emails or nicknames from this endpoint.

---

## 5. Migration `0007_analytics.sql`

Use the next free number. Plain SQL with `-- Up Migration` / `-- Down Migration` markers.

```sql
-- Up Migration

CREATE TABLE analytics_refresh (
  name text PRIMARY KEY,
  refreshed_at timestamptz NOT NULL
);
ALTER TABLE analytics_refresh ENABLE ROW LEVEL SECURITY;

CREATE MATERIALIZED VIEW mv_zone_daily AS
WITH v AS (
  SELECT zone_id,
         (started_at AT TIME ZONE 'Europe/Helsinki')::date AS day,
         count(*)::int AS visits,
         count(DISTINCT user_id)::int AS visitors,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s) AS median_stay_s
  FROM visits
  WHERE status = 'accepted' AND zone_id IS NOT NULL AND user_id IS NOT NULL
  GROUP BY 1, 2
), r AS (
  SELECT zone_id,
         (created_at AT TIME ZONE 'Europe/Helsinki')::date AS day,
         count(*)::int AS reports,
         count(DISTINCT user_id)::int AS reporters
  FROM reports
  WHERE cardinality(flags) = 0 AND user_id IS NOT NULL
  GROUP BY 1, 2
)
SELECT COALESCE(v.zone_id, r.zone_id) AS zone_id,
       COALESCE(v.day, r.day) AS day,
       COALESCE(v.visits, 0) AS visits,
       COALESCE(v.visitors, 0) AS visitors,
       v.median_stay_s,
       COALESCE(r.reports, 0) AS reports,
       COALESCE(r.reporters, 0) AS reporters
FROM v FULL OUTER JOIN r ON r.zone_id = v.zone_id AND r.day = v.day;

-- required for REFRESH ... CONCURRENTLY
CREATE UNIQUE INDEX mv_zone_daily_uq ON mv_zone_daily (zone_id, day);

INSERT INTO analytics_refresh (name, refreshed_at) VALUES ('mv_zone_daily', now());

-- Supabase: materialised views are NOT protected by row level security, and tables in "public"
-- are reachable through its automatic Data API. Close that door. Guarded so local databases
-- without the Supabase roles still migrate.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON mv_zone_daily FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON mv_zone_daily FROM authenticated';
  END IF;
END $$;

-- Down Migration
DROP MATERIALIZED VIEW mv_zone_daily;
DROP TABLE analytics_refresh;
```

The view is populated when created. Existing indexes (`visits_user_ix`, `visits_zone_ix`, `reports_user_day_ix`, `reports_zone_ix`) cover the live queries; add an index only if `EXPLAIN ANALYZE` shows a sequential scan on a large table.

---

## 6. Job `refresh_analytics`

Add one handler to the existing runner.

- Payload `{}`, dedupe key `refresh_analytics` (de-duplicates while queued, like every other job).
- Handler: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_daily;` then
  `INSERT INTO analytics_refresh (name, refreshed_at) VALUES ('mv_zone_daily', now()) ON CONFLICT (name) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at;`
- **`REFRESH ... CONCURRENTLY` cannot run inside a transaction block.** Run it as a single plain statement on a pooled client, not inside a Kysely transaction, and say so in a code comment.
- Retries follow the runner's normal rules (3 attempts, back-off).
- **Triggers** (no new scheduler):
  1. At the end of the last page of `score_zones_daily` (the finalise step), enqueue it.
  2. At the start of every runner run: if `analytics_refresh.refreshed_at` is older than `ANALYTICS_REFRESH_MINUTES` and no `refresh_analytics` job is queued, enqueue one.
  3. `POST /admin/analytics/refresh` (admin only, no body): enqueue and return `202 { job_id, status: "queued", deduplicated }` (reuse the `EnqueueResult` schema from `admin.yaml`, and write an `audit_log` row like the other mutating admin routes).
- Optional, small: add a check `analytics_freshness` to `GET /admin/operations/health`: ok under 3 hours, warn over 3 hours, fail over 26 hours, with an owner and a runbook line, like the other checks.

---

## 7. Testing

Same tooling as before (Jest, supertest, testcontainers with PostGIS, all migrations applied). Required e2e cases:

**`GET /me/analytics`**
- A new user gets `200` with zero counts, `null` medians and a zero-filled `daily` whose length equals `days`.
- Median is correct for an odd and an even number of visits (check the even case by hand: two visits of 30 and 50 minutes give 40).
- Only own data: a second user's visits and reports never appear.
- Rejected visits are not counted; all of the user's own reports are, flagged or not.
- A visit at 23:30 Helsinki and one at 00:30 Helsinki land on different days (check the boundary, not UTC), including across the autumn clock change.
- `days=0`, `days=366` and `top=21` return `422`.
- `top` limits the list and orders by visits, then by recency.

**`GET /analytics/zones/{id}`**
- Two distinct visitors: `visits` is exactly `{ "suppressed": true }`; a third visitor makes it appear. The same test for reporters.
- Five visits by **one** user stay suppressed.
- Rows with a null `user_id` and flagged reports are excluded from every number.
- Visit statistics can be shown while report statistics are suppressed, and the other way round; `daily` follows (`null` fields, or `[]` when both are suppressed).
- By-species entries appear only for species with at least three distinct reporters.
- Unknown zone gives `404`; invalid UUID gives `422`.
- **Privacy scan:** serialise the whole response and assert it contains no user id, email or nickname from the test data.
- **View lag:** after inserting a visit the live `summary` includes it but `daily` does not until the job runs; after `refresh_analytics`, `daily` includes it and `as_of` moves forward.

**Job and plumbing**
- `refresh_analytics` runs as a plain statement (no transaction error), is idempotent, and updates `analytics_refresh`.
- Lazy trigger: with a stale `refreshed_at` the runner enqueues one job; with a fresh value it enqueues none; ten runner calls produce at most one queued job.
- `POST /admin/analytics/refresh`: `401` without a token, `403` for a picker, `202` for an admin, `deduplicated: true` on the second call, and an `audit_log` row.
- The migration applies on a database without `anon` and `authenticated` roles.

---

## 8. Task plan (one PR per phase)

**Phase 0: Read the ground.** Read the existing code for `/me/season`, `/zones/{id}/reports`, `/zones/{id}` (`reports_7d`), `/zones/{id}/history` and `/admin/analytics`. List the helpers you will reuse and any overlap. Done when: the list is in the PR description.

**Phase 1: Contract.** `docs/openapi/analytics.yaml` with full schemas for both endpoints, plus `POST /admin/analytics/refresh` in `admin.yaml`. Done when: the YAML validates and a mock server serves both endpoints.

**Phase 2: Migration `0007` and types.** Done when: it applies to a fresh local database and to Supabase, and `SELECT count(*) FROM mv_zone_daily` works.

**Phase 3: `GET /me/analytics`.** Done when: its e2e tests pass and `EXPLAIN ANALYZE` on the main queries is attached to the PR.

**Phase 4: `refresh_analytics` job.** Handler, the three triggers, the admin endpoint, the optional health check. Done when: the job tests pass.

**Phase 5: `GET /analytics/zones/{id}`** with the suppression rule. Done when: its e2e tests (including the privacy scan and the lag test) pass.

**Phase 6: Wrap-up.** Update `docs/` (the architecture note that `mv_user_stats` was not needed, and why), update `.env.example`, final end-to-end run. Done when: every item in the PR checklist is ticked.

---

## 9. Open questions

1. **Private users in aggregates:** the architecture says private data "counts in scores but nobody sees my visits". This brief includes private users in anonymous zone statistics. **Confirmed by the backend owner on 2026-11-28.** Tell Sayeem so the privacy text matches.
2. **Threshold:** 3 distinct users, the same number as `reports_7d`. **Confirmed.**
3. **Deleted users:** their anonymised rows are excluded from zone statistics. **Confirmed.**
4. **Daily granularity:** the series is per day and shows counts only; per-day medians are stored in the view but never exposed, because they would often be a single person's stay.
5. **`/me/analytics` and `/me/season`:** both exist after this PR. `season` is a calendar-year total, `analytics` a rolling window with a daily series. If the app only needs one, drop the other.
6. **View lag:** up to an hour (lazy refresh), or up to a day if the runner is only called by the daily cron. If that is too stale for the demo, call `POST /internal/jobs/run` more often (for example every 5 minutes from GitHub Actions).
