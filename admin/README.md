# admin/ — operator console (feature E5)

A separate web application for the people who operate Picky. It is the "operator surface"
ADR-012 requires: the field app ships no privileged capability, and this client never runs on a
picker's phone.

Plan and status: [`../docs/features/E5-admin-tools.md`](../docs/features/E5-admin-tools.md).
API contract: [`../picky-server/docs/openapi/admin.yaml`](../picky-server/docs/openapi/admin.yaml).

## What it does

| Screen | Purpose |
|--------|---------|
| Overview | zone coverage, score freshness, report/visit volume, queue depth, recent audit |
| Operations | server-side freshness, coverage, queue-age, lease/stuck and data-quality checks with runbook links, unavailable capabilities, and running jobs with heartbeat and lease state |
| Analytics | daily reports/visits/signups, jobs finished, species coverage, score distribution |
| Zones | search by name/H3/id, filter by species, sort, open a zone |
| Zone detail | scores with confidence and ripeness, 30-day history, stored explanation, species fit, reports, visits, jobs |
| Queue | filter jobs, read payloads and errors, inspect worker/lease/heartbeat and stuck state, retry a finished job, optional live refresh |
| Moderation | triage reports by rating, reporter trust, age, species and zone; read-only until feature 6.5 |
| Accounts | search accounts, see trust and activity, change a role (audited), open an account |
| Account detail | identity, trust, active sessions, reports, visits and audit; revoke sessions with a reason |
| Feature lab | send any API request with the admin token, presets, recompute/retry actions |
| Audit log | search every privileged mutation or refusal by actor, action, target, request id or outcome; inspect reason and before/after evidence |

## Requirements

- Node.js 24 (the repository's CI version)
- A running `picky-server` with a database migrated to `0009_job_leases.sql`
- An account whose role is `admin`

## Local setup

```bash
cd admin
npm ci
cp .env.example .env        # optional; empty means the dev proxy
npm run dev                 # http://localhost:5173
```

Without `VITE_API_BASE_URL`, Vite proxies `/api` to `http://localhost:3000`, which is
`picky-server`'s default port. With it set, the browser calls that origin directly and the API's
CORS policy must allow the admin origin.

Create the first admin in `picky-server`:

```bash
cd ../picky-server
npm run db:migrate
npm run make-admin -- you@example.com
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run openapi:check
npm run build
```

`npm test` runs the Vitest/Testing Library harness. `npm run openapi:check` regenerates
`src/api/schema.d.ts` from the server's `admin.yaml` and fails if the committed file differs;
CI also runs it when either the admin app or the contract changes. `npm run build` writes a
static bundle to `dist/`. `vercel.json` rewrites unknown paths to `index.html`, so the
client-side routes work on a static host.

The generated schema is committed. New endpoint types should alias it directly; the older
hand-written interfaces remain because several response schemas are still
`additionalProperties: true` in the contract.

## Deployment

### Vercel

The console deploys to production **automatically when a change to `admin/` is merged into
`main`**. `vercel.json` carries everything that can live in the repository:

- build settings (Vite, `npm ci`, `npm run build`, output `dist/`), the SPA rewrite and the
  security headers;
- `git.deploymentEnabled`: only `main` deploys; other branches and pull requests do not;
- `ignoreCommand`: the build is skipped when nothing under `admin/` changed since the last
  deployment (`VERCEL_GIT_PREVIOUS_SHA`), so a server-only or docs-only merge does not redeploy.
  If that commit is not in Vercel's clone, the command errors and the build runs anyway.

One-time setup in the Vercel dashboard (needs someone who can install the Vercel GitHub app on
`khawajaawais1/picky-berry-assistant`):

1. **Add New → Project → Import** the repository.
2. **Root Directory:** `admin`. Framework and commands are read from `vercel.json`.
3. **Production Branch:** `main` (Project → Settings → Git; it is the default).
4. **API origin:** `.env.production` sets `VITE_API_BASE_URL` to the deployed `picky-server`,
   `https://picky-berry-assistant.vercel.app/api/v1`. To point elsewhere, set
   `VITE_API_BASE_URL` in Vercel (Production); the dashboard value wins. It is compiled into the
   bundle, so redeploy after changing it. The build **fails on purpose** when it is missing or
   not `https`: without it the console would call its own static domain instead of the API.
   A local `npm run build` also uses this file, so `vite preview` talks to production; use
   `npm run dev` (proxy to `localhost:3000`) for local work.
5. **API CORS:** add the console's production origin (e.g. `https://picky-admin.vercel.app`,
   no path) to `CORS_ORIGINS` on the API and restart it. The API allows only listed origins and
   rejects a wildcard.

Vercel deploys as soon as the merge lands; it does not wait for GitHub Actions. Branch
protection on `main` (required `admin` / `server` checks) is what keeps a failing change from
reaching production.

To deploy by hand from `admin/`: `npx vercel --prod`.

After a deploy, sign in and open **Operations** and **Map**. "API not reachable" means
`VITE_API_BASE_URL` or CORS is wrong; "not integrated with the API yet" means that API version
lacks the endpoint (deploy the matching `picky-server`).

`/api/*` is never rewritten to `index.html`, so a wrong API base fails visibly instead of
returning the SPA's HTML.

### Other static hosts

Build with `VITE_API_BASE_URL=https://<api-origin>/api/v1 npm run build`, publish `dist/`, send
every unknown non-`/api` path to `index.html`, copy the headers from `vercel.json`, and add the
origin to `CORS_ORIGINS`.

The bundle contains only the public API origin. No database URL, service key or JWT secret is
ever compiled into it.

## Security notes

- **Server-authorised.** Every `/api/v1/admin/*` route carries `@Roles('admin')`; this client's
  role gate is a convenience, not the control.
- **Tokens.** The access token lives in memory; the refresh token is in `sessionStorage`, which is
  tab-scoped. `localStorage` is never used. Moving the refresh token to an `HttpOnly` cookie needs
  an API change and a new ADR.
- **PII.** Emails and nicknames appear only on admin screens. No GPS track exists server-side
  (ADR-010), and none is shown here.
- **Audit.** Recompute, job retry, role changes and session revocation write `audit_log` in the
  same transaction, with reason, before/after state and outcome. The audit screen exposes the
  request id and evidence, and filters by actor, action, outcome and request id. Rejected
  `403`/`409` privileged attempts are recorded by the API; the database trigger makes audit rows
  append-only.
- **Static-host headers.** `vercel.json` sends a strict Content-Security-Policy (scripts, styles,
  fonts and images from the console's own origin only; `connect-src` limited to `'self'` and
  HTTPS origins, since the API origin is fixed at build time), `frame-ancestors 'none'`,
  `nosniff`, `no-referrer`, HSTS and a deny-all Permissions-Policy. A host other than Vercel must
  send the same headers. The bundle has no inline scripts or styles, so the policy needs no
  `unsafe-inline`.
- **Read-only by design.** Report verdicts and trust edits belong to features 6.5 and 6.3; the
  panel labels them as unavailable rather than inventing a rule.

## Layout

```
src/
  api/          client (refresh + RFC 9457 errors), response types
  auth/         session context, admin route gate
  components/   shell, UI primitives, dependency-free charts
  lib/          formatting, data hook, error messages
  pages/        one file per screen
  styles.css    design tokens and layout
```
