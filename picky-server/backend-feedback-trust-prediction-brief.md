# Backend API Brief: Features 6.4 (Feedback), 6.5 (Validation and trust), 6.6 (Yield prediction) + ML integration

**Project:** Berry Picker Assistant (Team Picky, TIES4570 CSDP)
**Audience:** GitHub Copilot coding agent.
**Extends:** `docs/backend-api-brief.md` (6.2) and `docs/backend-accounts-visits-brief.md` (6.1, 6.3). Everything in those files still applies (stack, Supabase, error envelope, `snake_case`, contract-first OpenAPI, RLS, Postgres-as-queue, testing approach) **except where Section 2 below changes it**.
**ML contract:** `ml/API.md` in this repo, and the exact examples in `ml/tests/golden/*.json`. If this brief and `ml/API.md` disagree about an ML field name, `ml/API.md` wins; raise it as a `TODO(question)`.
**Where to put this file:** `docs/backend-feedback-trust-prediction-brief.md`, and add a line to `.github/copilot-instructions.md`.

---

## 0. Rules for the agent

1. Same rules as Section 0 of the 6.2 brief. Raise unclear points as `TODO(question)` in the PR.
2. **The ML service is strict.** It lives on Render (built by the ML team, wrapped in HTTP by a teammate) and **rejects unknown fields and any camelCase with 422**. Send exactly the documented fields, in `snake_case`, nothing extra. Test request bodies against the shapes in Section 4.
3. **Photos are never stored.** The app sends a resized JPEG, we forward it to the ML service, keep only the counts, and drop the file. Never write photo bytes to disk, database, or logs.
4. **Store facts, not derived values.** Never store a report weight. Weights depend on trust and age, which change.
5. **ML calls never happen inside a normal user request**, with one exception: photo analysis (Section 6.1). Everything else runs from jobs (Section 7).
6. Never log tokens, emails, coordinates or photo content. Log ids only.
7. **Write the OpenAPI YAML first** (`docs/openapi/feedback.yaml`, plus changes to existing files), then the code.

---

## 1. How the three features fit together

| | ML service does | Our backend does |
|---|---|---|
| 6.6 prediction | Scores zones from forest type, season window, year index (v1 year index is always 1.0) | Sends all zones nightly; stores the result as the **baseline** |
| 6.4 feedback | Counts berries in a photo | Receives ratings and photos, stores facts, discards photos |
| 6.5 trust | Applies the trust formula and the report weighting | Computes consensus, runs fraud checks, stores trust and flags |

**One report, end to end**

1. **Nightly job:** all zone centroids go to `POST /zone-scores`. Each zone x species baseline (score, confidence, ripeness, explanation) is stored in `zone_model_scores`. Where a zone x species has no eligible reports, the baseline is copied into `zone_scores_current` as the final score.
2. **Visit ends (6.3)**; the app asks for feedback.
3. **Photo:** `POST /media/analyze` forwards the photo to `/detections`, stores only the counts (one `photos` row), returns them. The app generates a `submission_id` first and uses it for photos and feedback.
4. **Feedback:** `POST /visits/{id}/feedback` (or `POST /reports` without a visit) stores one `reports` row per species and computes fraud flags right away. The request ends there.
5. **Job `process_report`:** updates the reporter's trust through `POST /trust-updates`, once per report.
6. **Job `recompute_zone_score`** (de-duplicated per zone x species): sends the baseline plus eligible reports of the last 28 days to `POST /score-updates`; the result goes to `zone_scores_current` and `zone_scores`.
7. **Map (6.2)** reads the new score. `/explanation` renders the stored reason codes.

---

## 2. Changes to earlier briefs and existing code

| # | Change |
|---|---|
| 1 | **Explanation templates** (the adjustment the ML team requested): replace the old `*_by_gdd` and `*_habitat` codes in `templates.ts` with the ML codes in Section 9. Add a CI test that every code has FI and EN text. |
| 2 | **Stored explanation** is the ML object as returned (`model_version`, `rules_version`, `reasons`, `inputs`). Our own `version` key is optional; `model_version` stays required. Update `docs/contracts/explanation.v1.md`. |
| 3 | **Species scope (replaces 6.2 brief Section 5.4):** the ML service scores all 4 species for every covered zone, so we store all four. `zone_species` no longer filters. Poor sites score low and carry `poor_site`. Update `scripts/check-a2.sql` to compare every covered zone x the four species. |
| 4 | **`recompute_zone_score` dedupe key** becomes `recompute:<zone_id>:<species>` and the payload carries `species`. |
| 5 | **`POST /visits` no longer enqueues a recompute.** ML scoring does not use stay time, so a visit alone changes nothing. Remove the enqueue and its test. |
| 6 | **`POST /admin/scores/recompute`:** body `{ zone_id, species }` enqueues `recompute_zone_score`; an empty body enqueues `score_zones_daily` (Section 7). |
| 7 | **`DELETE /me`** must also run `UPDATE photos SET user_id = NULL WHERE user_id = <id>` and anonymise `reports` (already done) in the same transaction. |
| 8 | **`reports_7d`** in zone detail excludes flagged reports (`cardinality(flags) = 0`). The privacy rule (at least 3 distinct users before `avg_rating` is shown) stays. |
| 9 | **Seed scores** (`seed-0` rows from migration `0003`) are replaced by the first successful nightly run. After it, apply the cleanup `DELETE ... WHERE explanation->>'model_version' = 'seed-0'` as a migration. |
| 10 | **Architecture doc notes** to put in the PR description: photo upload via presigned URLs, `/media/upload-url`, `/media/{id}/complete` and the `detect_berries` job are replaced by one `POST /media/analyze`; trust is additive (+0.05 / -0.10) instead of a Beta reputation; the report window is 28 days. |

---

## 3. Environment (add to `.env.example`)

```env
ML_SERVICE_URL=https://picky-berry-assistant.onrender.com
ML_API_KEY=                        # server only, never in git or the app
ML_MODE=live                       # live | mock (mock = in-process fake, for dev and tests)
ML_TIMEOUT_PHOTO_MS=60000          # Render free plan can need ~1 min to wake
ML_TIMEOUT_MS=20000
ML_BATCH_SIZE=1500                 # zones per zone-scores call (ML max is 5000)

JOBS_RUN_TOKEN=                    # protects POST /internal/jobs/run
CRON_SECRET=                       # Vercel Cron sends it as "Authorization: Bearer <value>"
JOBS_RUN_BUDGET_MS=40000           # stop claiming new jobs after this long in one run

MAX_PHOTO_BYTES=4000000            # Vercel rejects bodies over ~4.5 MB
MAX_PHOTOS_PER_SUBMISSION=5
REPORT_WINDOW_DAYS=28
MAX_REPORTS_PER_DAY=10
MAX_KM_FROM_LAST_VISIT=50
CONSENSUS_MIN_USERS=3
```

---

## 4. ML client (`src/ml/`, `MlClientModule`)

Use native `fetch` with `AbortController`; multipart via `FormData` and `Blob`. Header `X-API-Key` on every call. Retry **once** (1 s backoff) on network errors, timeouts, 429 and 5xx; never retry other 4xx. Errors map to: ML 4xx -> `502 ML_REJECTED` (log the field names only), timeout or 5xx after retry -> `503 ML_UNAVAILABLE`. Before a batch job, call `GET /api/v1/ml/health` first (this wakes Render) with the long timeout.

`ML_MODE=mock` is an in-process fake that returns deterministic responses shaped like `ml/tests/golden/*.json`. Copy those golden files to `backend/api/test/fixtures/ml/` and use them in tests. Write TypeScript types in `src/ml/ml.types.ts` mirroring `ml/API.md` Section 2 exactly.

Paths are under `/api/v1/ml`. Exact request shapes (all fields shown are the **only** ones allowed):

| Call | Request | Response fields we use |
|---|---|---|
| `GET /health` | none | `status`, `models.*` |
| `POST /detections?boxes=false` | multipart field `photo` (JPEG, PNG or WebP) | `counts` `{bilberry, cloudberry, crowberry, lingonberry}`, `total`, `image_size {width, height}`, `model_version` |
| `POST /zone-scores` | `{ "date": "YYYY-MM-DD", "points": [ { "id", "h3", "lat", "lon" } ] }` (1-5000 points) | `results[]`: `id`, `h3`, `coverage` (`grid` or `none`), `forest_share`, `scores` (null if `none`, else per species `{ score, confidence, ripeness, explanation }`) |
| `POST /score-updates` | `{ "map_score", "map_confidence", "map_explanation", "reports": [ { "created_at", "rating", "photo_count", "reporter_trust", "visit_backed" } ], "now" }` | `score`, `confidence`, `s_model`, `s_feedback`, `evidence_weight`, `reports_used`, `explanation` |
| `POST /trust-updates` | `{ "trust", "rating", "photo_count", "species", "zone_consensus" }` | `trust`, `rules_version` |

Notes that are easy to get wrong:

- `score-updates` has **no `species` field** and returns **no `ripeness`**. We keep ripeness from the baseline (Section 7.3).
- `photo_count` is the detector count **for the report's species**; `null` means no photo (a count of 0 means a photo with none of that berry).
- `map_explanation` must always be sent, or the response `explanation` is `null`.
- `date` and `now`: dates are Europe/Helsinki calendar dates, timestamps are UTC with `Z`. Put the Helsinki-date helper in `src/common/dates.ts`.

---

## 5. Migration `0006_feedback_trust_prediction.sql`

Use the next free number. Plain SQL with `-- Up Migration` / `-- Down Migration` markers; RLS enabled on every new table.

```sql
-- Up Migration

-- Baseline from the ML model (6.6): one row per zone x species, replaced nightly.
CREATE TABLE zone_model_scores (
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence text NOT NULL CHECK (confidence IN ('low','medium','high')),
  ripeness text NOT NULL CHECK (ripeness IN ('unripe','ripening','ripe','past','off_season')),  -- already mapped (7.3)
  explanation jsonb NOT NULL,
  score_date date NOT NULL,
  model_version text NOT NULL,
  rules_version text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (species, zone_id)
);

-- Detector output only. No image data.
CREATE TABLE photos (
  id uuid PRIMARY KEY,                           -- the app's client UUID (Idempotency-Key)
  user_id uuid REFERENCES users(id),             -- nullable: anonymised on account deletion
  submission_id uuid NOT NULL,
  counts jsonb NOT NULL,                         -- {"bilberry":2,"cloudberry":0,"crowberry":0,"lingonberry":1}
  total int NOT NULL,
  model_version text NOT NULL,
  image_width int,
  image_height int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_submission_ix ON photos (submission_id);

-- Reports: one row per species per submission.
ALTER TABLE reports ADD COLUMN submission_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE reports ALTER COLUMN submission_id DROP DEFAULT;
ALTER TABLE reports ADD COLUMN amount_l real CHECK (amount_l IS NULL OR (amount_l >= 0 AND amount_l <= 200));
ALTER TABLE reports ADD COLUMN flags text[] NOT NULL DEFAULT '{}';
ALTER TABLE reports ADD COLUMN trust_processed_at timestamptz;
CREATE UNIQUE INDEX reports_submission_species_uq ON reports (submission_id, species);
CREATE UNIQUE INDEX reports_visit_species_uq ON reports (visit_id, species) WHERE visit_id IS NOT NULL;
CREATE INDEX reports_user_day_ix ON reports (user_id, created_at DESC);

ALTER TABLE user_trust ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE zone_model_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Down Migration
ALTER TABLE user_trust DROP COLUMN updated_at;
DROP INDEX reports_user_day_ix, reports_visit_species_uq, reports_submission_species_uq;
ALTER TABLE reports DROP COLUMN trust_processed_at, DROP COLUMN flags, DROP COLUMN amount_l, DROP COLUMN submission_id;
DROP TABLE photos, zone_model_scores;
```

A separate later migration deletes the `seed-0` rows (Section 2, item 9).

---

## 6. Endpoints

All under `/api/v1`, authenticated (JWT), `snake_case`, error envelope from the 6.2 brief. New error codes: `PHOTO_TOO_LARGE` 413, `ML_UNAVAILABLE` 503, `ML_REJECTED` 502, `VISIT_NOT_ELIGIBLE` 422, `TOO_MANY_PHOTOS` 422, `SUBMISSION_CONFLICT` 409.

### 6.1 `POST /media/analyze` (multipart)

Fields: `photo` (file). Header `Idempotency-Key: <uuid>` (required; becomes `photos.id`). Query `submission_id=<uuid>` (required).

- Accept only JPEG, PNG or WebP (check the leading bytes, not just the header). Limit `MAX_PHOTO_BYTES` using `FileInterceptor` with memory storage; larger gives `413 PHOTO_TOO_LARGE` with message "Resize to about 1280 px JPEG".
- Replay of the same key and user: `200` with the stored result, **no ML call**. Same key from another user: `409 SUBMISSION_CONFLICT`. More than `MAX_PHOTOS_PER_SUBMISSION` for one submission: `422 TOO_MANY_PHOTOS`.
- Call `POST /detections?boxes=false` with the long timeout. On failure return `503 ML_UNAVAILABLE` with `details.retry_after_s: 30` and **insert nothing** (the app keeps the file and retries).
- On success insert the `photos` row (counts, total, model version, image size) and return `201`:

```json
{ "photo_id": "uuid", "submission_id": "uuid",
  "counts": { "bilberry": 46, "cloudberry": 0, "crowberry": 0, "lingonberry": 1 },
  "total": 47, "model_version": "berry-yolo11n-v1" }
```

- If reports already exist for that `submission_id` (the photo arrived late), enqueue `recompute_zone_score` for each report's zone x species. Trust is **not** re-evaluated.
- Rate limit 30/min per user. Set the route's `maxDuration` in `vercel.json` as high as the plan allows (`TODO(question)`: confirm the plan's limit; the call can take about a minute when Render wakes).

### 6.2 `POST /visits/{id}/feedback`

```json
{
  "submission_id": "uuid",
  "ratings": [ { "species": "bilberry", "rating": 4, "amount_l": 3 },
               { "species": "lingonberry", "rating": 2 } ]
}
```

- Validation: 1-4 `ratings`, unique species, species exists, `rating` 1-5, `amount_l` 0-200 optional.
- The visit must be the caller's own with `status = 'accepted'`; otherwise `422 VISIT_NOT_ELIGIBLE` (use 404 if it is not the caller's, so existence is not revealed). `zone_id` comes from the visit and `visit_id` is stored.
- One `reports` row per species. Replay of the same `submission_id` and user returns `200` with the stored rows; the same id from another user is `409 SUBMISSION_CONFLICT`. A second submission for the same visit and species is rejected by `reports_visit_species_uq` (return `409 SUBMISSION_CONFLICT`).
- Compute fraud flags in the same transaction (Section 8.1). **Do not return flags** to the client.
- Enqueue one `process_report` job per inserted row (dedupe key `process:<report_id>`).
- Response `201`: `{ "submission_id", "reports": [ { "id", "species", "rating", "amount_l", "created_at" } ] }`.

### 6.3 `POST /reports` (feedback without a visit)

Same body plus `zone_id` (must exist). Stored with `visit_id = NULL`, so it later counts half weight in ML. Same validation, flags, idempotency and jobs. `403`-style abuse is limited by the day limit in 8.1.

### 6.4 Admin

- `POST /admin/scores/recompute`: see Section 2, item 6.
- `GET /admin/ml/health` (admin only): calls ML `/health` with the long timeout and returns the model versions. Useful for waking Render before a demo.

### 6.5 Internal job endpoints (not in the public OpenAPI)

| Route | Protection | Purpose |
|---|---|---|
| `GET /internal/jobs/cron` | `Authorization: Bearer <CRON_SECRET>` (constant-time compare) | Called by Vercel Cron: enqueue `score_zones_daily` for today, then drain jobs |
| `POST /internal/jobs/run` | header `X-Jobs-Token: <JOBS_RUN_TOKEN>` | Drain jobs now (manual runs, after-report kicks) |

Mark both `@Public()` (they have their own check), exclude them from Swagger, and never return job payloads.

`vercel.json` additions (check the existing file; keep what is there):

```json
{ "crons": [ { "path": "/internal/jobs/cron", "schedule": "0 3 * * *" } ] }
```

Free plans run a cron job once a day with imprecise timing, which is fine for the nightly job. After saving a report the handlers may kick the runner with `waitUntil` from `@vercel/functions` if available; treat it as best effort, because the daily run drains whatever is left.

---

## 7. Jobs (the engine and the three job types)

### 7.1 Runner

`JobsRunnerService.run()`:

1. Reset stale jobs: `UPDATE jobs SET status='queued' WHERE status='running' AND locked_at < now() - interval '10 minutes'`.
2. Loop until `JOBS_RUN_BUDGET_MS` is spent: claim one job with the `FOR UPDATE SKIP LOCKED` query from the 6.2 brief (Section 8), run its handler, mark `done`. On error: `last_error` (truncated, no secrets), `run_at = now() + attempts * 2 minutes`, back to `queued`; after 3 attempts `status = 'failed'`. A non-retryable ML 422 fails immediately.
3. Return `{ ran, failed, remaining }`.

Handlers are registered by job `type`. Job types: `score_zones_daily`, `recompute_zone_score`, `process_report`.

### 7.2 `score_zones_daily` (6.6)

Payload `{ "date": "YYYY-MM-DD", "offset": 0 }`, dedupe key `daily:<date>:<offset>`.

1. Page zones `ORDER BY id LIMIT ML_BATCH_SIZE OFFSET <offset>` with `id`, `h3`, `ST_Y(centroid)` as `lat`, `ST_X(centroid)` as `lon`. Warm up ML (health call) on the first page.
2. Call `/zone-scores`. For each result with `coverage = 'grid'` upsert 4 rows into `zone_model_scores` (map `ripeness` per 7.3). Results with `coverage = 'none'` are skipped (never store zeros) and counted in the job log.
3. If more zones remain, enqueue the same job with `offset + ML_BATCH_SIZE` and stop. Otherwise **finalise**:
   - **Baseline copy** for every zone x species in `zone_model_scores` for `date` with no eligible reports (set-based):

```sql
INSERT INTO zone_scores_current
  (zone_id, species, score, confidence, ripeness, s_model, s_reports, n_eff, band_width, explanation, computed_at)
SELECT m.zone_id, m.species, m.score, m.confidence, m.ripeness, m.score, NULL, 0, NULL, m.explanation, now()
FROM zone_model_scores m
WHERE m.score_date = $1
  AND NOT EXISTS (SELECT 1 FROM reports r
                  WHERE r.zone_id = m.zone_id AND r.species = m.species
                    AND cardinality(r.flags) = 0
                    AND r.created_at >= now() - make_interval(days => $2))   -- REPORT_WINDOW_DAYS
ON CONFLICT (species, zone_id) DO UPDATE SET
  score = EXCLUDED.score, confidence = EXCLUDED.confidence, ripeness = EXCLUDED.ripeness,
  s_model = EXCLUDED.s_model, s_reports = NULL, n_eff = 0, band_width = NULL,
  explanation = EXCLUDED.explanation, computed_at = EXCLUDED.computed_at;
```

   - Insert the same rows into `zone_scores` (history).
   - For every zone x species that **does** have eligible reports, enqueue `recompute_zone_score` (de-duplicated).

### 7.3 `recompute_zone_score` (6.4 and 6.6 together)

Payload `{ "zone_id", "species" }`, dedupe key `recompute:<zone_id>:<species>`.

1. Load the baseline row from `zone_model_scores`. If missing (zone outside the grid, or the nightly job has not run yet) log and finish; do not guess a score.
2. Load eligible reports: same zone and species, `cardinality(flags) = 0`, created within `REPORT_WINDOW_DAYS`, newest first, at most 500. For each:
   - `created_at`: the stored timestamp, UTC.
   - `rating`: stored rating.
   - `photo_count`: the sum of `(counts ->> <species>)::int` over `photos` with the report's `submission_id`; `null` if no photo exists for the submission.
   - `reporter_trust`: `user_trust.trust` for the user, or `0.5` if none or the user is anonymised.
   - `visit_backed`: `visit_id IS NOT NULL`.
3. No eligible reports: do the baseline copy for this one row (7.2 SQL restricted to the pair).
4. Otherwise call `/score-updates` with `map_score`, `map_confidence`, `map_explanation` from the baseline, the reports, and `now` = current UTC time.
5. Write `zone_scores_current` (upsert) and `zone_scores` (history row) with the mapping from the ML team:

| Our column | Source |
|---|---|
| `score`, `confidence` | `score`, `confidence` |
| `s_model` | `s_model` |
| `s_reports` | `round(s_feedback)`, or `NULL` |
| `n_eff` | `evidence_weight` |
| `band_width` | `NULL` |
| `ripeness` | the baseline row's `ripeness` (the response has none) |
| `explanation` | `explanation` as returned |
| `computed_at` | now |

**Ripeness mapping (used when storing the baseline):** the ML service returns `unripe | ripening | ripe | past`. If the explanation `reasons` contains `off_season`, store `off_season`; otherwise store ML's value.

### 7.4 `process_report` (6.5)

Payload `{ "report_id" }`, dedupe key `process:<report_id>`.

1. Load the report. If `trust_processed_at` is set, skip to step 4 (idempotent). If the report is flagged or `user_id` is null, set `trust_processed_at = now()` and finish without any ML call.
2. Compute `zone_consensus`:

```sql
SELECT avg(rating)::float AS mean, count(DISTINCT user_id) AS users
FROM reports
WHERE zone_id = $1 AND species = $2
  AND user_id IS NOT NULL AND user_id <> $3
  AND cardinality(flags) = 0
  AND created_at >= $4 - interval '7 days' AND created_at < $4;   -- $4 = this report's created_at
```

   Pass the mean only if `users >= CONSENSUS_MIN_USERS` (3), otherwise `null`. Reason: their rule subtracts 0.10 for a rating more than one star off, and one or two other opinions are too weak a basis to punish an honest picker.
3. In a transaction: lock the user's `user_trust` row (create at `0.5` if missing), call `/trust-updates` with `trust`, `rating`, `photo_count` (same rule as 7.3), `species`, `zone_consensus`; save the returned `trust` and `updated_at`; set `trust_processed_at`. Do not hold the lock across a retry: if the ML call fails, roll back and let the job retry.
4. Enqueue `recompute_zone_score` for the zone x species.

---

## 8. Our own validation (6.5)

### 8.1 Fraud flags (computed when a report is inserted)

Flags are stored in `reports.flags`. A flagged report is **excluded from scoring, consensus and zone stats**, and it does not change trust. Constants come from the environment (Section 3). "Day" means the Europe/Helsinki calendar day.

| Flag | Rule |
|---|---|
| `rate_limit_day` | The user already has `MAX_REPORTS_PER_DAY` or more distinct submissions today (count submissions, not species rows) |
| `duplicate_day` | Visit-backed only: the user already has an unflagged visit-backed report for the same zone and species today |
| `far_from_last_visit` | The report's zone centroid is more than `MAX_KM_FROM_LAST_VISIT` km from the zone of the user's most recent earlier accepted visit (skip when there is no earlier visit) |

```sql
-- far_from_last_visit
SELECT ST_Distance(zc.centroid::geography, lz.centroid::geography) / 1000.0 AS km
FROM zones zc,
     (SELECT z.centroid FROM visits v JOIN zones z ON z.id = v.zone_id
      WHERE v.user_id = $1 AND v.status = 'accepted' AND v.started_at < $2   -- $2 = this visit's start, or now()
      ORDER BY v.started_at DESC LIMIT 1) lz
WHERE zc.id = $3;
```

Run the checks under the per-user advisory lock used for visits so two simultaneous submissions cannot both slip under a limit.

### 8.2 What ML does (for reference, do not reimplement)

Evidence of a report, the weight `trust x recency x visit` (recency halves every 7 days, zero after 28; visit 1.0 or 0.5), the fusion into the new score, confidence, and the trust step (+0.05 agree, -0.10 disagree, a photo can only raise it) all live in the ML service (`ml/API.md` Section 4). We only provide the inputs.

---

## 9. Explanation templates (adjustment 1)

Replace the catalogue in `templates.ts`. Codes and meanings are from `ml/API.md` Section 3; **read that section and match every code in it**, adding any that are not listed here. Inputs come from `explanation.inputs`: `site_class`, `site_potential`, `window_start`, `window_end`, `year_index`, `forest_share`, `reports_used`, `evidence_weight`.

Formatting rules: dates (`window_start`, `window_end`, ISO `YYYY-MM-DD`) are shown as `d.M.` in Finnish and `d MMM` in English, formatted in UTC so the day never shifts. A missing placeholder value falls back to the generic sentence instead of printing `undefined`. An unknown code logs a warning and returns the generic sentence ("No additional explanation is available."), never an error.

These texts are drafts for the domain researcher to review; a native Finnish speaker should proofread.

| Code | English | Finnish |
|---|---|---|
| `in_ripe_window` | Berries are in their ripening season here (about {window_start} to {window_end}). | Marjat ovat kypsymisjaksollaan täällä (noin {window_start}–{window_end}). |
| `ripening_window` | Ripening starts soon: from {window_start}. | Kypsyminen alkaa pian: {window_start} alkaen. |
| `before_window` | Too early: ripening starts around {window_start}. | Liian aikaista: kypsyminen alkaa noin {window_start}. |
| `past_window` | The season ended around {window_end}; few berries are left. | Sesonki päättyi noin {window_end}; marjoja on jäljellä vähän. |
| `off_season` | Out of season for this berry. | Tämän marjan sesonki ei ole käynnissä. |
| `good_site` | The forest type here suits this berry well. | Metsätyyppi sopii tälle marjalle hyvin. |
| `moderate_site` | The forest type here is fair for this berry. | Metsätyyppi sopii tälle marjalle kohtalaisesti. |
| `poor_site` | The forest type here is poor for this berry. | Metsätyyppi sopii tälle marjalle huonosti. |
| `no_reports_baseline` | No recent reports, so this is an estimate from the forest type and season. | Tuoreita raportteja ei ole, joten arvio perustuu metsätyyppiin ja vuodenaikaan. |
| `recent_reports_high` | Recent reports from pickers are as good as or better than the estimate ({reports_used} reports). | Poimijoiden tuoreet raportit ovat vähintään arvion tasolla ({reports_used} raporttia). |
| `recent_reports_low` | Recent reports from pickers are lower than the estimate ({reports_used} reports). | Poimijoiden tuoreet raportit ovat arviota heikompia ({reports_used} raporttia). |
| `photo_confirms_species` | A picker's photo confirms this berry grows here. | Poimijan kuva vahvistaa, että marjaa kasvaa täällä. |
| `low_confidence_species` | Confidence is kept low: little data for this berry, or little forest here. | Luotettavuus pidetään matalana: tästä marjasta on vähän tietoa tai alueella on vähän metsää. |

**CI test:** copy `ml/tests/golden/*.json` into `test/fixtures/ml/`. A unit test must (1) collect every code from the fixtures and from the table above, (2) assert each has a Finnish and an English template, and (3) render each with the fixture inputs, asserting no `{` or `undefined` is left in the text. A new code from the ML team then breaks CI, not users.

---

## 10. Testing

Same tooling as before (Jest, supertest, testcontainers with PostGIS, all migrations applied). For ML use `ML_MODE=mock` and, for the client itself, a local HTTP stub serving the golden files. Required cases:

**ML client**
- Request builders produce exactly the documented keys (assert with a strict schema; extra or camelCase keys fail).
- Retry once on 5xx and timeout, never on 4xx; error mapping to `ML_UNAVAILABLE` and `ML_REJECTED`.
- Golden responses parse into our types.

**Media and feedback**
- `/media/analyze`: happy path stores counts only (no bytes anywhere); replay returns 200 without a second ML call; another user's key gives 409; oversize gives 413; ML down gives 503 and inserts nothing; sixth photo for a submission gives 422.
- Feedback: only the caller's accepted visit works; a rejected or foreign visit does not; replay is idempotent; duplicate species gives 422; second submission for the same visit and species gives 409; flags are not in the response.
- `POST /reports`: unknown zone gives 404/422; stored with `visit_id` null.

**Flags and trust**
- The 11th submission in a Helsinki day gets `rate_limit_day` (check the day boundary at 00:00 Helsinki, not UTC); second visit-backed report for the same zone, species and day gets `duplicate_day`; a zone 60 km from the previous visit gets `far_from_last_visit`; no earlier visit means no flag.
- Flagged reports are excluded from consensus, scoring and `reports_7d`.
- `process_report`: consensus is `null` with fewer than 3 other users; trust moves as returned by ML; running the job twice changes trust once; a failed ML call leaves trust unchanged and the job retries.

**Scoring**
- `score_zones_daily`: paging and resume across several jobs; `coverage: "none"` writes no rows; zones without reports get the baseline copy; zones with reports enqueue recompute; seed rows are overwritten.
- `recompute_zone_score`: request body has only documented keys; `ripeness` comes from the baseline; `off_season` mapping; `s_feedback` rounded into `s_reports`; no reports means no ML call.
- The 7.3 example from `ml/API.md` (map 55, one fresh visit-backed report with 32 bilberries, trust 1.0) must produce the golden score through the mock.

**Jobs runner**
- Missing or wrong token returns 401 on both internal routes; the budget stops claiming new jobs; stale `running` jobs are reset; third failure sets `failed`; ML 422 fails immediately.

**Explanations**
- The CI test in Section 9; `/explanation` for a stored ML explanation returns at least 3 reasons in both languages.

---

## 11. Task plan (one PR per phase)

**Phase 0: Read the ground.** Read `ml/API.md` and the golden files. Check that `SELECT code FROM species` returns exactly `bilberry`, `lingonberry`, `cloudberry`, `crowberry`; if not, add a mapping table in config and raise it. Done when: assumptions are listed in the PR.

**Phase 1: Templates and explanation (adjustment 1).** New `templates.ts`, formatting rules, CI test, fixtures, update `explanation.v1.md`. Done when: the CI test passes and the seed rows no longer matter for tests.

**Phase 2: Contracts.** `docs/openapi/feedback.yaml` for `/media/analyze`, `/visits/{id}/feedback`, `/reports`, the admin routes, plus `docs/internal.md` for the internal routes. Done when: the YAML validates.

**Phase 3: Migration `0006` and types.** Done when: it applies to a fresh local database and to Supabase.

**Phase 4: `MlClientModule`** (live and mock) and its tests. Done when: the golden fixtures pass.

**Phase 5: Media analyze.** Done when: its e2e tests pass.

**Phase 6: Feedback and reports** with the fraud flags and idempotency. Done when: their e2e tests pass.

**Phase 7: Jobs engine** and the two internal routes, `vercel.json` cron. Done when: the runner tests pass.

**Phase 8: `score_zones_daily`** (6.6), the baseline copy, the seed cleanup migration. Done when: a run against the mock fills `zone_scores_current` for all covered zones.

**Phase 9: `process_report` and `recompute_zone_score`** (6.4 and 6.5). Done when: the golden scoring and trust tests pass.

**Phase 10: Cross-cutting changes** from Section 2 (items 3-8), the admin routes, and a final e2e run. Done when: every item in Section 2 is checked off in the PR description.

---

## 12. Open questions

1. **Vercel limits:** maximum function duration on the current plan (photo analysis and each job run); cron frequency allowed.
2. **Render cold start:** measured wake-up time, and whether a keep-alive ping is acceptable before demos.
3. **Species scope:** storing all four species for every zone replaces the "hide unsuitable species" assumption. Should the app hide very low scores?
4. **Multiple photos:** we sum counts per species across the photos of a submission. Confirm with the ML team if they expect otherwise.
5. **Consensus threshold:** at least 3 other users; otherwise `null`. Confirm.
6. **Late photos:** a photo arriving after the feedback only triggers a recompute, not a trust re-evaluation.
7. **History size:** the nightly job writes one history row per zone x species per day; plan a thinning rule later.
8. **Visits and scoring:** stay time is not used by the ML score. If the team wants it, it needs a new input in the ML contract.
