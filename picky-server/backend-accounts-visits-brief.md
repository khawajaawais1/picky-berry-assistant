# Backend API Brief: Features 6.1 (Accounts and roles) and 6.3 (GPS visit detection, server side)

**Project:** Berry Picker Assistant (Team Picky, TIES4570 CSDP)
**Audience:** GitHub Copilot coding agent.
**Extends:** `docs/backend-api-brief.md` (the 6.2 brief). **Everything in that file still applies**: stack (NestJS, `pg` + Kysely, `node-pg-migrate`), Supabase connection, error format, `snake_case` JSON, contract-first OpenAPI, RLS on every table, Postgres-as-queue, testing approach. This brief only adds and changes what is listed here.
**Where to put it:** `docs/backend-accounts-visits-brief.md`, and add a line to `.github/copilot-instructions.md`.
**Source of truth for behaviour:** `docs/bpa-mvp-architecture.md`, sections 4, 6.1, 6.3, 6.9, 7, 12, 13.

---

## 0. Rules for the agent

1. Same rules as Section 0 of the 6.2 brief (do not invent, small PRs, no secrets in git, contract first). Raise anything unclear as `TODO(question)` in the PR.
2. **Write the OpenAPI YAML first** (`docs/openapi/auth.yaml`, `docs/openapi/visits.yaml`, and the `/zones/near` change in `zones.yaml`), then the code.
3. **Never log** passwords, tokens, emails or coordinates. Log the user id only.
4. **Raw GPS tracks never reach the server.** Do not add any endpoint, column or log line that accepts or stores coordinates for a visit. The server only ever receives a zone id and two timestamps.
5. **Migration file numbers below are examples.** Use the next free numbers; the accounts migration must run before the visits migration.

---

## 1. What changes versus the 6.2 brief

| Area | 6.2 brief said | Now |
|---|---|---|
| Token issuance | "Decided by feature 6.1" | **This API issues tokens** (own JWT, own refresh tokens). Supabase Auth is not used |
| `JwtAuthGuard` | Verifies tokens only | Still verifies only; the new `AuthModule` issues them |
| `DEV_AUTH_BYPASS` user | Fake id, no row | Needs a real row in `users` (foreign keys now exist). A seed script creates it |
| `reports.user_id` | `NOT NULL`, no FK | Becomes nullable with an FK to `users` (anonymised on account deletion) |
| `reports.visit_id` | No FK | FK to `visits(id)` |
| `GET /zones/near` | Ranked by score only | Adds `sort=distance` for the phone's geofence set (Section 5) |

Error envelope stays the one from the 6.2 brief (`{ "error": { "code", "message", "details" }, "request_id" }`). The architecture document says RFC 9457 problem JSON; keep our envelope and raise it as an open question.

---

## 2. Database migrations

Plain SQL with `-- Up Migration` / `-- Down Migration` markers, applied with `npm run db:migrate`. Enable RLS (no policies) on every new table, as before. Use `text` plus a lower-case unique index for email, not the `citext` extension.

### 2.1 `0004_accounts.sql`

```sql
-- Up Migration

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  nickname text,
  role text NOT NULL DEFAULT 'picker' CHECK (role IN ('picker','admin','buyer')),   -- buyer is currently unused
  privacy_level text NOT NULL DEFAULT 'private' CHECK (privacy_level IN ('private','shared','public')),
  background_location boolean NOT NULL DEFAULT false,
  alert_radius_km int NOT NULL DEFAULT 10 CHECK (alert_radius_km BETWEEN 1 AND 100),
  species_interest text[] NOT NULL DEFAULT '{}',
  lang text NOT NULL DEFAULT 'fi' CHECK (lang IN ('fi','en')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,              -- SHA-256 of the opaque token; the token itself is never stored
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by uuid,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_ix ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('terms','privacy_policy','background_location')),
  version text,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consents_user_ix ON consents (user_id, kind, created_at DESC);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_tokens (                      -- email verification (password reset later)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Connect the 6.2 tables. If fake reports exist from seeding, delete them first.
ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL;      -- null = anonymised after account deletion
ALTER TABLE reports ADD CONSTRAINT reports_user_fk FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE user_trust ADD CONSTRAINT user_trust_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- Down Migration
ALTER TABLE user_trust DROP CONSTRAINT user_trust_user_fk;
ALTER TABLE reports DROP CONSTRAINT reports_user_fk;
DROP TABLE email_tokens, devices, consents, refresh_tokens, users;
```

### 2.2 `0005_visits.sql`

```sql
-- Up Migration

CREATE TABLE visits (
  id uuid PRIMARY KEY,                                  -- the phone's client UUID (idempotency key)
  user_id uuid REFERENCES users(id),                    -- nullable: anonymised on account deletion
  zone_id uuid REFERENCES zones(id),                    -- nullable only for rejected rows (unknown zone)
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_s int GENERATED ALWAYS AS ((extract(epoch FROM (ended_at - started_at)))::int) STORED,
  manual boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','rejected')),
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'rejected' OR zone_id IS NOT NULL),
  CHECK ((status = 'rejected') = (reject_reason IS NOT NULL))
);
CREATE INDEX visits_user_ix ON visits (user_id, started_at DESC);
CREATE INDEX visits_zone_ix ON visits (zone_id, started_at DESC) WHERE status = 'accepted';

ALTER TABLE reports ADD CONSTRAINT reports_visit_fk FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Down Migration
ALTER TABLE reports DROP CONSTRAINT reports_visit_fk;
DROP TABLE visits;
```

---

## 3. Feature 6.1: Accounts and roles

### 3.1 Environment (add to `.env.example`)

```env
JWT_SECRET=change_me_long_random
ACCESS_TOKEN_TTL_S=900            # 15 minutes
REFRESH_TOKEN_TTL_DAYS=30
MAIL_MODE=console                 # console = print the verification link to the log (dev); smtp later
APP_PUBLIC_URL=http://localhost:3000
```

### 3.2 Rules

- **Passwords:** `argon2` npm package, **Argon2id**, memory 19456 KiB, time cost 2, parallelism 1. Length 10-128. Never log or return the hash.
- **Access token:** JWT HS256 signed with `JWT_SECRET`, claims `sub` (user id), `role`, `iat`, `exp` (15 min). No database lookup per request (a deleted user's access token stays valid until it expires; accepted).
- **Refresh token:** 32 random bytes, base64url, returned once. Only its **SHA-256 hash** is stored. Valid 30 days. **Rotated on every use.**
- **Reuse detection:** presenting a refresh token that was already rotated (`revoked_at` set) revokes **all** of that user's refresh tokens and returns 401.
- **Email:** trim and lower-case before storing and comparing. Unique among non-deleted users.
- **Roles:** `picker` by default. No endpoint can set `admin`; promote with `scripts/make-admin.ts <email>`.
- **Consent at registration:** `terms` and `privacy_policy` must be granted (else 422 `CONSENT_REQUIRED`); `background_location` is optional. Store one `consents` row per kind with the version string.
- **Email verification:** registration creates a 24 h token, hashes it, and calls `MailService.sendVerification(email, link)`. In `console` mode the link is logged. Login is allowed before verification; `/me` returns `email_verified: false` until then (open question below).
- **Timing:** for an unknown email, still run one dummy Argon2 verification so response time does not reveal which emails exist. Login errors are always the same generic 401.
- **Rate limits** (`@nestjs/throttler`, named limits): login 5/min per IP + email, register 5/min per IP, all other write endpoints 60/min per user. All switchable off with `THROTTLE_DISABLED=true` for load tests.

### 3.3 Endpoints

All under `/api/v1`. "Auth" column: none = `@Public()`.

| Method and path | Auth | Purpose | Success |
|---|---|---|---|
| `POST /auth/register` | none | Create picker account, record consent, send verification | 201 |
| `POST /auth/login` | none | Email + password → tokens | 200 |
| `POST /auth/refresh` | none (refresh token in body) | Rotate tokens | 200 |
| `POST /auth/logout` | user | Revoke the presented refresh token | 204 |
| `POST /auth/verify-email` | none | Consume verification token | 204 |
| `GET /me` | user | Profile | 200 |
| `PATCH /me` | user | Update nickname, interests, alert radius, language | 200 |
| `PATCH /me/privacy` | user | Privacy level and background-location flag | 200 |
| `POST /me/devices` | user | Register or refresh an FCM token | 204 |
| `POST /me/export` | user | GDPR export | 200 |
| `DELETE /me` | user | Delete account (Section 3.5) | 204 |

`POST /auth/verify-email` is an addition to the architecture's endpoint list; mention it in the PR so the document is updated.

**Register** body:

```json
{
  "email": "anna@example.com",
  "password": "at-least-10-chars",
  "nickname": "Anna",
  "lang": "fi",
  "consents": { "terms_version": "2026-10", "privacy_policy_version": "2026-10", "background_location": false }
}
```

**Register / login / refresh** response:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "kJ3...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": { "id": "uuid", "email": "anna@example.com", "nickname": "Anna", "role": "picker" }
}
```

**`GET /me`** response: `id, email, email_verified (bool), nickname, role, privacy_level, background_location, alert_radius_km, species_interest, lang, created_at`.

**`PATCH /me`** accepts `nickname` (1-30 chars), `alert_radius_km` (1-100), `species_interest` (array of codes validated against `species.code`), `lang` (`fi` | `en`). Unknown fields are rejected.

**`PATCH /me/privacy`** accepts `privacy_level` (`private` | `shared` | `public`) and `background_location` (bool). Rules: `public` requires a nickname (else 422). Changing `background_location` also inserts a `consents` row of kind `background_location`. Default level is `private`. Only `private` and `public` have server meaning today (see Section 6); `shared` is stored for a later feature.

**`POST /me/devices`** body `{ "fcm_token", "platform": "ios" | "android", "app_version" }`. Upsert by `fcm_token`; if the token belonged to another user, move it to the current user.

### 3.4 `POST /me/export`

MVP: respond `200` with a JSON document containing the user's profile, consents, devices (token redacted to its last 6 characters), visits, and reports. The architecture says "zip by email link"; that delivery is a later step. List it as a deviation.

### 3.5 `DELETE /me`

Body `{ "password": "..." }`. Wrong password → 401. In **one transaction**:

1. Revoke all refresh tokens, delete devices, consents-unrelated email tokens.
2. Set `users.deleted_at = now()`, `email = 'deleted+<id>@invalid.local'`, `nickname = NULL`, `password_hash = ''`, `species_interest = '{}'`.
3. Anonymise: `UPDATE visits SET user_id = NULL`, `UPDATE reports SET user_id = NULL` for this user (zone history stays correct).
4. Insert a `jobs` row `purge_personal_data` (payload `{ "user_id" }`, dedupe key `purge:<user_id>`) for later photo and object-storage cleanup by the Python worker.

Return `204`. The nightly purge of expired tokens and retention rules (visits and reports kept 3 years) belongs to the Python worker later; until then a one-line SQL `DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days'` run manually is enough.

### 3.6 Guards and dev helpers

- Keep `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()` from the 6.2 brief; wire them to the token claims above. `req.user = { id, role }`.
- `DEV_AUTH_BYPASS=true` injects the fixed dev admin (`id 00000000-0000-0000-0000-000000000001`). `scripts/seed-dev-users.ts` creates that row plus one normal picker (`picker@example.com`). The app still refuses to boot if the bypass is on in production.
- `scripts/make-admin.ts <email>` sets `role = 'admin'`.

---

## 4. Feature 6.3: Visits (server side only)

Detection runs on the phone: geofences for the 20 nearest zones, 10 minutes inside to start, 5 minutes outside to end. The server receives a finished visit and validates it.

### 4.1 `POST /api/v1/visits` (user)

Generate a new UUID for each new visit (`crypto.randomUUID()` in JavaScript or
`[guid]::NewGuid().ToString()` in PowerShell). Keep that `client_id` when retrying
the same visit; sending it again replays the original result, even if the body
has changed.

Body:

```json
{
  "client_id": "4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d",
  "zone_id": "00a2b3a5-620b-5076-bd7a-08fbd10c7a44",
  "started_at": "2026-11-20T23:10:00.000Z",
  "ended_at": "2026-11-20T23:15:00.000Z",
  "manual": false
}
```

This example has the minimum accepted duration of 300 seconds. Replace the
sample `client_id` with a newly generated UUID for each new visit.

Response (`201` for a new visit, `200` for a replay of the same `client_id`):

```json
{
  "id": "4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d",
  "zone_id": "00a2b3a5-620b-5076-bd7a-08fbd10c7a44",
  "zone_name": "<name returned for this zone>",
  "started_at": "2026-11-20T23:10:00.000Z",
  "ended_at": "2026-11-20T23:15:00.000Z",
  "duration_s": 300,
  "manual": false,
  "status": "accepted",
  "reject_reason": null,
  "idempotent_replay": false
}
```

**A rejected visit is still `201`**, with `status: "rejected"` and a `reject_reason`. The phone must not retry it.

**Algorithm** (inside one transaction):

1. Validate shapes (UUIDs, ISO timestamps). A header `Idempotency-Key`, if present, must equal `client_id`, else 422.
2. `SELECT pg_advisory_xact_lock(hashtext(<user_id>::text))` so two concurrent uploads from one user cannot both pass the overlap check.
3. If a row with `id = client_id` exists: same user → return it with `idempotent_replay: true` and status 200; different user → `409 VISIT_ID_CONFLICT` (reveal nothing else).
4. Decide the status. Apply these rules **in this order**; the first failure sets `reject_reason`:

| Order | `reject_reason` | Rule |
|---|---|---|
| 1 | `invalid_range` | `ended_at <= started_at` |
| 2 | `in_future` | `ended_at > now() + 5 minutes` (allows clock drift) |
| 3 | `too_short` | duration under 5 minutes (300 s) |
| 4 | `too_long` | duration over 10 hours (36,000 s) |
| 5 | `zone_not_found` | `zone_id` not in `zones` (store the row with `zone_id = NULL`) |
| 6 | `overlap` | same user has an accepted visit whose time range overlaps (`tstzrange(started_at, ended_at) && tstzrange($3, $4)`) |

5. Insert the row (`ON CONFLICT (id) DO NOTHING` as a second safety net).
6. If accepted: enqueue job `recompute_zone_score` with payload `{ "zone_id" }` and dedupe key `recompute:<zone_id>` (same helper as the 6.2 brief, so it de-duplicates).

Constants (`MIN_VISIT_S`, `MAX_VISIT_S`, `FUTURE_TOLERANCE_S`) live in one config file.

### 4.2 `GET /api/v1/visits` (user)

The caller's own visits, newest first. Query: `limit` (default 20, max 100), `cursor` (opaque, base64 of `started_at|id`), `status` (`accepted` default, `rejected`, or `all`). Response:

```json
{
  "visits": [ { "id": "...", "zone_id": "...", "zone_name": "Laajavuori 3", "started_at": "...", "ended_at": "...", "duration_s": 2719, "manual": false, "status": "accepted", "reject_reason": null } ],
  "next_cursor": "MjAyNi0w..."
}
```

`next_cursor` is `null` on the last page. Only rows with `user_id = req.user.id` are ever returned; no endpoint reads another user's visits.

### 4.3 Not in this brief

`POST /visits/{id}/feedback`, `POST /reports`, media upload (6.4), trust (6.5), `GET /me/analytics` and `GET /analytics/zones/{id}` (6.8), alerts (6.7). Leave an empty placeholder module only if the build needs one.

---

## 5. Change to `GET /zones/near` (geofence support)

The phone refreshes its 20 geofences from this endpoint, so it needs the **nearest** zones by distance, with or without scores.

New query parameter `sort`: `score` (default, current behaviour) or `distance`.

| | `sort=score` (existing) | `sort=distance` (new) |
|---|---|---|
| `species` | required | optional (ignored) |
| Needs a score row | yes | no |
| `off_season` zones | excluded | included |
| Order | score desc, distance asc | distance asc |
| `limit` default / max | 10 / 50 | **20** / 50 |
| `radius_km` default / max | 10 / 50 | 10 / 50 |

Every item in both modes now includes the zone centroid. Items for `sort=distance`:

```json
{
  "origin": { "lat": 62.24, "lng": 25.75 },
  "radius_km": 10,
  "zones": [
    { "id": "...", "h3": "881260...", "name": "Laajavuori 3",
      "centroid": { "lat": 62.2431, "lng": 25.7482 }, "distance_km": 0.4 }
  ]
}
```

```sql
SELECT z.id, z.h3, z.name, ST_Y(z.centroid) AS lat, ST_X(z.centroid) AS lng,
       ST_Distance(z.centroid::geography, p.g) / 1000.0 AS distance_km
FROM zones z
CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS g) p
WHERE ST_DWithin(z.centroid::geography, p.g, $3)       -- $3 = radius in metres
ORDER BY distance_km ASC
LIMIT $4;
```

The phone draws a circle of about 400-500 m (an H3 res-8 hexagon has an edge of roughly 0.46 km) around each centroid and confirms with the polygon it holds from the offline snapshot. Update `docs/openapi/zones.yaml` and the existing tests.

---

## 6. Privacy: what the server does with `privacy_level`

- `private` (default): the user's visits and reports still count in scores and anonymous zone statistics, but no endpoint shows them to anyone else.
- `public`: reports may later show with the nickname (6.4, 6.5, 6.9).
- `shared`: stored only; behaviour is defined later.
- Zone statistics from visits (counts, median stay) are **not part of this brief**. When 6.8 adds them, they must show only anonymous zone-level numbers and only when at least **3 distinct users** contributed in the window.

---

## 7. Testing

Same tooling as the 6.2 brief (Jest, supertest, testcontainers with PostGIS; load `docs/db/baseline_ingest.sql`, run all migrations). Required e2e cases:

**Accounts**
- Register: happy path; duplicate email (case-insensitive) → 409 `EMAIL_TAKEN`; missing terms consent → 422 `CONSENT_REQUIRED`; password shorter than 10 → 422.
- Login: success; wrong password and unknown email give identical 401 `INVALID_CREDENTIALS`; sixth attempt in a minute → 429.
- Refresh: rotation works; reusing the old token returns 401 **and** the newest token no longer works either.
- Access-token expiry: an expired token returns 401; `@Public()` routes are open.
- Roles: a picker calling an admin endpoint gets 403.
- `/me` PATCH: invalid species code → 422; `public` without nickname → 422.
- Delete: wrong password → 401; success leaves the `users` row with `deleted_at` set and null PII, visits and reports with `user_id` null, tokens revoked, and the email can be registered again.
- Export returns the user's own data only.

**Visits**
- Accepted visit returns 201 and enqueues exactly one queued `recompute:<zone_id>` job even after 5 uploads for the same zone.
- Replaying the same `client_id` returns 200 with the same row and no second row; the same `client_id` from another user returns 409.
- One test per reject reason in the table in 4.1, including precedence (a 2-minute visit in the future is `in_future`, not `too_short`).
- Overlap: adjacent visits (end equals next start) are allowed; overlapping ones are rejected.
- Two simultaneous uploads of overlapping visits from one user: exactly one is accepted.
- `GET /visits`: only own rows, default hides rejected, pagination via cursor returns no duplicates or gaps.

**Zones near**
- `sort=distance` returns nearest first, includes an `off_season` zone and a zone without a score row, and works without `species`.
- `sort=score` is unchanged.

---

## 8. Task plan (one PR per phase)

**Phase 0: Check the ground.** Confirm the existing auth guard, throttler and `DEV_AUTH_BYPASS` code from the 6.2 work and note what exists. Done when: a short list of what is reused is in the PR.

**Phase 1: Contracts.** Write `docs/openapi/auth.yaml`, `docs/openapi/visits.yaml`, and the `zones.yaml` change. Done when: YAML validates and the Prism mock serves every endpoint.

**Phase 2: Accounts migration and seed.** `0004_accounts.sql`, `seed-dev-users.ts`, `make-admin.ts`, regenerate DB types. Done when: migration applies to a fresh local DB and to Supabase, and the dev bypass user exists.

**Phase 3: Auth core.** Password service, token service, `MailService` (console mode), register, login, refresh, logout, verify-email, throttling. Done when: the auth e2e tests pass.

**Phase 4: Profile and privacy.** `/me`, `PATCH /me`, `/me/privacy`, `/me/devices`, `/me/export`, `DELETE /me`. Done when: the matching e2e tests pass.

**Phase 5: Visits.** `0005_visits.sql`, `POST /visits` with the full rule table, `GET /visits`. Done when: all visit e2e tests pass, including the concurrency test.

**Phase 6: Near by distance.** Implement `sort=distance` with tests. Done when: the geofence test case passes and the 6.2 `/near` tests still pass.

For every phase: update the OpenAPI YAML if shapes changed, add tests, list assumptions and `TODO(question)` items in the PR.

---

## 9. Open questions

1. **Email delivery:** which provider sends verification mail (SMTP, Resend, other)? Until decided, `MAIL_MODE=console` only.
2. **Login before verification:** allowed in this brief. Should some actions (reports, public privacy level) require a verified email?
3. **Error format:** the architecture says RFC 9457 problem JSON; the API already uses `{ error: {...} }`. Pick one and align the app's generated client.
4. **Stack difference:** the architecture assumes FastAPI, SQLAlchemy and Alembic. The paths and JSON shapes in its Section 12 are the contract; this brief matches them, plus `POST /auth/verify-email`.
5. **Visit age limit:** should the server reject visits older than, say, 14 days? Not in the architecture; not enforced here.
6. **Export delivery:** immediate JSON now; zip by email link later.
7. **Password reset:** not in the architecture; add a `password_reset` purpose to `email_tokens` if the team wants it.
