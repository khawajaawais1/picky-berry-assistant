# Feature E5 Deep Dive – Admin & verification tools

**Lead:** Salman (frontend) · **Co-owners:** Hassan (API), Sayeem (QA) · **Sprint(s):** 3–4 ·
**Status:** 🟡 v1 panel + admin API on `feature/salman/admin-panel`; not yet run against pilot data

> This is the plan **and** the record of what the branch builds. The split between "built now"
> (§9) and "next" (§11) is deliberate: the panel operates what the API already stores, and does
> not invent the modules that do not exist yet.

## 1. What we are building

The team needs one place to see what the service is doing, to exercise a feature without a
phone, and to make the few operator decisions the product already allows. That place is a
**separate web application for admins** — the "operator surface" ADR-012 requires. It is not a
screen in the field app: a field device must never hold a privileged token.

The panel answers three questions:

1. **Is the pipeline healthy?** Zone coverage, score freshness, queue depth, failed jobs,
   report and visit volume.
2. **What is in the data?** Search a zone, read its scores and explanations, read recent
   reports and visits, see what the database actually holds.
3. **Can I safely test a feature?** Trigger a score recomputation, retry a job, change an
   account's role, and send any API request from a request console — with every mutation
   recorded in an audit log.

**User stories**

1. As an admin, I want one dashboard of coverage, freshness and queue state, so I know whether
   a poor map is a data problem or a client problem.
2. As an admin, I want to search a zone and read its scores, inputs and reasons, so I can explain
   a strange score without opening a database client.
3. As an admin, I want to list and retry failed jobs, so a stuck pipeline does not need an SSH
   session.
4. As an admin, I want to change a teammate's role to admin, so onboarding does not need a
   command run on a laptop.
5. As a developer, I want a request console and quick actions, so I can test the API against the
   same data the app sees.
6. As an auditor, I want every privileged mutation recorded with actor, target and request id,
   so a change can be explained later.

**Acceptance criteria (definition of done)**

| # | Criterion | How we check |
|---|-----------|--------------|
| E5.1 | A non-admin token gets `403` from every `/api/v1/admin/*` route | API e2e test (picker token), and the SPA's role gate |
| E5.2 | An unauthenticated request gets `401` from every admin route | API e2e test |
| E5.3 | The dashboard shows zone coverage, latest score time, queue counts and 7-day volumes from the live database | Manual check against seeded/staging data; query review |
| E5.4 | Zone search filters by name/h3/id and species, with pagination and a sort order | Manual check; API contract in §4 |
| E5.5 | A zone page shows every current score, its explanation, recent reports, visits and jobs | Manual check |
| E5.6 | Recompute (all / one zone / one species) enqueues exactly one job per dedupe key | Existing behaviour + audit row |
| E5.7 | A finished job can be retried; a queued/running job cannot | API test of the conflict path; audit row |
| E5.8 | An admin can change another account's role, and cannot remove their own admin role | API test of the conflict path; audit row |
| E5.9 | Every mutation writes `audit_log` with actor, action, target, detail and request id | Query after each action |
| E5.10 | The panel builds, typechecks and has no console errors on the main routes | `npm run build`, manual smoke |
| E5.11 | No privileged token or personal data is placed in `localStorage` | Code review; session storage is tab-scoped |

**Not in this feature:** zone geometry authoring, moderation verdicts on reports (6.5 owns the
validation rules), trust-score editing (ADR-009 requires a versioned, auditable rule that does not
exist yet), media review (the media module is unbuilt), push-alert authoring, marketplace
operations, user impersonation, automated moderation, and localisation of the panel (operator
surface ships in English; FI/EN remains the field app's contract).

## 2. Dependencies

| ID | Dependency | Owner | Needed by | Stub until ready | Status |
|----|------------|-------|-----------|------------------|--------|
| D1 | Accounts, sessions and `admin` role in `picky-server` | Hassan | Sign-in, role gate | `DEV_AUTH_BYPASS` locally; `make-admin` script | ✅ built |
| D2 | Zones, `zone_scores_current`, `zone_scores` | Awais / Hassan | Zone screens | `seed-dev-scores` | ✅ built |
| D3 | `jobs` table and `JobsService.enqueue` | Hassan | Queue, recompute, retry | none needed | ✅ built |
| D4 | `reports` / `visits` tables | Hassan | Activity reads | seed `--with-reports` | ✅ tables, ⬜ report API |
| D5 | `audit_log` | Hassan / Salman | Audit trail | migration `0007` in this branch | ✅ this branch |
| D6 | Live API origin + CORS for the admin origin | Sabih / Hassan | Deployed panel | local Vite proxy | 🟡 `origin: *` today |
| D7 | Zone validation/moderation rules (6.5) | Hassan | Report verdicts, trust edits | read-only views now | ⬜ |

## 3. Architecture

```
admin/  (React SPA, static build)
   │  HTTPS + Bearer access token (15 min), refresh token (tab-scoped)
   ▼
picky-server  /api/v1/admin/*   ← every route @Roles('admin')
   │  SQL (pool, parameterised)
   ▼
PostgreSQL: zones · zone_species · zone_scores(_current) · reports · visits ·
            users · user_trust · jobs · audit_log
```

- **One public surface.** The panel talks only to `picky-server`; it never speaks to Postgres,
  Supabase or the Python worker directly. No service-role key ever reaches the browser.
- **Server owns authorisation.** The SPA hides actions a non-admin cannot take, but the API
  rejects them anyway. The role comes from the signed JWT claim, never from a request body.
- **Reuse, don't fork.** Sign-in, refresh rotation, error envelope, throttling and the RFC 9457
  problem shape are the existing auth API's. The panel adds no parallel auth system.
- **Static hosting.** Vite builds a static bundle; it can live on Vercel beside the API, or on
  any static host. `VITE_API_BASE_URL` is the only build-time setting.
- **Why a SPA and not Next.js.** No server rendering, SEO or server secrets are needed; a static
  SPA keeps the operator surface cheap and puts a hard boundary between browser code and the
  database. It also avoids a second server runtime in a €485/yr project.

## 4. API endpoints

All routes are under `/api/v1`, require a Bearer access token with `role=admin`, and return the
standard error envelope. Pagination is `page` (1-based) and `page_size` (default 25, max 100).

| Method & path | Returns |
|---------------|---------|
| `GET /admin/overview` | coverage, freshness, users/reports/visits/jobs counters, species, recent audit |
| `GET /admin/zones?q=&species=&sort=&page=&page_size=` | paged zone list with score/report summaries |
| `GET /admin/zones/{id}` | zone facts, geometry, scores + explanations, species fit, reports, visits, jobs |
| `GET /admin/jobs?status=&type=&page=&page_size=` | paged jobs + status counts |
| `POST /admin/jobs/{id}/retry` | `202` with the new or already-queued job |
| `GET /admin/reports?species=&zone_id=&min_rating=&page=&page_size=` | paged reports with reporter trust |
| `GET /admin/users?q=&role=&page=&page_size=` | paged accounts with trust and activity counts |
| `PATCH /admin/users/{id}/role` | changed role (body `{ "role": "picker" \| "buyer" \| "admin" }`) |
| `GET /admin/analytics?days=7\|30\|90` | daily series, species coverage, score distribution, top zones |
| `GET /admin/audit?page=&page_size=` | paged audit entries with actor email |
| `POST /admin/scores/recompute` | existing: `202` with `job_id`, `deduplicated` |

Example — `GET /admin/overview`:

```json
{
  "generated_at": "2026-11-22T10:00:00.000Z",
  "zones": { "total": 3500, "scored": 3400, "score_rows": 13600, "coverage_pct": 97.1,
             "latest_score_at": "2026-11-22T05:02:11.000Z", "stale_scores": 0 },
  "users": { "total": 42, "pickers": 40, "admins": 2, "buyers": 0, "new_last_7d": 5 },
  "reports": { "total": 120, "last_24h": 4, "last_7d": 30 },
  "visits": { "total": 88, "accepted": 84, "rejected": 4, "last_24h": 3, "last_7d": 20 },
  "jobs": { "queued": 1, "running": 0, "done": 310, "failed": 2, "done_7d": 40,
            "failed_7d": 2, "oldest_queued_at": "2026-11-22T09:55:00.000Z", "overdue": 0 },
  "species": [ { "code": "bilberry", "name_en": "Bilberry", "colour": "#5b4a9e" } ],
  "recent_activity": [ { "id": 9, "action": "scores.recompute", "target_type": "scores",
                         "target_id": null, "actor_email": "admin@example.com",
                         "created_at": "2026-11-22T09:50:00.000Z" } ]
}
```

Example — `PATCH /admin/users/{id}/role` answers `{ "id": "…", "email": "…", "role": "admin" }`.
Changing one's own role away from `admin` returns `409 SELF_DEMOTION_NOT_ALLOWED`.

The full contract is [`picky-server/docs/openapi/admin.yaml`](../../picky-server/docs/openapi/admin.yaml)
and is merged into Swagger UI at `/docs`.

## 5. Data model

One new table, added by `picky-server/migrations/0007_admin_audit.sql`. Nothing existing is
altered, so the ingest, scoring and app paths are untouched.

```sql
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,             -- e.g. scores.recompute, job.retry, user.role
  target_type text NOT NULL,        -- scores | job | user
  target_id text,
  detail jsonb NOT NULL DEFAULT '{}',
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_ix ON audit_log (created_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

- **Who writes:** `AdminService` only, inside the same transaction as the mutation it records.
- **Who reads:** admin routes only. The actor's email is joined on read (never snapshotted), so
  account deletion does not leave a duplicate copy of personal data in the log.
- **Retention:** the audit row contains ids and operator actions, not picker positions. It follows
  the 12-month retention decision (ADR-055); the row keeps working after the user row is deleted
  because `actor_id` becomes `NULL`.

## 6. Logic

- **Coverage** = zones with at least one current score ÷ all zones, one decimal.
- **Freshness** = newest `zone_scores_current.computed_at`, plus the count of score rows older
  than 24 h.
- **Queue depth** = count of `jobs` per status; "overdue" = queued and `run_at` older than 15
  minutes. The worker's own schedule owns the run time; the panel only reports it.
- **Recompute** keeps the existing dedupe keys (`recompute_all`, `recompute:<zone>`), so repeated
  clicks do not queue a flood.
- **Retry** uses `retry:<job id>` as its dedupe key and only accepts `done` or `failed` jobs.
- **Role change** refuses to remove the acting admin's own admin role; every other change is
  allowed and audited. The database's `role` CHECK remains the final constraint.
- **Analytics** fills missing days with zero in the API, so the chart does not invent gaps.

## 7. Screens and states

| Route | Screen | What it shows |
|-------|--------|---------------|
| `/sign-in` | Sign in | email + password, role check, API origin, error state |
| `/` | Overview | coverage, freshness, volumes, queue, quick actions, recent audit |
| `/zones` | Zones | search, species filter, sort, pagination |
| `/zones/:id` | Zone detail | facts, geometry summary, scores + explanation, history chart, species fit, reports, visits, jobs |
| `/jobs` | Queue | status counts, filters, live refresh, retry |
| `/reports` | Reports | filters and reporter trust; read-only until 6.5 lands |
| `/users` | Accounts | search, role, trust, activity, role change |
| `/analytics` | Analytics | daily trends, species coverage, score distribution, top zones |
| `/lab` | Feature lab | request console, presets, recompute/retry actions, environment |
| `/audit` | Audit log | who changed what, when, with request id |

Every data screen has loading, empty, error (with request id and retry) and permission-denied
states. A session that is not `admin` sees the sign-in screen with the reason, never a blank
shell. Layout: a fixed left rail, a sticky top bar, and one scrolling content column; below
900 px the rail becomes a horizontal nav. Colour is never the only signal — every score, status
and role carries a text label as well as a colour.

## 8. Privacy and security

- **ADR-012:** privileged capability lives here, not in the field app; this client carries the
  privileged token and nothing else privileged is shipped to phones.
- **Tokens:** the access token stays in memory; the refresh token is in `sessionStorage`, which
  is tab-scoped and cleared when the tab closes. `localStorage` is not used. A production
  hardening step is an `HttpOnly` refresh cookie, which needs an API change and an ADR.
- **No secrets in the bundle.** Only the public API origin is compiled in. No database URL, no
  service key, no JWT secret.
- **Authorisation is server-side.** `@Roles('admin')` on the whole controller; the client is a
  convenience, not a control.
- **PII:** emails and nicknames appear on admin screens only. Reports are shown with the
  reporter's trust band, never their position history. No GPS track exists server-side (ADR-010).
- **Audit:** every mutation is recorded with the request id already emitted by the API, so a
  support conversation can join the log line to the action.
- **Transport:** HTTPS only in deployment. Today `picky-server` enables CORS for `*`; before
  production the allow-list must name the admin origin (see §11).
- **Throttling:** admin mutations inherit the API's throttler and the tighter per-route limits on
  sign-in and recompute.

## 9. Build plan

| Phase | Deliverable | State |
|-------|-------------|-------|
| 0 | This plan; branch `feature/salman/admin-panel` | ✅ |
| 1 | `audit_log` migration and audit writer | ✅ this branch |
| 2 | Admin read API: overview, zones, jobs, reports, users, analytics, audit | ✅ this branch |
| 3 | Admin mutations: role change, job retry, recompute + audit | ✅ this branch |
| 4 | SPA foundation: Vite/React/TS, auth, shell, design tokens | ✅ this branch |
| 5 | Screens: overview, zones, zone detail, jobs, reports, users, analytics, lab, audit | ✅ this branch |
| 6 | OpenAPI contract, e2e authorisation tests, build/typecheck | ✅ this branch |
| 7 | Run against staging with pilot data; role/audit/retry checks; Vercel project + CORS allow-list | ⬜ next |
| 8 | Zone geometry authoring, report verdicts (6.5), trust-rule editor, media review | ⬜ next |

The panel is deliberately built against the tables that exist. Report moderation and trust edits
are shown as read-only and labelled with the feature that owns them, rather than guessed into
existence.

## 10. Testing

- **API e2e:** anonymous → `401`, picker → `403` for every admin route; role change conflict and
  retry conflict are exercised when a test database is available.
- **Query review:** every filter is parameterised; sort columns are chosen from a fixed map, never
  from the request string.
- **Frontend:** `tsc --noEmit` and `vite build` gate the branch. Route smoke is manual against a
  database; empty states are part of the acceptance check.
- **Data checks:** after `seed-dev-scores`, the overview's coverage should equal the seed's
  zone × species coverage; after `seed:users --with-reports`, report counts should match.

## 11. Risks and open questions

| Risk | Impact | Mitigation |
|------|--------|------------|
| The API is deployed with `CORS origin: *` | Any site could call it with a stolen token | Tighten to the admin origin + app origin before production (Hassan/Sabih) |
| Refresh token in `sessionStorage` is XSS-reachable | Token theft through a future XSS | CSP on the static host, no third-party scripts, `HttpOnly` cookie later |
| Admin queries scan large tables (`reports`, `jobs`) | Slow panel on a big pilot | Indexes exist for zone/time paths; add `created_at` indexes if p95 > 500 ms |
| Report moderation is read-only | Admins cannot resolve a bad report yet | 6.5 owns the verdict rules; the panel adds the action when the service exposes it |
| Trust scores are read-only | No manual trust overrides | Deliberate: ADR-009 requires a versioned rule and an explanation; a free-number editor would violate it |
| Panel and app drift on vocabulary | Two names for one concept | Both link to CONTEXT.md's glossary; domain terms are copied, not re-invented |
| No SSO or finer roles | One stolen admin session is broad | Audit log, short access token, 5/min sign-in throttle; viewer/operator roles next |

**Open questions**

1. Should the admin panel share the picker's login origin, or get its own OIDC client? — Hassan.
2. Does the course demo need zone drawing before 17 Dec, or is recompute + inspection enough? —
   Sayeem.
3. Which static host: Vercel beside the API, or the team VM behind Caddy? — Sabih.
4. Is a 12-month audit retention enough for the course report? — Sayeem.
