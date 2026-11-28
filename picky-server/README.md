# Picky Server API

NestJS API for Berry Picker Assistant feature 6.2. The finalized endpoint,
database, and behavior requirements are in [`backend-api-brief.md`](./backend-api-brief.md).
The OpenAPI contract is [`docs/openapi/zones.yaml`](./docs/openapi/zones.yaml).

## Requirements

- Node.js 24.14.1 (see `.nvmrc`)
- Docker Desktop for local PostGIS
- A PostgreSQL/PostGIS baseline schema supplied by the data engineer

## Local setup

```powershell
Copy-Item .env.example .env
npm install
docker compose -f docker-compose.dev.yml up -d
```

On Apple Silicon, `postgis/postgis:17-3.5` has no arm64 manifest. Use a
multi-architecture build such as `imresamu/postgis:17-3.5`, or run the official
image with `platform: linux/amd64` and Docker Desktop's amd64 emulation.

Apply the data engineer's baseline schema to the local database before running
the API migration. The baseline dump is intentionally not fabricated in this
repository: it must be generated from the verified source database. Migration
`0002` ensures PostGIS is enabled and looks for its types in `public` and
`extensions`. On managed databases, enable PostGIS first if the migration role
is not permitted to create extensions. Then run:

```powershell
npm run db:migrate
npm run seed:zones   # committed 50-zone stub, for local development only
npm run seed:scores
npm run seed:users   # creates admin@picky.fi and picker@example.com
npm run start:dev
```

`seed:zones` loads `../data/test_zones.geojson` into `zones` and
`zone_species`; it is a development fixture, not the data engineer's verified
baseline, and refuses to run in production. The other seed commands create a
current score row per zone/species and the development accounts. Set
`DEV_PICKER_PASSWORD` and `DEV_ADMIN_PASSWORD` in `.env` before `seed:users`. The
default operator account is `admin@picky.fi` (override with `DEV_ADMIN_EMAIL`) and
signs in to the admin console with `DEV_ADMIN_PASSWORD`; the picker signs in with
`DEV_PICKER_PASSWORD`. Reseeding resets both passwords.

The local example enables `DEV_AUTH_BYPASS`; never use it in production. The API
refuses to start in production when this bypass is enabled. Set
`DATABASE_URL`, `DB_SSL`, `JWT_SECRET` and `CORS_ORIGINS` for the target
environment. CORS accepts only the browser origins named in `CORS_ORIGINS`
(the console and Expo web development origins by default); a wildcard is
rejected, and a deployed console's origin must be added. This does not replace
API authentication.

Account and visit tables are added by migrations `0004` and `0005`; `0006` lets the
email-token table hold password-reset tokens. After
applying them locally, set `DEV_PICKER_PASSWORD` in `.env` to a local password
(10-128 characters), then run `npm run seed:users` to create/update the
development bypass account and picker row. Sign in as `picker@example.com`
using that configured password; reseeding updates the picker's password.
Promote an existing account with `npm run make-admin -- user@example.com`.
### Password reset

`POST /api/v1/auth/password-reset` takes an email address and always answers `202` with no body,
so it cannot reveal which addresses have accounts. For an account it retires earlier unused reset
links and creates a new one: 32 random bytes, stored only as a SHA-256 hash, valid for one hour,
usable once. `POST /api/v1/auth/password-reset/confirm` takes that token and a new password
(10-128 characters), sets the password and revokes every refresh token, so each device signs in
again. Both are throttled. This follows the
[OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

The link points at `APP_PUBLIC_URL/reset-password?token=…`. External mail delivery is still not
included: console mail mode (`MAIL_MODE=console`) records that a verification or reset message
was requested and deliberately does not log tokens, links or email addresses.

## Picker feeds (reports, season)

The mobile app reads every picker-facing screen from these routes (contracts:
[`docs/openapi/feeds.yaml`](./docs/openapi/feeds.yaml) and
[`docs/openapi/feedback.yaml`](./docs/openapi/feedback.yaml)); all need a signed-in account.

| Route | What it serves |
|-------|----------------|
| `POST /visits/:id/feedback`, `POST /reports` | per-species feedback; idempotent on `submission_id` |
| `POST /media/analyze` | transient photo analysis; only detector counts and metadata are retained |
| `GET /zones/:id/reports` | a zone's recent reports, anonymous, with a trust label |
| `GET /me/reports`, `GET /me/season` | the picker's own reports and season totals |

Migration `0012_picker_feeds.sql` adds report details.
Migrations `0013_feedback_trust_prediction.sql` and `0014_remove_seed_scores.sql`
add the ML baseline, count-only photo results, feedback flags, and trust processing.
Photo bytes are held in memory only for inference; they are never written to disk,
the database, or logs. Feedback processing and zone-score updates run through the
PostgreSQL jobs queue.

### Running the API in local Docker

```bash
npm run db:migrate          # add --no-check-order if your local history was applied out of order
API_DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/picky \
  docker compose -f docker-compose.dev.yml --profile api up -d --build api
curl localhost:3000/api/v1/health
```

Leave `API_DATABASE_URL` unset to use the compose file's own `postgres` service instead. For the
Expo app, set `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` in `app/.env`: a development build
on a phone or emulator reaches it through the Metro host's address automatically.

## Admin API (feature E5)

Every route under `/api/v1/admin/*` requires an `admin` role and answers `Cache-Control: no-store`.
Reads cover the dashboard, zones, jobs, reports, accounts, analytics and the audit log; writes
cover score recomputation, retrying a finished job and changing another account's role. Each write
records one `audit_log` row with the actor, request id, reason, before/after state and outcome;
refused `403`/`409` privileged attempts are recorded as failures. The contract is
[`docs/openapi/admin.yaml`](./docs/openapi/admin.yaml) and is merged into Swagger UI at `/docs`.

The audit table is migration `0007_admin_audit.sql`, extended by `0008_audit_integrity.sql`; run
`npm run db:migrate` before using the console. Migration `0008` makes the table append-only at the
database level with a trigger that rejects `UPDATE` and `DELETE`. The web client lives in
[`../admin`](../admin/README.md).

The job queue is lease-based as of `0009_job_leases.sql`. The runner contract is in
[`docs/contracts/job-types.md`](./docs/contracts/job-types.md): `claim_job()` establishes a
five-minute lease, `complete_job()` fences completion to the current worker, and
`reap_stale_jobs()` requeues expired claims before the next claim.
The admin queue exposes the lease, heartbeat, worker id, recovery count and a derived stuck state;
operations health fails on an expired lease and warns when a live lease misses its heartbeat.

## Deploying to Vercel

Vercel runs this API as a serverless function and detects NestJS from `src/main.ts`. The deployed
API is `https://picky-berry-assistant.vercel.app` (Swagger at `/docs`). For a temporary cron test,
`vercel.json` schedules `/api/v1/internal/jobs/cron` daily at 12:25 UTC (14:25 Finland time on
November 28); restore the normal 03:00 UTC schedule after verification.

One-time project setup:

1. **Add New → Project → Import** the repository; **Root Directory:** `picky-server`.
2. **Environment variables** (Production):

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | the Postgres URL; use the provider's **pooled** (PgBouncer) URL |
   | `DB_SSL` | `require` |
   | `DB_POOL_MAX` | `2` — every function instance opens its own pool |
   | `JWT_SECRET` | 32+ random characters (`openssl rand -hex 32`) |
   | `CORS_ORIGINS` | the admin console's origin, e.g. `https://picky-admin.vercel.app` |
   | `APP_PUBLIC_URL` | the app's public origin (used in emails) |
   | `ML_MODE` | `live` |
   | `ML_SERVICE_URL` | ML API origin |
   | `ML_API_KEY` | server-only ML API key |
   | `JOBS_RUN_TOKEN` | secret for manual internal queue runs |
   | `CRON_SECRET` | Vercel Cron bearer secret |

   `DEV_AUTH_BYPASS` must be unset or `false`; the API refuses to start in production with it
   on. Without `CORS_ORIGINS` the API allows only the localhost development origins, so the
   deployed console is blocked.
3. **Migrations are not run by Vercel.** Before the first deploy, and whenever a migration is
   added, run them once against the production database from a machine that can reach it:
   `DATABASE_URL=<production url> DB_SSL=require npm run db:migrate`. A database that already
   ran `0007_admin_audit` / `0008_audit_integrity` needs those `pgmigrations` rows renamed to
   `0010_admin_audit` / `0011_audit_integrity` first.
4. **First admin:** `seed:users` refuses to run in production. Register an account, then
   `DATABASE_URL=<production url> DB_SSL=require npm run make-admin -- <email>`.

After a deploy: `GET /api/v1/health` answers `200`, `/docs` shows the contract, and an unauthenticated
`GET /api/v1/admin/overview` answers `401` (a `404` means an old build without the admin API).
Then set the console's API origin (`admin/.env.production` or `VITE_API_BASE_URL` in the console
project) to `https://<this deployment>/api/v1`.

Serverless limits worth knowing: request throttling is kept in memory, so limits apply per
function instance rather than globally; and `/docs` is skipped, without failing the API, if the
OpenAPI files are missing from the bundle.

## Validation

```powershell
npm test
npm run test:e2e
npm run build
npm run lint
npm run openapi:lint
npm run db:check-a2
```

`npm run test:e2e` starts a throwaway PostGIS container, applies the test baseline and every
API migration, and covers the admin authorization matrix, moderation reads, session revocation
job retry failures, the worker claim/heartbeat/complete contract and stale-lease recovery. On
Apple Silicon it uses `imresamu/postgis:17-3.5`; x86 uses
`postgis/postgis:17-3.5`. Set `POSTGIS_TEST_IMAGE` to pin another compatible image. The test
baseline uses text H3 values because the PostGIS image does not ship h3-pg. Docker must be
running; the suite never uses the developer's local database.

`db:check-a2` and `db:types` require an accessible database. Every route is served under
the `/api/v1` prefix, health included (`GET /api/v1/health`); `GET /health` answers the same at
the root for platform probes. The routing, request-id, error-envelope and validation setup lives
in `src/configure-app.ts`, which `main.ts` and the e2e suite share.
Swagger UI is available at `GET /docs` in all environments and renders the
checked-in OpenAPI contracts. Its UI assets are loaded from a pinned jsDelivr
release; the merged document is available at `GET /docs-json`. The Vercel
project root should be `picky-server`.

The k6 map load test is in `perf/zones.k6.js`. Set `API_BASE_URL`, `API_TOKEN`,
`SPECIES_CODE`, `CENTER_LAT`, and `CENTER_LNG` from the configured pilot
database, then run `k6 run perf/zones.k6.js`.
