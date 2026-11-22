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

Apply the data engineer's baseline schema to the local database before running
the API migration. The baseline dump is intentionally not fabricated in this
repository: it must be generated from the verified source database. Migration
`0002` ensures PostGIS is enabled and looks for its types in `public` and
`extensions`. On managed databases, enable PostGIS first if the migration role
is not permitted to create extensions. Then run:

```powershell
npm run db:migrate
npm run seed:scores
npm run start:dev
```

The local example enables `DEV_AUTH_BYPASS`; never use it in production. The API
refuses to start in production when this bypass is enabled. Set
`DATABASE_URL`, `DB_SSL`, and `JWT_SECRET` for the target environment. CORS
currently allows requests from any browser origin; this does not replace API
authentication.

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

## Admin API (feature E5)

Every route under `/api/v1/admin/*` requires an `admin` role and answers `Cache-Control: no-store`.
Reads cover the dashboard, zones, jobs, reports, accounts, analytics and the audit log; writes
cover score recomputation, retrying a finished job and changing another account's role. Each write
records one `audit_log` row with the actor and the request id. The contract is
[`docs/openapi/admin.yaml`](./docs/openapi/admin.yaml) and is merged into Swagger UI at `/docs`.

The audit table is migration `0007_admin_audit.sql`; run `npm run db:migrate` before using the
console. The web client lives in [`../admin`](../admin/README.md).

## Validation

```powershell
npm test
npm run build
npm run lint
npm run openapi:lint
npm run db:check-a2
```

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
