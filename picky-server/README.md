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

Account and visit tables are added by migrations `0004` and `0005`. After
applying them locally, set `DEV_PICKER_PASSWORD` in `.env` to a local password
(10-128 characters), then run `npm run seed:users` to create/update the
development bypass account and picker row. Sign in as `picker@example.com`
using that configured password; reseeding updates the picker's password.
Promote an existing account with `npm run make-admin -- user@example.com`.
Password reset and external mail delivery are not included. Console mail mode
deliberately does not log verification tokens, links, or email addresses.

## Validation

```powershell
npm test
npm run build
npm run lint
npm run openapi:lint
npm run db:check-a2
```

`db:check-a2` and `db:types` require an accessible database. The health endpoint
is `GET /health`; authenticated API routes use the `/api/v1` prefix.
In non-production environments, Swagger UI is available at `GET /docs` and
renders the checked-in OpenAPI contract.

The k6 map load test is in `perf/zones.k6.js`. Set `API_BASE_URL`, `API_TOKEN`,
`SPECIES_CODE`, `CENTER_LAT`, and `CENTER_LNG` from the configured pilot
database, then run `k6 run perf/zones.k6.js`.
