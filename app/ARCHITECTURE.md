# ARCHITECTURE.md — Picky

Describes the architecture as it **is**, then what is planned. Keep it
synchronized with significant architectural changes; the authoritative rationale
for each decision lives in [docs/adr/](docs/adr/).

Last updated: 2026-10-08 (initialization).

## 1. System context

```
┌──────────────────────────┐   HTTPS/JSON · /api/v1    ┌──────────────────────────────┐
│  Picky mobile app (app/) │  ───────────────────────▶ │  Picky API (backend/)        │
│  React Native + Expo     │  ◀─────────────────────── │  Python / FastAPI monolith   │
│  (untrusted client)      │                           │                              │
└────────────┬─────────────┘                           └────────┬─────────────────────┘
             │                                                  │
             │ push notifications (6.7)                         │ SQL / PostGIS
             ▼                                                  ▼
     Firebase Cloud Messaging                     PostgreSQL 17 + PostGIS + h3
```

- This file describes the **app**; the API is a sibling folder in the same
  repository ([`../backend/`](../backend)) and is being built in parallel
  (`../docs/architecture.md`). The app still sends nothing: no screen calls it yet.
- The contract is `/api/v1`, OpenAPI-first, with the app's client generated from it
  (`../CONTEXT.md` §7). Errors are RFC 9457 problem JSON.
- The mobile client is untrusted: it may be modified, its storage inspected and
  its network traffic replayed (SECURITY.md §2).

## 2. Repository layout

```
picky-berry-assistant/            # the team monorepo (root README, CONTEXT.md, CONTRIBUTING.md)
├── backend/                      # FastAPI modular monolith — Hassan
├── data/                         # zones, weather, NDVI, basemap pipelines — Awais
├── ml/                           # YOLO (WildBe), yield model — Remon
├── ontology/                     # OWL/Turtle + SPARQL alert rules — Asmer
├── docker/ · deploy/             # Postgres image, production compose, Caddy — Sabih
├── docs/                         # team-level features, architecture, ADRs, sprints
├── .github/workflows/            # data.yml, mobile.yml
└── app/                          # this folder: the Expo application (npm package "picky-mobile")
    ├── app.json                  # Expo config; native behaviour is configured here
    ├── assets/                   # icons, splash, images
    ├── docs/                     # the app's ADRs, API slice, design source, audits
    ├── e2e/                      # the Playwright layout and accessibility harness
    └── src/
        ├── app/                  # Expo Router routes (screens + layouts only)
        ├── components/           # Atomic Design layers shared across features
        │   ├── atoms/ molecules/ organisms/ templates/
        ├── features/             # feature slices (deep modules)
        ├── services/             # cross-cutting I/O adapters (api, storage, …)
        ├── config/               # validated runtime configuration
        ├── constants/            # design tokens and static constants
        ├── hooks/                # cross-feature React hooks
        ├── models/               # cross-feature domain types
        ├── state/                # app-wide state composition
        └── utils/                # pure helpers
```

Everything outside `app/` is the team's; the app owns `app/**` (CODEOWNERS: `/app/`).
The repo-level layout decision is [ADR-052](docs/adr/ADR-052-the-app-lives-in-the-team-monorepo.md),
which supersedes the mobile-only layout of ADR-015.

The bootstrap specification suggested `/app/` and
`/tests/`. The implemented layout puts routes in `src/app/` (the
current Expo template convention, and what `expo-router` resolves) and colocates
tests with the code they cover. Both deviations preserve the specification's
intent; they are recorded in ADR-002/ADR-004.

Only `app/`, `components/`, `config/`, `constants/`, `features/`, `hooks/`,
`services/` and `utils/` exist so far. `models/` and `state/` are reserved homes for the
first code that needs them — empty folders are not committed.

`state/` has no tenant at the moment. Its first one, `shell-settings.tsx`, was the seam through
which the app shell handed the screen template the destination of a header settings control; the
control was removed on 2026-10-22 (the top bar carries the frame's heading and nothing else), and
the seam went with it rather than living on unused. The folder stays the home for **app-wide
composition** — the team plan's client stores (`docs/plans/team-mvp-plan.md` §2.1) are what will
fill it.

`utils/` is the home of the **pure helpers more than one layer needs**, and it has one tenant:
`identifier.ts` answers which of the two identifiers a typed string is, as a function of the string
alone. It lives here rather than in a feature because two features ask it and neither may import the
other's internals (onboarding's screen 04, whose title and change action follow the destination, and
privacy's account row, which must not print “Phone verified” over an address); it arrived from the
second on 2026-10-13 ([ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §4).
It validates nothing: whether the account service accepts an identifier is the provider's answer.

`services/i18n/` is the first tenant of `services/`: it reads the device's languages
and owns the copy (ADR-017). `services/session/` is the second: the authentication seam —
one session port (`signIn`, `current`, `signOut`) with a stand-in provider and an in-memory
session store behind it until the account service exists (ADR-028), holding the account's
identifier and the name it is shown under (ADR-029). It is a service rather than
a feature because onboarding, the app shell and the profile all need it and none of them owns
it. `services/location/` is the third: the position seam (ADR-045) — one port
(`requestAvailability`, `watch`) with `expo-location` behind it, asking for the foreground
permission only and keeping nothing. Like the session seam it is a service because more than
one feature needs it (the visit domain reads fixes, and the map will) and none of them owns
the device.

## The target from the team plan (recorded, not built)

The monorepo's documented architecture (`../docs/architecture.md`) **is** the team's MVP
architecture, and the app is its client. The recording of what the plan asks of the app is
[docs/plans/team-mvp-plan.md](docs/plans/team-mvp-plan.md);
[ADR-051](docs/adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md) records the direction.
In this file's terms, the target is:

| The plan's folder | What it is | Where it lands in this repository's rules |
| --- | --- | --- |
| `src/api/` | generated OpenAPI client + TanStack Query hooks | a **shared service** (`src/services/api/`), not a feature: more than one feature calls it |
| `src/db/` | Drizzle schema, migrations, the outbox table | a **shared service** (`src/services/db/`) behind a port; a feature's `domain/` rules stay pure and never query it |
| `src/sync/` | the sync engine (push outbox, pull deltas) | a **shared service** (`src/services/sync/`); it orchestrates features' writes and owns no rule of its own |
| `src/location/` | background task, geofences, visit state machine | the state machine is already `features/visits/domain/` (pure); geofencing and the background task join `src/services/location/` behind the existing `PositionSource` port ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)) |
| `src/map/` | MapLibre setup, offline pack manager, layers | a **shared service** (`src/services/map/`) plus a shared component; the map is used by Discover and by the visit screens |
| `src/features/` | map, visits, feedback, alerts, profile | already the repository's shape ([ADR-002](docs/adr/ADR-002-feature-based-modules.md)); the names match besides `map` (today `discover`) |
| `src/store/` | Zustand stores (UI, settings) | `src/state/`, this file's reserved folder for app-wide composition |
| `src/i18n/` | fi + en strings | exists as `src/services/i18n/` ([ADR-017](docs/adr/ADR-017-localization.md)) |

The plan's `app/` group names differ from the routes built here: it draws `(tabs)/map.tsx`,
`visits.tsx`, `alerts.tsx`, `profile.tsx` and `(auth)/login.tsx`, `register.tsx`; this repository has
`(app)/discover.tsx`, `visits.tsx`, `alerts.tsx`, `privacy-settings.tsx` and the sign-in and sign-up
screens at the root. Renaming the tree is a routing change with its own tests (the shell's
destination table, the layout harness's destination presses and the accessibility walk's 24 routes),
so it is one ticket rather than a side effect of adopting the plan.

## 3. Frontend architecture

### 3.1 Layering and dependency direction

```
screens (src/app/**)
    │  thin adapters: layout + feature public API
    ▼
features/<feature>/index.ts        ← the only import path other code may use
    │
    ├── components/   feature UI (may use shared atoms/molecules/templates)
    ├── hooks/        React glue: wiring, effects, data access
    ├── domain/       PURE business rules: types + functions, no React, no I/O
    └── services/     feature-scoped I/O adapters
    ▼
shared: components/ · config/ · constants/ · hooks/ · services/ · utils/
```

The first product slice, `src/features/visits`, follows this shape: `domain/` holds
zone containment and the visit lifecycle as pure functions over an immutable state,
while a location source and any persistence are deliberately absent — they will
arrive behind the feature's own boundary.

Rules enforced in review:

- Shared code never imports from `features/**`.
- Features do not import each other's internals; cross-feature needs go through
  the other feature's `index.ts`, or move to shared code if they are truly common.
- `domain/` is deterministic and side-effect free, which is what makes the
  business rules unit-testable without any React or network machinery.

### 3.2 Atomic Design

`atoms/` (AppText, AppButton) → `molecules/` (Card, InfoRow) → `organisms/` →
`templates/` (Screen) → screens in `src/app/`. Components receive data and
callbacks; they never fetch, authorise, or apply business rules. `organisms/` is
currently empty and will fill as feature UI grows.

### 3.3 Theming

`src/constants/theme.ts` is the single source of design tokens (colour per scheme,
spacing scale, radii, typography, content width). `resolveColorScheme` maps a
system value to `light`/`dark` with `light` as the explicit fallback;
`useAppTheme()` exposes the resolved theme to components. No component hard-codes
a colour, spacing or font size.

### 3.4 Routing and navigation

Expo Router file-based routes under `src/app/`: `_layout.tsx` (root Stack,
`SafeAreaProvider`, status bar), `index.tsx` (home), `+not-found.tsx`. Route files
only compose a template with feature public APIs. Typed routes and the React
Compiler are enabled in `app.json`.

### 3.5 Runtime configuration

`src/config/env.ts` is the only place that reads `EXPO_PUBLIC_*` variables. It is
a pure, dependency-free module returning a discriminated result
(`{ok: true, config} | {ok: false, problems}`) instead of throwing, so the UI can
present a readable problem list (defence against a crash-on-launch loop). Rules:
absolute http(s) URLs only, no embedded credentials, https required outside
development, clear-text http tolerated only for loopback hosts in development.
Unit values are *inlined at build time* by Expo, so a value change requires a restart —
never a runtime secret store. That substitution is textual, and it only reaches a literal
`process.env.EXPO_PUBLIC_<NAME>` read: looking a name up through a variable leaves the read
unset in the bundle (the runtime's `process.env` carries none of these names), which is how a
production build once answered `development` and accepted screen 04's stand-in code. Any new
read belongs in `declaredPublicEnv`, in that literal shape, and `e2e/production-export.spec.ts`
is where a production-only rule is checked.

Two consequences of that substitution worth knowing before building the app twice:

- **The inlined value is not part of any cache key.** Metro's transform cache is keyed on the
  source, so a second export of the same working tree with a different `EXPO_PUBLIC_*` set reuses
  the first one's transforms and bakes in the *first* build's environment — measured, not
  theorised: the harness's production export came out answering `development`. The harness now
  exports each variant alone and with `--clear` (TESTING.md §12); a release or preview build must
  not reuse a cache filled by another environment either.
- **A value that reaches the app is public by definition.** It is in the bundle, in whatever the
  app ships to a device, and no environment check makes it a secret (SECURITY.md §9).

### 3.6 State management

Not decided. No global state library is installed. The decision will follow the
first feature's real needs (server cache + offline queue are the likely drivers)
and will be recorded as an ADR.

### 3.7 Localization

The app ships in Finnish and English, with Swedish planned (ADR-017).
`src/services/i18n/` reads the device's languages through `expo-localization` and owns
the copy: English is the source language and its catalogue defines the key type, so a
new string without a translation fails the typecheck. Screens resolve copy with
`useTranslation()` and never carry user-visible literals — the rules and the review
requirement are in ADR-017, the wording itself in `src/services/i18n/locales/`.

The language is chosen by the operating system's per-app language setting; the app
declares its supported locales in `app.json` and has no language picker of its own.
Localized app metadata (display name, permission prompts) is not configured yet and
arrives with the first string that needs it.

## 4. Backend architecture (a sibling folder, being built)

The API is at [`../backend/`](../backend) in this same repository — one FastAPI image, a
modular monolith whose modules talk only through each other's `service.py`: `accounts`,
`zones`, `visits`, `feedback`, `trust`, `prediction`, `reasoning`, `analytics`, `ingest`,
`media`, plus APScheduler with a Postgres-backed job queue.

- PostgreSQL 17 + PostGIS + `h3` for zones, visits and geometry; S3-compatible storage
  for photos, tiles and models; FCM for 6.7's push alerts; the ontology's SPARQL rules
  live in `../ontology/`.
- The API owns every rule the client must not be trusted with — trust weighting, scores,
  authorisation, retention.
- It is not serving the app yet: the app reads the design's demo values or this phone's
  own records, and [`../data/test_zones.geojson`](../data/test_zones.geojson) is the mocks'
  stand-in for `GET /api/v1/zones`.

## 5. API boundary

Fixed by the team's conventions (`../CONTEXT.md` §7):

- HTTPS only outside local development (enforced by `src/config/env.ts`).
- `/api/v1`, OpenAPI-first: the FastAPI app generates the document and the app's
  TypeScript client is generated from it, so the two cannot drift. Errors are RFC 9457
  problem JSON; zone reads are GeoJSON.
- All responses treated as untrusted input and validated at the boundary before
  they reach domain code.
- A single HTTP client adapter under `src/services/api/` (not yet written) will
  own timeouts, retries, auth headers, error normalisation and request
  cancellation. Features must not call `fetch` directly.
- GeoJSON coordinates are EPSG:4326; measurements are done in EPSG:3067. Client-created
  writes carry a client-generated UUID as their idempotency key (`../CONTEXT.md` §7).

## 6. Data architecture

Nothing is persisted yet. Planned client-side layers: platform secure storage for
credentials (ADR-006), a local database for offline capture, and a sync queue.
Server-side: PostgreSQL + PostGIS. The data model, identifiers used in URLs, and
media storage ownership rules are undecided; object-level authorisation must be
enforced server-side for every resource.

## 7. Authentication and authorisation architecture (planned)

- Tokens obtained from the backend, stored only in platform secure storage
  (ADR-006), attached by the API adapter.
- Authorization is server-side in all cases; role and ownership checks are never
  trusted from the client.
- MFA is expected for privileged accounts once roles exist (SECURITY.md §5).

## 8. Offline architecture (planned, design accepted in ADR-005)

Capture flows must work without connectivity. Intended write path: validate
locally → persist locally with a client-generated idempotency key → mark pending →
retry with backoff when connectivity returns → server validates → reconcile →
mark synced. Duplicate suppression, conflict policy, ordering, partial failure and
visible sync state are required. Local storage must never silently discard user
data, and media uploads must validate type/size before being persisted.

## 9. External services

The team's stack names four providers, none of them integrated in the app yet:

- **Firebase Cloud Messaging** — push delivery for 6.7 (planned; the app sends no token).
- **Protomaps / OpenStreetMap** — the PMTiles basemap the project hosts (ADR-031).
- **FMI** and **Sentinel-2 (Copernicus)** — weather and NDVI, consumed by `../data/`, never
  by the app.
- **S3-compatible object storage** (MinIO in development) — photos, tiles, models; the app
  will upload through presigned URLs, never with a credential of its own.

Any additional provider (analytics, crash reporting, payments) must be chosen through a
documented comparison before integration. No third-party service is integrated today.

## 10. Deployment architecture

- **App:** EAS Build/EAS Submit, with OTA updates via EAS Update. `app.json` and
  `eas.json` carry the project and the three profiles; `android.package` is
  `fi.picky.app` and the iOS bundle identifier is still open (PROJECT.md "Open questions").
- **Backend:** one EU VM running the single FastAPI image behind Caddy
  (`../deploy/`), Postgres 17 + PostGIS alongside it, object storage for media
  (`../docs/architecture.md`).
- **CI:** verification only — [`../.github/workflows/mobile.yml`](../.github/workflows/mobile.yml)
  for the app and `data.yml` for the pipelines. Nothing deploys or publishes from CI.

## 11. Scalability strategy

Deliberately none beyond good defaults: a small team, a short timeline and low
operating cost. Scale decisions wait for real load data. The upgrade path
(stateless API, PostGIS-backed geospatial queries, object storage for media) is
chosen so that horizontal scaling stays possible without re-architecture.

## 12. Reliability strategy

- Fail-visible configuration instead of crash-on-launch.
- Explicit error states in the UI (loading / empty / error) for every data view.
- Retry with backoff and idempotency for offline sync.
- Bounded timeouts on network calls once the API adapter exists.
- No silent data loss: failed local writes surface to the user.

## 13. Observability strategy

Planned: structured client logs with no personal data, token-free error reports,
and a crashing-build signal. Not implemented. No analytics or crash-reporting SDK
is installed, and no logging helper exists yet; the first one must include
redaction rules from SECURITY.md §11.

## 14. Security boundaries

1. Mobile app ↔ API: the app is untrusted; the API authenticates and authorises
   every request and validates every payload.
2. App ↔ local storage: credentials in secure storage only; media and cached data
   treated as sensitive.
3. App ↔ third-party services: no secret may accompany the app; only public
   identifiers.
4. API ↔ data stores: least-privilege accounts, parameterised queries, row-level
   security where the multi-user model warrants it.

See [SECURITY.md](SECURITY.md) for the full baseline.
