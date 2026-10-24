# PROJECT.md — Picky

> **Status:** Initialization approved (2026-10-08); the design is being implemented screen
> by screen. **Every design frame except 02 has a built screen behind its route** (15–18 as the
> frames' own disclosed demo), each missing whatever needs a service, a permission or an owner
> decision that does not exist yet; the `visits` domain is implemented with no caller, and the
> position it waits for is real behind a port since 2026-10-12 — read only with the consent record,
> only in the foreground, and kept nowhere
> ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)). Sign-in is
> built: an authentication seam a real provider can be swapped into (ADR-028), and the screen the
> design never drew, app-drawn from the designer's answers and reached from both frames' own links
> (ADR-034) — with the two screens behind frame 14's remaining rows built beside it (ADR-039). The
> owner's shared-spots request (2026-10-10) has a shape too: three throwaway readings, one on each
> screen it could live on, so the design question can be answered by looking, and the first backend
> slice — accounts as identity-provider subjects and one server-enforced access rule, tested in
> this repository — is specified ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)) with no
> server, host, region or processor yet. See [Implementation status](#implementation-status).
>
> This document is the current source of truth for the project. It is a status
> document, not a chronological diary: update it when the project state materially
> changes, never for trivial changes.

Last updated: 2026-10-24.

## Purpose

Picky is a mobile field application. Per the bootstrap specification (a temporary
file, deleted on 2026-10-08 after initialization review), it supports field users
who:

- move between geographic zones and have their **visits detected from GPS**,
- record **feedback** about what they found, including **photos and video**,
- are scored on **quality/yield** and **trust**, and
- interact with a marketplace, rewards and safety alerts.

> **Assumption status.** The product description above is transcribed from the
> bootstrap instructions. The owner confirmed the geography and visit semantics on
> 2026-10-08 (see "Domain model decisions" below); the scoring semantics, users,
> roles and the commercial features are still unconfirmed. Terms in use are
> defined in [CONTEXT.md](CONTEXT.md).

## Domain model decisions

Confirmed by the product owner on 2026-10-08 (grilling session; definitions in
[CONTEXT.md](CONTEXT.md)):

1. A **zone** is an authoritative, operator-maintained area with a stable identity.
   Zones are not derived from data and are not user-created.
2. A **visit** opens on entering a zone and closes on leaving, but an entry only
   counts once a **dwell** minimum has elapsed, so pass-throughs are ignored.
3. Leaving and re-entering the same zone within a **grace window** continues the
   same visit, recorded as several **presence segments** — it does not create a
   second visit.
4. A **yield score** belongs to one visit and estimates what was found during it;
   it is derived server-side from that visit's feedback and evidence. A zone-level
   "quality now" figure is a derived aggregate with a recency policy, not the
   definition of the score.
5. A **trust score** belongs to one user and describes the reliability of their
   reports. It is server-side, never shown to other users, and never authoritative
   on the client.
6. Scores **may gate rewards/marketplace access**, but only through a versioned,
   server-side, auditable rule that records why a decision was made and can be
   explained to the affected user. See [ADR-009](docs/adr/ADR-009-scoring-model.md).
7. A user sees their own trust score as a **band plus reasons**, never as a raw
   number or its inputs; other users never see it at all.
8. The server persists, per visit: zone identity, timestamps, presence segments and
   **one coarse centroid per segment** — never raw GPS samples or tracks. Visit
   verification is therefore probabilistic, not proof. See
   [ADR-010](docs/adr/ADR-010-position-retention.md).
9. **Offline scope for v1 is capture only:** visits are detected and recorded
   on-device, and feedback with media queues and syncs; scoring, eligibility and
   anything requiring the server stay online-only. Cached reads for field use are a
   later increment: the map's zones are the first to land (2026-10-24,
   `picky.zones-cache.v1`), and an offline area and tile cache are still ahead.
10. **Privileged capability never ships in the field app.** Zone curation,
    moderation and trust/eligibility changes live in a separate operator surface
    with its own authentication and authorisation. See
    [ADR-012](docs/adr/ADR-012-privileged-surface.md).
11. **Identity is a managed provider; the account is ours.** Our backend stores no
    password, hash or reset token and verifies tokens the provider issued. The account
    row lives in the team's API; Firebase Authentication issues the credential
    ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md), which supersedes
    [ADR-013](docs/adr/ADR-013-identity-provider.md)).
12. ~~The backend lives in this repository at `apps/api` (FastAPI)~~ — **reversed by
    decision 20**, and the reversal is itself superseded: the app now lives at `app/` in the
    team monorepo, whose backend is the sibling `../backend/` (FastAPI). See
    [ADR-052](docs/adr/ADR-052-the-app-lives-in-the-team-monorepo.md).
13. **The team's API owns the account; Firebase issues the credential** (email +
    password, with reset, lockout and MFA at the provider; phone deferred). The API
    keeps one account row keyed by the provider subject — locale, consent, the name the
    session carries — verifies Firebase ID tokens against Google's public keys, stores
    no password, and treats a valid token as proof of identity only, never of privilege.
    See [ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md).
14. **No real money in v1.** Rewards are non-monetary (points, badges, quotas) and
    the marketplace is listing/exchange without payments. Any future payment flow
    needs its own ADR, provider research and compliance work.
15. **Retention is 12 months** for visits, presence segments, position-derived
    centroids, reports and evidence media, after which they are deleted or irreversibly
    de-identified; backups live 30 days, crash reports 90 and server logs 30; scores may
    outlive their inputs only without personal data; account deletion is immediate.
    Processors are EU-only. See [ADR-055](docs/adr/ADR-055-retention-and-processors.md).
16. **Visit policy is server-owned**, carrying a **version** so a decision made offline can be
    reconciled when the client sees the current policy; values are tuned server-side, never by
    shipping an app build. The app's `default-1` (5-minute dwell, 30-minute grace, one local day)
    was this repository's assumption; the team's pilot proposal is **10 minutes of dwell and
    5 minutes outside** to end a visit, still open until Salman's first field test
    ([`../CONTEXT.md`](../CONTEXT.md) §9) and the number the app should adopt when it lands.
17. **Evidence media is allow-listed and verified from content**: JPEG/PNG/HEIC
    images and MP4/MOV video, with size ceilings (25 MB image, 200 MB video),
    server-generated storage names and metadata (including GPS EXIF) stripped.
    Client-declared type, filename and metadata are never trusted.
18. **The Berry ontology is research-only for v1.** Species and taxonomy ship as
    ordinary server reference data with stable ids, so scoring never depends on
    RDF inference.
19. **App-store identifiers are deferred** to EAS setup; no placeholder bundle
    identifier or package name is committed.
20. **The app is `app/` in the team monorepo**, a standalone npm package inside
    `picky-berry-assistant/` beside `backend/`, `data/`, `ml/`, `ontology/`, `docker/` and
    `deploy/`. There is no `apps/` prefix and no npm workspace; CI is path-filtered to
    `app/**`. The previous decision — this repository is mobile-only and the app is its root —
    is superseded. See [ADR-052](docs/adr/ADR-052-the-app-lives-in-the-team-monorepo.md);
    decision 3 (where the backend lives) is the team's, answered by the monorepo itself.

Still open beside this list: which clock decides the calendar-day span (open
question 10).

## Users

Roles confirmed by the owner on 2026-10-08 (definitions in [CONTEXT.md](CONTEXT.md)):
**field users** who record visits and feedback in the mobile app, and **moderators**
who review reports and decide trust/eligibility outcomes in a separate operator
surface that is **not** this app (ADR-012).

Identity is delegated to a managed identity provider: the backend never stores user
credentials, and the app holds short-lived tokens only. The vendor is decided —
Firebase Authentication ([ADR-013](docs/adr/ADR-013-identity-provider.md)); the only
customer-facing roles in the field app are field user plus whatever read-only access
a user has to their own data.

## Requirements and features

Source: the bootstrap specification (deleted after review). Status legend: **planned** = not started,
**partial** = exists in skeleton form only, **not implemented**.

| #   | Capability                                              | Status          |
| --- | ------------------------------------------------------- | --------------- |
| 1   | Authentication and accounts                             | planned — **the first slice is specified** (2026-10-10): accounts as identity-provider subjects, one share record, one server-enforced access rule, all tested here (ADR-032, [docs/api-contract.md](docs/api-contract.md)). No backend, host, region or lawful basis yet (questions 3, 15, 16) |
| 2   | Map and geographic zones                                | planned — the app-side contract (the payload, its validation, what the app may claim, staleness and offline) and the owner's calls (source, curation, geometry, licensing) are out as [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) (2026-10-10); the containment and visit rules they would run on are implemented and tested with no caller |
| 3   | GPS visit detection (enter/leave zone → visit lifecycle) | **partial** — pure domain (containment + lifecycle) implemented and tested, and since 2026-10-12 the chain around it is real: position is readable through a port behind the picker's consent ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md): foreground only, nothing stored or logged), `presenceSamplesFor` joins a fix to the tracker, and `useVisitPresence` drives the tracker end to end ([ADR-046](docs/adr/ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)), tested against scripted zones. The app still tracks nothing in the field — the hook ships no zone list (a scripted one would be invented geography), nothing returns real rings (known issue 14), and the map carries no geography (known issue 12) — so no watch runs in the app; persistence and UI not started |
| 4   | Feedback capture, including photo/video evidence                | **partial** — the quick report's fields, its rating rule and the device queue; photo/video evidence is not started |
| 5   | Yield / quality scoring                                  | planned         |
| 6   | Trust scoring                                            | planned         |
| 7   | Alerts and notifications (FCM)                           | planned         |
| 8   | Analytics                                                | planned         |
| 9   | Marketplace                                              | **partial** — the design's four frames (15–18) are built as a disclosed demo behind their own routes (ADR-026): a real search over the app's two demo listings, the listing with its seller, the sample thread and the demo order with its arithmetic. No listings service, seller account, chat transport or payment provider exists, so nothing is listed, sent, bought or held |
| 10  | Rewards                                                  | planned         |
| 11  | Safety features                                          | planned         |
| 12  | Offline-first capture and synchronisation (v1 scope decided: capture only, no offline reads) | **partial** — reports are queued on the device (`src/services/report-queue.ts`) and listed back on screens 11 and 13; there is no transport, so nothing has ever been sent. Since 2026-10-24 the map's zones are the one read kept for offline use (`picky.zones-cache.v1`, `features/discover/services/zone-cache.ts`), which narrows decision 9's “no offline reads” to “no offline area or tile cache”; the team plan's §2.4 is the direction that made that read worth having |
| 13  | Diagnostics (build/config visibility for developers)     | planned — initialization slice retired 2026-10-08 |
| 14  | Design system primitives (atoms/molecules/templates)     | **partial** — tokens, four atoms, five molecules, the screen template |
| 15  | Design screens (frames 01 and 03–18)                     | **partial** — every frame except 02 is built and rendered by a route; each frame's unbuilt parts need a service, a permission or an owner decision, and are recorded as decisions 15–23 (frames 15–18 as ADR-026); since 2026-10-12 each remaining part records what it waits on ([ADR-044](docs/adr/ADR-044-the-partial-frames-remaining-parts.md)) |
| 15  | Localization (Finnish and English now, Swedish later)     | **partial** — the service, both catalogues and both built screens are localized and tested; the Finnish wording needs native review, and app metadata is not localized yet |
| 16  | Shared spots with invited people (the design's “community map”) | planned — **recorded as a requirement candidate on 2026-10-10 at the owner's request**; needs a design frame, a server and the zone service before any code (open question 26). Two things exist without it being built: three throwaway readings behind `?variant=` on `/discover`, `/zone-details` and `/saved-spots` (`npm run prototype:community-map`, production-gated, deleted once the designer picks one), and the **access rule the server must enforce**, written and tested here (ADR-032) |

Future (unscoped, from the bootstrap specification): RDFLib/Berry ontology
integration, YOLO-based image analysis, scikit-learn models, and any
server-side ML that supports scoring.

**Assumptions recorded from the design file** (owner-confirmed 2026-10-08):

1. Screen 02 offers a second path beside “I'm a picker”; it is **design exploration
   only**. v1 has field users and moderators — no buyer role (CONTEXT.md already lists
   buyer as not-a-role). If it becomes real, it is a requirements change, not a
   screen to build.
2. Screens 15–18 (marketplace, prices in €) and 13 (season-pass/trial shaped) are
   **design ahead of scope**, not v1 requirements; they agree with decision 14 (no real
   money in v1). The four marketplace screens were later **built as the frames' own
   disclosed demo** (2026-10-10, ADR-026) — drawn, labelled “Planned extra”, and reachable
   only by route — which does not change this assumption: nothing in the app lists, sells,
   sends or holds anything, and no part of the capability is in v1 scope.

**Recorded requirement: shared spots, at the owner's request** (2026-10-10). Asked for as “a
feature where we can see other berry pickers if they share their location for public”; the owner
then chose the design's own model rather than a live map of people:

1. **What is shared is a spot, never a position.** People share places they picked — the design's
   own word — and nobody's live location or track is involved. This is why the three sentences the
   app already ships stay exactly as they are: screen 05's “Your exact GPS tracks are never shown to
   other people”, screen 03's “Your GPS trails are never public” and frame 14's “Visibility applies
   to spots, not your route. Exact tracks are never shown to others.” The requested feature is the
   one those sentences describe; a live picker map would have required rewriting them, and that is
   **not** what was decided.
2. **Sharing is with people you invite** — the frame's own “Shared: people you invite” (node
   `5:23657`), a list the sharer controls and can revoke. The frame's third state, “Public: visible
   on the community map”, is recorded and **not** decided as in scope.
3. **Nothing is built until a frame exists** — the design file draws the sharing model but no share
   control and no community map — and until a server exists, because this is the first feature that
   would make the app **send** anything anywhere (SECURITY.md §17: nothing is sent today). Open
   question 26 carries the rest, and
   [to-questionnaire-community-map.md](to-questionnaire-community-map.md) is the ask to the design
   owner and the project owner.
4. **The design question is answerable by looking** (2026-10-10). `npm run prototype:community-map`
   opens **three throwaway readings**, each on the screen that reading would give the feature:
   other people's places as a second layer on frame 06's map (`/discover?variant=A`), a list under
   the zone's own screen (`/zone-details?variant=B`), and place cards carrying the sharer where the
   picker's own places live (`/saved-spots?variant=C`), with the prototype's bar navigating between
   the three. They are prototype code, not product code — no tests, hard-coded English, invented
   spots, ignored in a `production` build, and deleted once the designer picks one
   (`src/features/discover/components/prototype/`, `src/components/prototype/`). Nothing in them is
   sent, stored or logged, and they decide nothing: they are the paper §1 of the questionnaire is
   answered on.

## Compliance (owner requirement, 2026-10-08)

The app is offered in the EU, so **EU data protection (GDPR) and accessibility are
product requirements**, never a later hardening pass. The binding rules for every
change are in [AGENTS.md](AGENTS.md) §11, the checklists in
[SECURITY.md](SECURITY.md) §16 (data protection) and
[DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) (accessibility contract, contrast,
both languages), and the decisions that need the owner are open questions 15–19.

Already true today, because earlier decisions pointed this way: consent ships as an
affirmative action (open question 11), the consent itself is recorded on the device and
withdrawable on the screen the consent sentence names (ADR-020), position is derived into
per-segment centroids
rather than stored as a trace (ADR-010), GPS coordinates are never logged
(SECURITY.md §11), retention is 12 months (ADR-014), privileged capability never
enters this app (ADR-012), and every colour pair the app paints passes WCAG AA
contrast in both schemes, asserted by a test.

Accessibility target: **WCAG 2.2 AA, with 2.1 AA as the floor** — 2.1 AA is the level
EN 301 549, the European Accessibility Act's harmonised standard, incorporates.
Whether the EAA legally binds this app is open question 19.

Gap worth knowing: there is no static accessibility lint. `eslint-plugin-react-native-a11y`
(3.5.1, MIT, maintained) peer-caps at ESLint 8 while this repository runs ESLint 9, and
forcing the install would be the kind of silent bypass DEFINITION_OF_DONE.md forbids.
Until it supports ESLint 9, accessibility evidence comes from the per-screen tests, the
contrast suite, **the accessibility-tree walk over every built screen**
(`e2e/a11y-tree.ts`, the role/name/state contract read from the browser's own tree) and
review, and this is where a lint rule would go.

## Technology stack

Current, as implemented:

| Area            | Choice                                                      |
| --------------- | ----------------------------------------------------------- |
| Mobile          | React Native 0.86.3 + Expo SDK 57.0.27, Expo Router 57       |
| Language        | TypeScript 6.0.3, `strict`, path alias `@/*` → `src/*`       |
| Runtime         | React 19.2.3, Hermes, new architecture                      |
| Package manager | npm (lockfile committed at `app/package-lock.json`)         |
| Tooling         | ESLint 9 flat config (`eslint-config-expo`), Prettier 3, `tsc --noEmit` |
| Testing         | Jest 29 via `jest-expo` 57, React Native Testing Library 14  |
| CI              | GitHub Actions — `../.github/workflows/mobile.yml`, path-filtered to `app/**`, with `working-directory: app` |
| Backend         | The monorepo's sibling folder `../backend/` — one FastAPI modular monolith, PostgreSQL 17 + PostGIS + h3, S3/MinIO, FCM (Hassan); not serving the app yet |
| Identity        | The account row is the API's; Firebase Authentication issues the credential (email + password; phone deferred). The API verifies ID tokens against Google's public keys (ADR-054) |
| Design source   | Figma file “Picky” (`SFDhkQO0SDmWshHxpF6O7o`), reached through its remote MCP server via the project-scope `figma@claude-plugins-official` plugin (ADR-016). Inventory: [docs/design-source.md](docs/design-source.md) |
| Localization    | Finnish + English, Swedish later, chosen by the OS per-app language setting. `expo-localization` 57.0.2 + typed catalogues in `src/services/i18n/` (ADR-017) |
| Connectivity    | `expo-network` 57.0.2, read only to state the device's own network state (ADR-025); nothing about the connection is stored or sent |
| Device data     | `AsyncStorage` values, versioned and read strictly: the consent record, the saved plan, the report queue and the map's zone cache (`picky.zones-cache.v1`); no database yet |

Backend technologies, as the team's architecture document fixes them: Python/FastAPI
(one modular-monolith image), PostgreSQL 17 + PostGIS + h3, S3-compatible storage, RDFLib with
the Berry ontology, YOLO + XGBoost for scoring, Firebase Cloud Messaging, APScheduler with a
Postgres-backed job queue, Docker ([`../docs/architecture.md`](../docs/architecture.md)).

The team's MVP plan (recorded 2026-10-22 in
[docs/plans/team-mvp-plan.md](docs/plans/team-mvp-plan.md); direction
[ADR-051](docs/adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md), **Proposed**) puts the
backend on that same shape — one FastAPI modular monolith, PostgreSQL + PostGIS, one EU-hosted VM —
and adds, for the app: **MapLibre** with offline packs, a **generated OpenAPI client + TanStack
Query**, **Drizzle over SQLite** with an outbox and a sync engine, **Zustand** stores, **Maestro**
for mobile E2E and **Sentry** for monitoring. Of those, **MapLibre**, **TanStack Query** (with its
persist client), **Drizzle over SQLite** (`drizzle-orm`, `drizzle-kit`, `expo-sqlite`) and
**Zustand** are installed; the map and the query cache are the two wired — the cache keeps the
map's zones across launches (`picky.zones-cache.v1`) — while the local database, outbox, sync
engine and stores carry nothing yet. The generated client, **Maestro** and **Sentry** are not
installed, and each arrives with the endpoint or service that needs it.

## Architecture summary

- The Expo application at `app/` in the monorepo, layered `src/app` (routes) →
  `src/features/*` (deep modules) → shared `components`/`services`/`config`.
- UI follows Atomic Design; business logic is pure and lives in feature `domain/`
  modules, fully unit tested.
- Client configuration is validated at runtime by `src/config/env.ts` (https-only
  outside development, no credentials in URLs, no secrets in public variables).

## The team's MVP plan (2026-10-22)

The project is one student team's eight-week MVP (“Team Picky · TIES4570 CSDP”, final demo
17 Dec 2026), and the mobile app is this repository's part of it. The team's two planning documents
— an MVP architecture and tech stack, and a deep dive on the map feature — are transcribed in
[docs/plans/team-mvp-plan.md](docs/plans/team-mvp-plan.md), with exactly what was read and what was
not. [ADR-051](docs/adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md) records the direction
(**Proposed**):

- one FastAPI backend, reached through a **generated OpenAPI client** and **TanStack Query**;
- a **Drizzle/SQLite** cache with an **outbox** and a **sync engine** — every write carries a
  client-generated UUID, and the raw GPS track stays on the phone;
- **MapLibre** with real zone geometry and downloadable offline areas — since 2026-10-22 screen 06
  is exactly that over the pilot stub ([ADR-053](docs/adr/ADR-053-the-discover-map-is-real-geography.md));
  the downloadable offline areas are still ahead;
- the plan's **visit state machine** (20 nearest geofences refreshed every 2 km, 10-minute dwell,
  5-minute grace, a local notification for feedback);
- the plan's four species: **crowberry** was added to the app on 2026-10-22 as the fourth code,
  appended after the frame's three so the design's chip order is unchanged.

**This changes nothing that is built today**: the screens keep working while the transport, the
local database and the map are built behind them, and the Figma frames still decide what a screen
looks like ([ADR-016](docs/adr/ADR-016-figma-mcp-design-source.md)). Three things the plan touches
are still the owner's answers before the rest of it is built — the identity provider, the two
meanings of *yield score*, and which of the built screens the MVP keeps (open questions 28–29);
the drawn map's retirement on screen 06 has since been answered (ADR-053). Where the plan and this
repository disagree today is a table in the plan file, not a rewrite here.

Details, data flow and boundaries: [ARCHITECTURE.md](ARCHITECTURE.md).
Decisions and rationale: [docs/adr/](docs/adr/).

## Implementation status

Verified on 2026-10-24 in this repository:

| Check                                        | Command                          | Result |
| -------------------------------------------- | -------------------------------- | ------ |
| Type checking                                | `npm run typecheck`              | pass   |
| Linting                                      | `npm run lint`                   | pass (0 errors, 12 warnings in four files, 2026-10-24) |
| Formatting                                   | `npm run format:check`           | pass   |
| Unit/component tests                         | `npm test`                       | 118 suites, 1187 tests, pass (2026-10-24) |
| Layout in both languages and both text sizes, plus the app shell (each route's destination, the swap between them, and no bar on onboarding), the built consent controls' states, the chip rows' `aria-checked`, **the accessibility tree of every route the app has (25 today) and of the state each press in the journeys leaves behind** (role, accessible name and declared state on every control, and the walk's own probe), the discover flow's destinations, the walk-through to the queued report listed back, the sign-up → account row → saved plan → account surface → notice → the copy → sign-out journey, **a screen read while its own action is in flight** (screen 10's save, with the app's storage given a device's timing), and — against a second `EXPO_PUBLIC_APP_ENV=production` export — that a shipped build accepts no credential, mounts no prototype on every route either prototype's readings borrow, and redirects the development-only field-test route | `npm run test:layout` | 200 checks in the development export and 4 in the production one, pass (2026-10-24) |
| Expo dependency/config health                | `npm run doctor`                 | 21/21 checks pass (2026-10-21, after `npx expo install --fix` took the SDK 57 patch releases: `expo` 57.0.31 and its seven peers) |
| Production bundle builds                     | `npx expo export --platform ios` | pass (Hermes bundle produced) |
| Android bundle builds                        | `npx expo export --platform android` | pass (Hermes bundle, 2026-10-21) |
| Android demo APK                             | `npm run build:android:demo` (EAS) | built from this tree 2026-10-21 (see Deployment) |
| Dev server + web render (browser, no console errors) | `npm start` + browser    | pass   |

What exists:

- Project skeleton: routes (`src/app/_layout.tsx`, `index.tsx`, `+not-found.tsx`),
  design tokens, atoms (`AppText`, `AppButton`), molecules (`Card`, `InfoRow`),
  template (`Screen`), theme hook.
- The design screens built so far, as four features: `onboarding` (screens 01, 03 and 05; screen 04 is retired — ADR-059),
  `privacy` (frame 14 to the end of what the app can be true about — the account row, the settings
  rows, sign out, the account surface behind “Account & security”, the device notice behind “Terms &
  privacy” and the copy of the device's records that notice leads to), `discover` (screens 06–12,
  including the map drawn from the design's own
  geometry and the saved plan's list the design never drew) and `offline` (frame 13's sync
  centre), each with its own domain rules, its tests and both languages.
- The device's own report queue (`src/services/report-queue.ts`): what screen 10's “Save report
  offline” writes, on this phone, with nothing sent anywhere — and screens 11 and 13, which read it
  back so the picker can see what the app is keeping.
- The picker's own plan (`src/services/saved-zones.ts`): the zones screen 07's bookmark saves,
  each with the berry whose layer it was saved under, stored on this phone only and removable by
  the same control (ADR-024, ADR-061).
- The authentication seam (`src/services/session/`): one session port with a stand-in provider and
  an in-memory session, `/sign-in` and `/forgot-password`, and the reset request's Firebase
  adapter (`firebase-password-reset.ts`) — Identity Toolkit's `accounts:sendOobCode`, enabled by
  `EXPO_PUBLIC_FIREBASE_API_KEY`; when configured it sends the provider's email and keeps no
  address or token. Sign-in and account creation still wait for the account service (ADR-028,
  ADR-054, ADR-062).
- The first product slice, `src/features/visits`, as pure tested domain logic and
  the reference for the feature-module shape (single `index.ts` public API, pure
  `domain/` internals):
  `visit-policy` (defaults + validation of the server payload), `zone-containment`
  (point-in-polygon with boundary handling) and `visit-lifecycle` (dwell, grace
  window, presence segments, local-day span, duplicate/out-of-order rejection,
  immutable state transitions).
- Validated public configuration (`src/config/env.ts`) with security rules.
- Tooling: npm scripts, ESLint, Prettier, Jest, GitHub Actions CI, `.env.example`.

## Current work

**Screen-by-screen implementation from the Figma design** (owner-selected on
2026-10-08): one screen at a time, tests first, Tailwind classes for layout, then a
commit. Done: the onboarding screens 01, 03 and 05 (04 retired — ADR-059), the consent surface frame 14 promises,
the first seven core-picker screens — 06 · Discover map, 07 · Zone details, 08 · Route to zone,
09 · Active visit, 10 · Post-visit feedback, 11 · Visits and analytics and 12 · Alerts and
forecast — and frame 13's sync centre under account/offline (frames 13 and 14 are built in part,
and the core-picker screens are missing the parts that need a screen or a service that does not
exist yet). Screen 02 is design exploration only, per assumption 1 below, and screens 15–18
are built as the design's own **disclosed demo** rather than as a v1 capability (ADR-026).
**Every design screen except 02 and the retired 04 has a built screen behind its route**; what remains on each is
the part that needs a service, a permission or a decision that does not exist yet, and each of
those parts is recorded here.

Done — **the password-reset journey the design never drew** (2026-10-24, asked for as “Design and
build the password reset journey that ADR-059 records as missing, keeping the design's framing and
recording any departure”):

- **The app draws the request; the provider owns the reset.** `/sign-in` gains “Forgot password?”,
  and `/forgot-password` asks for the address the account uses and hands it to the session port.
  The adapter is `src/services/session/firebase-password-reset.ts`: Firebase Identity Toolkit's
  `accounts:sendOobCode`, enabled by `EXPO_PUBLIC_FIREBASE_API_KEY`. When configured, it asks
  Firebase to send the link; the provider hosts the page where a new password is set and owns the
  token. The app draws no new-password field and handles no reset token, so the way on after that
  page is `/sign-in` ([ADR-062](docs/adr/ADR-062-password-reset-belongs-to-the-provider.md),
  answering ADR-034 §1.5 and amending ADR-059 decision 4).
- **The framing is the sign-in screen’s, because there is no frame to keep.** The 76 px key tile,
  the onboarding header and back control, the design’s 54 px field and action and a text action
  back to sign-in; the copy is the app’s, in Finnish and English. Being frame-less, it is held to
  “nothing is lost at 200 %” rather than to a frame’s line counts.
- **No string claims a delivery, and the screen is not an account oracle.** The action says
  “Request reset link”; the confirmation says the request was **accepted** and that *if* an
  account uses the address, the provider’s link is the next step. The stand-in sends nothing, so
  a non-production build adds a test-build note saying no email is sent, and a production build
  draws the action disabled. Every address gets the same words, and one failure line covers a
  refusal without distinguishing an unknown account.
- **One new port operation, and nothing stored.** `SessionPort.requestPasswordReset(email)` joins
  `signIn`, `current()` and `signOut()`; it creates or changes no session and keeps no address,
  link or token. The password is still never stored.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1168 tests in 116
  suites**, including the port, the Firebase adapter and the screen), `npm run test:layout` green
  with the new `01c` entry measured in both languages at both text sizes, and the browser journeys
  walk sign-in → request → confirmation → sign-in and a production export with the reset action
  disabled.

Done — **screen 07 prints the zone’s own updated time** (2026-10-24, asked for as “Show each
zone’s own updated time on screen 07’s details, using the same timestamp the map now carries”):

- **The line reads the zone’s `updated_at`.** It is the payload’s instant — never the moment the
  screen read it or the cache restored it — and the same field frame 06’s “Last updated” line
  reduces, so the map and the details cannot state two ages for one answer.
- **It reuses the map’s words, not a second vocabulary.** `discover.map.updated` prints the day
  in the language’s long form (“Last updated 3 August 2026” / “Päivitetty 3.8.2026”), under the
  yield card where it describes the score it follows.
- **A missing instant prints no line.** The design’s sample has no source behind it, and the
  source’s zone may carry no usable timestamp; neither is given an instant the app cannot read.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1123 tests in 112
  suites**) and `npm run test:layout` green (**200 checks** in the development export and 3 in
  the production one); the browser journey opens the plan’s zone details and reads “Last updated
  3 August 2026”.

Done — **a saved zone remembers its berry** (2026-10-24, asked for as “Store the berry a zone was
saved under so the saved plan shows and opens the same score layer that was chosen on screen
07”):

- **The bookmark writes the layer it is reading.** Screen 07 already knows which berry its score,
  accent chip and season belong to; `saveZone` now takes that berry beside the zone, and the
  record keeps it (`picky.saved-zones.v1`, an optional field — ADR-061).
- **Old plans survive under the layer they always had.** An entry written before the widening
  parses with no berry rather than a guessed one, and the plan shows it under the pilot berry —
  exactly what it showed before. The key stays `v1` because nothing an old entry meant changed; a
  new key would have deleted every existing plan to add a field.
- **The plan reads each row from its own berry's answer.** `useZoneAnswers` asks the same
  `ZoneSource` once per distinct berry in the record, under the map's own query keys and
  persisted cache, and `savedSpots` resolves each record against that answer — not against
  whichever chip the map last read. A berry still answering leaves the rows hidden; a failed
  berry is stated while the layers that did answer are listed, with the record's ids kept.
- **The row and the route open the same layer.** A row prints the saved berry's name, score and
  season, and presses through to `/zone-details?zone=…&species=<saved berry>` — the destination
  frame 06's card uses.
- **The vocabulary is checked at the feature boundary.** The shared storage service can only
  demand a non-empty string; the plan's domain names the berry with `isSpecies` and falls back to
  the pilot berry for a value the app cannot name, as the route does with a query string.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1120 tests in 112
  suites**) and `npm run test:layout` green (**200 checks** in the development export and 3 in
  the production one); the browser journey seeds a lingonberry plan, reads “Laajavuori 1 ·
  Lingonberry”, and opens `/zone-details?…&species=lingonberry`.

Done — **the saved plan reads the zone source** (2026-10-24, asked for as “Put the saved plan on
the zone source so saved zones show their names and open their details again”):

- **A saved zone is resolved, not invented.** `savedSpots(zoneIds, zones)` maps each identifier
  in the record to the source's own `Zone`; the screen asks the same `useZones` port frame 06 and
  screen 07 read, for the pilot berry, so the plan shares their query cache and their persisted
  answer. A plan saved from screen 07 now shows the zone's name, score band and season instead of
  a bare UUID ([ADR-060](docs/adr/ADR-060-the-saved-plan-reads-the-zone-source.md)).
- **The row opens that zone's details again.** The plan passes a destination for every zone the
  source answers, and the route pushes `/zone-details?zone=<id>&species=bilberry` — the same
  destination frame 06's card uses, with the berry the row printed, so the score read and the
  score opened are one layer. `ZoneSourceRow` stays a reading when its caller gives no
  destination; the map's own list still does not, so nothing else started claiming a role.
- **The record's order and its unknowns survive.** The list keeps the record's order, including a
  repeated id written from outside the app. An identifier the source does not answer to is named
  and has no role — and there is **no fallback to `DEMO_ZONES`**, because a demo zone's figures
  under a real record's id would be worse than the identifier alone. An old development plan's
  `Z14` therefore shows as `Z14`. Nothing is called unknown until both the record and the source
  have answered; a failed zone read is stated while the saved identifiers stay listed.
- **The demo on screen 07 is the bare URL's alone.** ADR-058 decision 6 kept the no-id path for
  the plan until it read the source; it is now reached only by a deep link the app cannot fill.
- **The disclosure left the screen and the ledger moved with the code.** `saved-spots-screen.tsx`
  draws no design sample, so it moved from the demo-disclosure list to the sample-free one, and
  `zone-source-row.tsx` joined the control ledger with its role guard.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1109 tests in 112
  suites**) and `npm run test:layout` green (**200 checks** in the development export and 3 in
  the production one). The browser journey that signs up, lists the plan and signs out passed with
  its new assertions: the row read “Laajavuori 1 · Bilberry”, and pressing it landed on
  `/zone-details?zone=<id>&species=bilberry`.

Done — **the Discover map says when its zones were last updated** (2026-10-24, asked for as
“Show a ‘last updated’ line on the Discover map's cached zones once the zone data carries a
timestamp”):

- **The timestamp was in the payload all along.** Every stub feature carries `updated_at`, but
  the boundary dropped it as an unknown field. `Zone` now carries `updatedAt` — the payload's
  instant, never the moment the app read or cached it — validated as an ISO instant with an
  offset. The zod boundary accepts it too; a bare day or a local time is refused like any other
  broken adapter output.
- **The line states the answer's oldest timestamp.** `useZones` reduces the answer to the oldest
  timestamp all its zones carry, and reports none if any zone is undated; the screen prints it
  under the map as “Last updated 3 August 2026” / “Päivitetty 3.8.2026”. An answer that cannot
  state a freshness prints no line, and neither does a filter that leaves nothing.
- **A cached answer keeps its age.** The timestamp travels inside the cached zones, so a launch
  that restores the map prints the day the scores were computed, not the day the app reopened;
  the persisted-cache tests now read the line's value back.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1109 tests in 112
  suites**) and `npm run test:layout` green (**200 checks** in the development export and 3 in
  the production one), including the new line measured in both languages.

Done — **the email + password re-cut: screen 04 retired, screens 03 and `/sign-in` carry the
credential** (2026-10-24, asked for as “Re-cut screens 03 and 04 for email + password sign-in as
ADR-054 decides, keeping the design's framing and recording the departure”):

- **Screen 03 is one email + password form.** The frame's composition, its password field and its
  hint are kept; the email/phone chips are not drawn, because phone sign-in is deferred and the
  address is the only identifier (ADR-054 §5). A successful press hands `{ email, password, name }`
  to the session port, creates the account and its session in one step, and continues to screen 05.
- **Screen 04 is deleted, not disabled.** Its route, screen, domain rules, resend countdown, six-cell
  field, `pending-verification` hand-off and the `000000` stand-in code all went; the public API,
  the translation catalogue, the two tokens the screen alone used, the control ledger, the layout
  harness, the accessibility walk and the copy-claim ledger lost their entries in the same change.
  [ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md) retires ADR-027 and
  records the departure; `docs/design-source.md` keeps the frame's extraction and says retired.
- **`/sign-in` collects email + password.** It keeps its app-drawn framing and the key tile, masks
  the password with a reveal control, lands a returning user in the app, and draws no recovery
  action because no reset journey exists. Its supporting line and the account surface's “key” line
  no longer describe a code.
- **The stand-in cannot check a password and says so.** Outside a production build the port
  accepts any non-empty password and verifies nothing; in a production build it accepts none and
  both account screens draw their action disabled. No password is stored, logged or put in the
  session, and the production export proves the gate.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1103 tests in 112
  suites**) and `npm run test:layout` green (**200 checks** in the development export and 3 in the
  production one). In the built web app, signing in with an address and password landed on
  `/discover` with a nameless account row; creating an account landed on `/location-consent`; and
  the production export drew both account actions disabled after a complete form was typed.

Done — **screen 07 reads the zone source, and frame 06's card links again** (2026-10-24, asked for
as “Make screen 07 read the zone source so screen 06's card can open a zone's details again”):

- **The link is back.** The card hands over its zone's id and the berry whose score it drew;
  screen 07 asks the same `ZoneSource` for that answer and draws the zone's own name, its scored
  species, its score, confidence and one of the map's four season words. Loading, a failed read
  and an id the source does not answer to are three sentences, and none of them is the demo
  zone's figures ([ADR-058](docs/adr/ADR-058-screen-07-reads-the-zone-source.md)). The card is a
  control only where the route supplies the destination; without one it keeps the drawing and
  claims no role.
- **The demo week leaves the live card.** “11 reports this week” belongs to the design's sample
  and no source counts one; the demo path still prints it.
- **The blocks with no source stay the design's sample and say so.** The outlook, freshest
  report, walk and report list, and the frame's forecast disclaimer, are unchanged; one sentence   before them names the boundary. The no-id path — a bare URL alone since the saved plan reads
   the source (ADR-060) — keeps the whole frame's sample, so nothing that worked stopped working.
- **What this leaves**: the saved plan's own move onto the source (done the next day,
  [ADR-060](docs/adr/ADR-060-the-saved-plan-reads-the-zone-source.md)); screen 08 and the report
  list are still the design's walk and week; and screen 06's list rows are still readings.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1156 tests in 118
  suites**) and `npm run test:layout` green (**211 checks** in the development export and 3 in the
  production one; the no-param render of `/zone-details` is still the frame's sample). In the
  built web app, pressing the card on `/discover` landed on
  `/zone-details?zone=<id>&species=bilberry` with that zone's name, score and four scored species;
  the lingonberry layer showed `70` and “Ripe now”, and an id the source did not know showed the
  unknown-zone sentence rather than the demo.

Done — **the settings gear leaves the top bar** (2026-10-22, asked for as “on top bar i see settings
but that should not be there”):

- **The control is gone from every header.** The screen template no longer draws it and the app shell
  no longer provides a destination, so the seam that carried one — `src/state/shell-settings.tsx`, its
  first and only tenant — was deleted rather than left unused, and the `common.settings` key left both
  catalogues because nothing renders it (the catalogue test fails on a key nothing names).
- **The way in is the bar.** The settings live in the Profile destination, which is the profile page
  it was already opening: frame 14's account block above the settings rows.
- **The tests moved with it, not around it**: the template's two settings cases are gone, the browser
  harness now asserts that **no** destination's header carries a “Settings” button where two tests
  asserted it was there, and the control-claims ledger counts one pressable in the template instead
  of two.

Done — **the demo build gets Picky's own icon, a named APK, and a bar that stays on one row**
(2026-10-22, asked for as “use `picky.png` as the app icon, the APK from Expo downloads with a random
name, and after install the navigation bar is not in one line”):

- **The icon.** `assets/images/picky.png` (704×704, transparent) is the app's mark now, scaled into
  the four files the platforms read: the 1024×1024 `icon.png` (the mark at 82 % of the tile — the
  margin a launcher mask eats), the Android adaptive foreground and monochrome layers (the mark at
  60 %, inside the 66 dp safe zone of the 108 dp layer), and the 48×48 favicon. `ios.icon` is gone:
  it pointed at the template's `assets/expo.icon` bundle, which would have kept the Expo logo on
  iOS 18 and later, so iOS takes the top-level icon like every other platform.
- **The download name.** No `app.json` or `eas.json` field renames the artifact — EAS addresses it by
  its own id (`h4rx_….apk`), and that is what a browser saves. `npm run apk` asks EAS for the newest
  finished Android build and writes it as `<name>-<version>-<version code>-<profile>.apk`
  (`Picky-0.1.0-1-preview.apk`, 103 MB); the download is git-ignored and the script builds nothing.
- **The bar.** The four destinations were floored at `25 %` each, which summed to exactly the bar's
  358 px content box in the browser and to slightly more than it under Yoga, so the fourth
  destination wrapped onto a second row at the design's own text size on the phone. The floor is now
  `layout.minTouchTarget` and the quarters come from `flexGrow`; the bar still wraps at the largest
  system text size, where a label is genuinely wider than a quarter (ADR-019). One new test holds
  the floor (`core-navigation.test.tsx`).
- **The fourth destination is Profile** (`Profiili`), as the frame draws it, and the settings live
  inside that page rather than being the destination: the bar's label and the page's heading say so
  (owner's call, 2026-10-22 — “it should be profile not settings, and inside profile there will be
  the settings”). The page is frame 14 unchanged: the account block above, the settings rows below.
- **A tab destination offers no back control**, which was asked for first (“in home page why do we
  need the back button?”). The four shell routes passed `onBack` whenever `router.canGoBack()` was
  true — meant as “this screen was pushed”, but entering the shell from onboarding pushes `/discover`
  onto a stack that still holds welcome, sign-up and consent, so the home screen grew a back arrow
  that walked the picker into a finished flow. The browser harness could not see it: a route opened
  by URL has no history. The rule is now the code's (`src/config/__tests__/shell-tab-roots.test.ts`),
  and `/saved-spots`'s “browse zones” navigates to the tab instead of stacking a copy of it.
- **The header carries no settings control** (asked for on 2026-10-22 as “we need a settings page
  and it should be like via settings button and where it should be”; built as a gear at the header's
  top right; taken out the same day — “on top bar i see settings but that should not be there”). The
  settings are reached from the **Profile tab**, which opens the page holding them. The screen
  template draws no control of its own, and the seam that carried the destination
  (`src/state/shell-settings.tsx`) was deleted with the control rather than left unused: no
  screen, route or catalogue key names it now.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1077 tests in 108
  suites**) and `npm run test:layout` green — **211 checks** in the development export and 3 in the
  production one. What a browser cannot show is the Yoga half of the bar defect: the fix removes the only size
  that could add up past the bar, and the next APK is where it is confirmed on the phone.

Done — **the prototype readings' words are read by the copy scan** (2026-10-13, asked for as “bring
the review-only prototype surfaces under the copy scan and the layout harness, or record why they
stay outside both”): the last instrument that could not see them, and one real tension it found.

- **The layout harness half was already there, and the evidence is a run rather than a claim**: the
  six readings are measured through the prototypes' own variant tables (`e2e/prototype-readings.ts`)
  at the design's text size and at 200 %, 12 checks of `npm run test:layout`, with the reach
  asserted — no reading may be left undescribed, and every reading's route must be one that renders
  its prototype (`undescribedReadings`, `readingsOffTheirPrototype`, asserted in
  `e2e/accessibility.spec.ts`). The accessibility walk reads the same six readings through the same
  table. Nothing here needed changing; what was missing was the wording.
- **The copy scan is the instrument that could not see them, and now does.** Its shipped half
  enumerates catalogue keys, and a prototype's copy is literal English by design — so it is read
  **from source** instead, with the TypeScript compiler: JSX text (whitespace collapsed, so a
  sentence wrapped over two lines is one word) and the literal values of the props that carry copy
  (`label`, `title`, `eyebrow`, `placeholder`, `accessibilityLabel`). Comments, `report(…)` notes and
  interpolated strings are not copy, and only a parser tells them apart — measured: a plain text
  search over the three prototype files matches fifteen lines for this vocabulary, twelve of them the
  word *background* inside a style property (`backgroundColor`, `colors.background`). The files are
  found by walking `src` for a `prototype` folder, so a third prototype is scanned the day it exists.
- **What it found, on its first run**: the sign-in reading A proposes the supporting line “We send
  six digits to your email or phone. No password to remember — and none to leak.” and the action
  “Send me a code” — **the two sentences the app itself shipped until 2026-10-12**, which ADR-048
  rewrote because nothing in the app sends a code. A reading a designer may adopt was proposing
  exactly the claim the project had decided it cannot make, and no check could see it.
- **Recorded, not reworded, and that is the decision this entry asks the owner to confirm.** The
  readings are the design's own paper, the question reading A answers is the flow's *shape*, and the
  sign-in screen's wording is an open questionnaire's ([to-questionnaire-sign-in.md](to-questionnaire-sign-in.md)
  §1; §3 owns the words) — so this repository records the tension rather than inventing copy, the way
  the control audit recorded family 8 before the owner decided it. The guard is a **proposal ledger**:
  every claim a reading makes has to name the reading and say why it may sit there, a proposal whose
  words have moved on fails, and a family id that is no family fails. Its teeth for this half were
  proven before it was pointed at the prototypes: two of `a-message-the-app-sent`'s planted originals
  **are** these two sentences, held since ADR-048 because they are what shipped. The direction of any
  fix is fixed by construction — these words are not in a catalogue, so they cannot ship, and
  adopting the reading means rewriting them first, after which the shipped half of the same scan
  holds them (ADR-048 §5).
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1066 tests in 107 suites**)
  and `npm run test:layout` unchanged and green — the readings were already measured and walked, and
  nothing this change touches is measured by a browser.

Done — **a screen is read while an action on it is working** (2026-10-13, asked for as “extend the
browser suite so a screen is read while an action is in flight, making the busy half of the
accessibility contract read on a shipped screen rather than only on synthetic pages”): the walk's
last thin half, and the third state this reading has found that no settled reading could.

- **Why nothing read it before, and why nothing could.** Every reading in the walk waits for the
  page to settle — that is what makes it a reading of a screen rather than of a load — and the frame
  *inside* an action is exactly what settling waits out. Screen 10's “Save report offline” is the
  app's only action with a `busy` state, so it is the one frame where a screen reader is told
  something is unavailable **because it is working**, and the only place a person could read it was
  by hand.
- **The harness gives the page the device's timing, and touches no product code.** On the web target
  the app's storage is *not* asynchronous: `AsyncStorage`'s web implementation resolves its promise
  inside the task the press was handled in, so the busy frame lasted a microtask and never reached
  the DOM, while on a device it lasts as long as the write does. `e2e/platform-storage.ts` defers the
  reaction of the promises the app's storage layer creates — the same values in the same order, one
  task later, no screen, store or product file changed — and the test asserts immediately after the
  reading that the write landed and the flow moved on, so an in-flight state is never confused with a
  screen stalled with its spinner up.
- **The reading, and the one rule it added.** `readInFlight` (`e2e/a11y-tree.ts`) takes the walk's own
  reading without settling, and the test asserts its floor first — **exactly one control on the page
  is declared busy** — because a reading that caught nothing would pass every rule below it
  vacuously. The rules gained the one a settled page never needs: **a control that says it is working
  has to say it cannot be pressed** (`aria-busy` with no unavailable state tells a screen reader
  neither thing). `e2e/a11y-tree.spec.ts` holds the new rule from both sides and reads the target's
  own answer for a busy control rather than assuming one.
- **Two defects on the shipped screen, both fixed at the cause.** `react-native-web` folds neither
  `accessibilityState` nor `disabled` into an `aria-busy`, so the one control that was working
  declared **nothing at all** in the built export: its busy and disabled states lived in
  `accessibilityState`, and the spinner — `ActivityIndicator`, which a browser exposes as an image it
  cannot name — was the only sign anything was happening. `AppButton` now states the busy state for
  the web target beside the native one, the way `AppCheckbox` and `ChoiceChips` state theirs, and
  hides the progress drawing from the tree. The primitive's test holds what a Jest render can see of
  it (the drawing is hidden while working, and nothing is hidden when it is not) — **the web half can
  only be read in a browser**, because React Native folds `aria-*` into `accessibilityState` before a
  host element exists, which is measured rather than assumed: a Jest render of the same component
  shows the state the app intends and nothing of what a screen reader is given.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1062 tests in 107 suites**)
  and `npm run test:layout` green — **209 checks** in the development export (the in-flight reading,
  15 probe cases in `a11y-tree.spec.ts`, and the walk over all 24 routes among them) and 3 in the
  production one.

Done — **the harnesses read the review-only prototype surfaces** (2026-10-12, asked for as “extend
the accessibility and layout harnesses to read the review-only prototype surfaces, which today are
gated out of a shipped build and checked by nothing”): the audit's family 7 gap, closed from its
open end.

- **What was unread, and why.** The prototypes are review paper — the sign-in screen and the
  community map, six readings in two sets — hard-coded English because a prototype's wording is not
  a translation anyone reviews, mounted only in a development build, and deleted when their question
  is answered. So the copy scan skipped them (no catalogue keys), the layout harness measures a
  manifest built from those keys, and the walk follows the app's own routes: a designer flipping
  between readings was looking at a surface no check touched.
- **The readings come from the prototypes' own tables, not from a list here.** Each variant table is
  read as text (`SIGN_IN_VARIANTS`, `COMMUNITY_MAP_VARIANTS`) and each reading's route is read from
  `src/app` — the route that renders the prototype when its table names none, the table's own path
  when it does — in a new `e2e/prototype-readings.ts`, beside the same `src/app` reading the walk and
  the screen inventory already share (`e2e/app-pages.ts`). A variant added to a table is therefore
  read and measured the day it lands; a reading with nothing declared to measure, or pointing at a
  screen that does not render its prototype, fails instead of passing unmeasured (both proven by
  breaking them on purpose).
- **Two defects on the first run, both fixed at the cause.** On the sign-in set's “Dense form”
  reading the eye glyph that reveals the password was a **tab stop that claimed no role** — so a
  browser exposed neither a role nor its label, and a screen reader meeting it heard nothing (now
  `button`, the same rule every action in the app follows). And the row holding “Forgot password?”
  and “Create an account” **clipped at the largest system text size** (now wrapping, the trade the
  app's own chip rows make, ADR-019). Both were found by reading the built export, not by reading
  the source.
- **What could not be held, named rather than glossed.** No line counts: no frame draws these
  screens. English only: a reading has no Finnish. And the copy scan still cannot see them, because
  literal copy is not a catalogue key — recorded in the audit as the one gap left in family 7.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1056 tests in 106
  suites**) and `npm run test:layout` green — **199 checks** in the development export (9 reading
  walks and 12 copy measurements among them, plus the walk over all 24 routes) and 3 in the
  production one.

Done — **the map is named content, and the walk now reads drawings** (2026-10-12, asked for as
“decide and implement whether the discover map is named content or a decorative drawing, and hold
the choice in a test”): known issue 35, decided from measurement and closed with a rule.

- **What was measured first.** In the built export the map's region read as exactly `- img`
  (unnamed) plus one flat text run of its words, and `querySelectorAll('[aria-label]')` inside the
  map returned four labels — the two zone labels, the score badge, the position marker — that
  Chromium ignores, because a role-less `div` computes to `generic`, where ARIA forbids a name. So
  the container's own label reached nothing, the drawing was the exposed node, and the unnamed
  images were the *same component* on three routes (`/discover`, `/route-to-zone`, `/active-visit`)
  — the only unnamed images in the app.
- **The decision: content, not decoration.** The map is how Discover presents its zones, so it
  takes WCAG 1.1.1's text alternative rather than being hidden; the app already shipped the words
  for it (`discover.map.label`), so no copy was invented. The drawing now carries the name (both
  spellings, as the app's states do) plus its image role, and the map's words are untouched beside
  it. **The choice is held in a test**: the map's unit test asserts the drawing carries the name and
  that its labels are still there, and three browser checks read the built tree on all three routes
  and fail on an unnamed image.
- **The blind spot became a rule.** `e2e/a11y-tree.ts` now reports any image node in the tree with
  no accessible name — the one role whose whole purpose is to be named, and the one that no
  actionable-role rule could reach. Two probe cases hold it (an unnamed `<svg>` must be reported; a
  named one and a hidden one must not), and the walk's planted-violation case on `/discover` now
  plants an unnamed drawing too, so the rule cannot quietly stop biting. It is the fourth rule the
  walk asks, beside role, name and state.
- **One new known issue, from the same measurement**: the map's per-zone state *names* are ignored
  on the web target (known issue 36), because every fix for it is a design decision (a role on each
  label, the state as a visible word, or the pairing said in the map's own alternative) rather than
  a prop.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1056 tests in 106
  suites**) and `npm run test:layout` green — **178 checks** in the development export (the walk
  over all 24 routes included) and 3 in the production one.

Done — **the inert action stops claiming a role** (2026-10-12, asked for as “make `AppButton` drop
its role and name when no handler is supplied, the way `TextAction` does, and cover it with a test”):
known issue 34, corrected in the primitive and closed at the guard.

- **What changed.** `AppButton` reads whether it has a handler at all (`canAct`) and follows the
  action's contract conditionally: no `onPress` means no `button` role, no accessible name, no
  declared state and `tabIndex` of `-1`; a handler means role, name and disabled/busy state as
  before. `disabled` deliberately does **not** drop the role — a disabled action is waiting on a
  state and a screen reader has to hear that it exists and is unavailable (screen 03's verify
  action, the bookmark while the record is read), which is why the rule is the handler and not
  `disabled`. All 14 shipped `AppButton` sites pass a handler, so nothing shipped changes behaviour.
- **The tests, both halves.** Written first and watched fail for the expected reason (the inert
  action still exposed `accessibilityRole="button"` with a name): the drawing claims no role, no
  name and no tab stop, and — the half a fix must not overshoot — an action with a handler that is
  `disabled` still exposes its role, name and `disabled` state. One assertion was dropped after
  reading the RED output rather than worked around: `Pressable` normalises `accessibilityState` onto
  the host element whether or not one was passed, so “declares nothing” belongs in the role and name
  assertions, and what a state reaches a *browser* as is the tree walk's reading.
- **The guard moved with it.** The ledger's entry for the file records no literal role any more (a
  change detector, as designed — it failed the moment the role stopped being a literal), its
  invariant now lists `AppButton` among the guarded primitives, and the comment says what a source
  scan still cannot hold: a hand-written `Pressable`, whose role is a literal whose handler is not
  readable from the ledger.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1055 tests in 106
  suites**), and the full accessibility-tree walk over every built screen re-run in the built export
  (`npm run test:layout`, **173 checks** in the development export and 3 in the production one).

Done — **the browser suite walks every built screen's accessibility tree** (2026-10-12, asked for as
“extend the browser suite to walk every built screen's accessibility tree and assert that each
interactive node exposes a name, a role and its disabled/busy/checked state”): the role/name/state
contract read systematically, over every screen the app has, instead of one screen at a time by hand.

- **What it reads, and why a second time.** Three states were dropped on the web target before this
  walk existed, each found by a person reading one screen — the consent checkbox's `aria-checked`
  (ADR-020), the chip rows' (ADR-043), and the yield rating's, which the walk found on its first run.
  The walk reads the **routes from `src/app`** (24 of them, the same reading the screen inventory
  asserts, so a screen added tomorrow is walked tomorrow) and, per route, two things: the controls the
  page declares and the tree the **browser computes** (`ariaSnapshot`), because React Native folds
  `aria-*` into `accessibilityState` before a host element exists — a Jest render can hold what the
  app intends and never what a screen reader is given. Verified: it covers all 24 routes, and the
  root cannot silently narrow (asserted), nor the walk pass vacuously (`e2e/accessibility.spec.ts`).
- **The three questions, asked separately because they fail separately**: a control that acts has a
  **role** (a focusable element claiming no role is reported — the web target makes every `Pressable`
  a tab stop); an **actionable role** has an accessible **name**; and the state the page declares is
  the state the tree shows, **in both directions** — a declared `aria-checked` the tree dropped is one
  defect, and a `[checked]`/`[selected]`/`[disabled]`/`[busy]`/`[expanded]`/`[pressed]` flag the tree
  shows that nothing declared is another. A control that claims **no role because it cannot act** is
  deliberately not flagged: the app draws those as readings (AGENTS.md §11.2).
- **Two defects on its first real run, both fixed at the cause.** The yield rating's chosen cell
  (`src/features/discover/components/yield-rating.tsx`) carried its state in `accessibilityState`
  alone, so in the built web export “Good” lived in the cell's fill colour and nowhere a screen reader
  could hear it — now `aria-checked`, as `AppCheckbox` and the chips state theirs. And frame 15's count
  line was a **keyboard tab stop that opened nothing**: `react-native-web` gives every `Pressable`
  `tabIndex = disabled ? -1 : 0`, so a `TextAction` waiting on a countdown (or one whose screen has no
  destination) was reachable and did nothing on arrival — `TextAction` now sets `tabIndex` by the
  handler it has, held by a unit test where the prop is visible.
- **The instrument is tested like an instrument** (`e2e/a11y-tree.spec.ts`, the discipline
  `e2e/measure.spec.ts` set): nine checks against synthetic pages — a planted violation of each rule
  must be reported, and a page whose controls are named, roled and stated must produce nothing — plus a
  planted violation inside the walk on a real screen. **What it cannot see is written down in the
  module**, so a later reader does not over-trust it: a state the app keeps in React state and declares
  nowhere, whether a name is a *good* name, whether a screen that drew a reading should have drawn a
  control, and an unnamed `img` (how this target renders the app's own SVG drawings) — not an
  actionable role, so not flagged here.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1053 tests in 106 suites**)
  and `npm run test:layout` green (**173 checks** in the development export, 3 in the production one —
  24 route walks, the walk's reach and its planted violation, and the nine probe cases among them).

Done — **open question 20, put to the owner as a fifth questionnaire** (2026-10-12, asked for as “turn
open question 20 into an owner questionnaire: which screen a phone sign-up and a phone sign-in see,
and what screen 04's copy says when the code travels by SMS”): the ask rather than a guess, because the
screen is built and the wording is the design's.
[to-questionnaire-verification.md](to-questionnaire-verification.md) is the document — eleven
questions in four sections, deferring twice over to what is already recorded — and
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) is the skeleton
that holds one slot per question, so the answers land the day they arrive. The document joined the
send: it is Part 5 of [to-questionnaires-combined.md](to-questionnaires-combined.md), §E of
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md) (its counts moved from 58
slots to 70), and a fifth entry in [to-questionnaires-cover-note.md](to-questionnaires-cover-note.md).
The reconciliation check now reads five documents and holds the new split — which screen a phone
identifier walks — as well as the pointer from this question to the document that asks it.

Done — **the control-claims audit** (2026-10-12, asked for as “audit the app's controls the same way:
every pressable, switch and chip that claims an action the app cannot perform, and record each as a
known issue or a reasoned exception”): the read of every control site in the app, and a standing
check that holds it. [docs/control-claims-audit.md](docs/control-claims-audit.md) is the index; the
ledger is `src/config/__tests__/control-claims.test.ts`.

- **What it read**: thirty-six files carry a control site, and every one was read against the handler
  behind it, the role it claims and the route that wires it — `AppButton`, `TextAction`,
  `ChoiceChips`, `AppCheckbox`, `Switch`, `Pressable` and `TextInput`. The good news is the shape of
  the answer: **a third of the app's controls claim nothing on purpose** — frame 12's switch is a
  figure, frame 13's two actions are drawings, frame 15's filter chips and its count action are
  readings, the shared chip claims no role at all, and the primitives drop a control whose caller
  gave it nowhere to go (`TextAction`, `SettingRow`, `ZoneRow`, `ZoneCard`, `ListingCard`).
- **Two findings had no record anywhere**, and are now known issues 33 and 34: screen 05's continue
  action names a location-settings step the app never takes (both its actions land in the app, and
  the platform permission is asked there), and `AppButton` is the one primitive that claims a
  `button` role with no handler — a contract gap with no shipped site doing it today.
- **One gap is named rather than closed**: the review-only prototype surfaces claim password,
  biometric and recovery flows that exist nowhere, their copy is *literal* rather than catalogue
  keys, and neither the copy scan nor the layout harness reads them. They are gated out of a shipped
  build and the production export proves it, so the audit records the gap instead of inventing a
  guard for a surface nobody ships.
- **Five invariants now guard the family**: every control site on the ledger (so a new control fails
  the gate until it is read), no ledger entry outliving its controls, the drawing-files asserted to
  claim no role at all, the four primitive guards asserted by their own source, and frame 04's resend
  row asserted to render only where a caller can send a code (ADR-048 §4).
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1052 tests in 106 suites**).

Done — **screen 05's continue action says what the press does, and known issue 33 is closed**
(2026-10-13, asked for as “decide whether screen 05's continue action opens a settings surface or says
what the press actually does, and hold the answer in both languages”): the frame's label named a
settings step the app never takes, and the action now names the map the press opens
([ADR-050](docs/adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)).

- **The decision, and what it cost.** No settings surface is built — the design draws none, the app
  opens none, and a surface that existed only to make a label true would be a claim dressed as a
  screen — and one key changes in both languages: `onboarding.location.action` becomes “Continue to the
  map” / “Jatka kartalle”. The frame's own words (“Continue to location settings” /
  “Jatka sijaintiasetuksiin”) are kept as the branch that earns them: the journey that really does lead
  to a platform settings surface — a refusal the operating system will not re-ask — is theirs, recorded
  at ADR-050 §3.
- **Why it is cheap now and was not on 2026-10-12.** The copy around the action had already been made
  to say what the app does (ADR-047 §1: visit tracking “while the app is open”; the permission asked in
  the app by the position seam, ADR-045), so this was the last sentence on the screen naming a step that
  does not happen — and the destination the label needed was already drawn on the screen, as its
  zone-map preview.
- **Held in both languages, at the level the claim lives at.** The screen's own test states the rule
  (the label names where the press leads; no “location settings” string is drawn), the Finnish
  localized-copy test holds “Jatka kartalle”, the built walk presses the action by its **new accessible
  name** and lands on `/discover`, and the copy scan gained a family for the claim itself —
  `a-settings-step-the-app-never-takes`, **empty and asserted empty**, whose planted originals are the
  defect as it shipped in both languages plus the shapes a fresh translation would wear. The app's own
  “Privacy settings” surface is deliberately outside that vocabulary: the claim is the step out of the
  app, not the word “settings”.
- **A test's name was false too, and is corrected**: “will not continue to the system permission until
  the user has consented” claimed the screen asks the platform for something. It never has; it reads
  “will not continue until the user has consented”.
- **Docs.** The ADR index and the decision table; the control audit's family 8 from *recorded — open* to
  *fixed*; the copy audit's table with the new family; the design source's screen 05 with a fourth
  departure, the frame's label kept there as the drawn state; and known issue 33 closed.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **107 suites, 1061 tests**) and
  `npm run test:layout` green — **204 checks** in the development export (screen 05's four measurements
  among them, in both languages at both text sizes) and 3 in the production one; the accessibility walk
  presses through the screen into `/discover`.

Done — **screen 04's copy follows the identifier, on assumed answers** (2026-10-13, asked for as
“assume the cheapest answers to the phone questionnaire: build screen 04 so its copy follows the
identifier, with the delivery claim still closed, and record the departure”):
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) filled slot by
slot with this repository's **assumed** answers — the design owner's and the owner's still owed — and
the screen built from them, with the departure from the frame recorded in the ADR, the design source
and the copy audit.

- **What the assumption says, one line per slot.** One screen whose copy follows the destination,
  frame 04 kept (§1.1); the design file draws nothing for this state, so the two strings are the
  app's and that is the departure (§1.2); one screen for both journeys, because the **identifier** is
  what the copy follows (§2.1, §2.3); nothing on the screen says which journey the reader is on
  (§2.2); a title and a change action per identifier (§3.1, §3.2); the frame's foot card — which asks
  whether the reader signed up by phone *instead* — on the email journey only (§3.3); the destination
  printed as typed, which is what the line exists for (§3.4); and §4 deferred with the row it belongs
  to, since a failed resend cannot happen while nothing sends (§4.1, §4.2).
- **What was built.** Two keys per language (`onboarding.verification.titlePhone` — “Verify your
  number” / “Vahvista puhelinnumerosi” — and `onboarding.verification.changePhone` — “Change phone
  number” / “Vaihda puhelinnumero”), with the frame's `title` and `changeEmail` **unchanged** and now
  drawn only when the destination is an address; the frame's foot card drawn on the email journey
  only. Which state the screen is in is **passed in** (`destinationKind`) rather than derived from
  the string inside the component, so an answer that later moves the branch to the journey or to the
  transport that answered changes a caller and not a component — and the route reads it with
  `identifierKind`.
- **The rule moved, and that was the cost §4 named.** Telling an address from a number decided which
  of the frame's two words an account row uses, and this state needs the same answer — so
  `identifierKind` now lives in `src/utils/identifier.ts`, the shared pure helpers, and the privacy
  feature's account row reads it from there rather than keeping a second copy (onboarding may not
  import a sibling feature's internals).
- **Where the frame keeps its authority.** Everything the drawn state contains is untouched: the two
  keys' words, the supporting line, the expiry note, the code field and the 54 px action. The 36 px
  symbol tile stays the frame's `mail-check` glyph on both states — swapping it is a drawing rather
  than a wording, and there is no phone frame to take it from — recorded at ADR-049's *Anything else*
  slot rather than invented.
- **Measured like any other copy.** The layout harness gained `04b`, an entry reached by **walking
  screen 03's phone path** (the destination lives in the process, so it cannot be seeded into a URL) —
  four checks, both languages at both text sizes — which is a general change: a screen entry may now
  be reached by a journey (`Screen.open`). The built walk in `e2e/accessibility.spec.ts` carries a
  number from screen 03 into the state and reads its accessibility tree, so the new words are read as
  a screen reader reads them.
- **The delivery claim stays closed.** Nothing in the new copy claims a send, an inbox or a code on
  its way: ADR-048 §2's sentences remain the per-branch wording, the resend row is still not drawn
  while no caller can send one, and the destination is still named.
- **The audit's row 14 turns from *recorded and open* into *fixed*** — the frame's title and change
  action are now drawn only where they are true — with the standing check's two ledger reasons
  updated to say so and the mirror direction (a number named where the account may hold an address)
  kept as the one **named gap**.
- **Still open, deliberately:** every slot is an assumption. Open question 20 stays open, the
  [questionnaire](to-questionnaire-verification.md) still asks it, ADR-049 becomes `Accepted` only
  when real answers arrive, and each of them replaces the assumption at its slot.
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint with 0 errors — 107 suites,
  **1060 tests**, both touched test files reformatted), `npm run test:layout` green — **204 checks**
  in the development export (the `04b` entry among them) and 3 in the production one — and the
  accessibility walk plus the tree rules green (**81 checks**, the phone-state walk included).

Done — **the copy-claims audit's identifier family** (2026-10-13, asked for as “extend the
copy-claims audit with a family for identifier claims — strings that name an address where the
account may hold a number — and put its keys on the ledger with planted originals”): the fourteenth
family, added to the standing scan with its two keys recorded and its originals planted, which
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) §7 asked for.

- **The claim.** Screen 04 prints the frame's **email** state for both identifier kinds: the title
  “Verify your email” and the only way back to the field, “Change email address”, while screen 03 and
  the sign-in screen take an address *or* a number (ADR-034 §1.2) — so on a phone journey the number
  stands where an address would and two strings name an address anyway. The pass of 2026-10-12 read
  those screens and could not catch it: its vocabulary was written for claims about what the app
  *does* (a message sent, a capture, a sync), and this claim is about **which identifier the account
  has** (ADR-049 §Context).
- **The scan covers it without the copy changing.** `identifier-is-an-address` in
  `src/config/__tests__/copy-claims.test.ts`: the pattern is anchored on the screen's words about the
  account rather than on the word “email”, because screen 03's own chip says “Email” as the choice
  being made and the honest lines name both identifiers (“your email or phone”, “sähköpostiasi tai
  puhelintasi”) and so name neither. Its two keys (`onboarding.verification.title`,
  `onboarding.verification.changeEmail`) are on the ledger with the record each waits on — ADR-048 §3
  keeps the title as the journey's subject, and ADR-049 §3.1/§3.2 are the questions both strings'
  wording is waiting on (open question 20).
- **Two directions of the same claim stay named gaps**, recorded in the audit rather than widened into
  vocabulary: a number named where the account may hold an address (no shipped string does that
  today), and the foot card that names the phone path on a screen both journeys reach (ADR-049 §3.3).
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1056 tests in 106 suites**),
  and the scan was proved to bite before it was trusted: with the change action's ledger entry removed,
  the first case fails naming `identifier-is-an-address: onboarding.verification.changeEmail`, and the
  planted originals cover both languages plus a rewording of each shape.

Done — **the verification copy claims no delivery** (2026-10-12, asked for as “rewrite the
verification copy so screen 04 and the account surface stop claiming a code was sent, keeping the
wording honest for each branch of the account-service decision”): seven strings in both languages,
three surfaces, and the one frame control that carried the same claim removed with them
([ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md)).

- **The rule, and what it changed.** Nothing in the app sends a code — no transport, no account
  service, and the flow runs on the stand-in of ADR-027 — so the copy says what the step is *for*
  and names the destination the code *belongs to*: screen 04's heading (“Check your inbox.” →
  “Confirm it’s you.”), its supporting line (“the code we sent to {destination}” → “the code for
  {destination}”) and its phone note; the sign-in screen's supporting line (“We send six digits to
  your email or phone.” → “One identifier, then six digits.”) and its action (“Send me a code” →
  “Continue with a code”, which is what the press does: it carries the identifier to the code
  screen); the account surface's reach line and the device notice's account record (“the address or
  number the code went to” → “you entered”). The frame's expiry note and screen title are untouched
  — the rule of the code being entered, and the journey's subject, not a claim about how it
  arrived.
- **Each branch has its sentence, so the day a service answers the copy change is an edit rather
  than a decision**: ADR-048 §2 gives the wording for an email transport, for SMS and for nothing,
  key by key, and the frame's own words come back whole on the branch that earns them.
- **The frame's resend row is not drawn**, because asking for another code is its whole meaning and
  no caller can send one: the action and the mid-wait countdown render only where a route supplies
  `onResend`, and the cooldown goes with them, since the wait is what a send starts. Recorded in
  [docs/demo-and-stand-ins.md](docs/demo-and-stand-ins.md) §7 and removed from the layout harness's
  measured copy for screen 04 — one prop away from returning.
- **The claims guard's second family is now empty and asserted empty**, and its vocabulary was the
  reason three of the seven had hidden: the pattern knew “we sent” and not “we send”, “Send me a
  code”, “Check your inbox” or the Finnish “koodi lähetettiin”. Thirteen originals in both languages
  are planted for the two cleared families.
- **Still open, deliberately**: known issue 24 (a development build's screen still cannot say which
  code works — a disclosure about the stand-in, not a wording), known issue 27 (“Email verified”)
  and open question 20 (which screen a phone sign-up sees).
- **Verified**: `npm run verify` green (format, `tsc --noEmit`, ESLint, **1047 tests in 105 suites**),
  and both browser suites re-run because the copy sits on screens they measure — the layout harness in
  both languages at both text sizes (**138 passed**) and the production export (**3 passed**).

Done — **the copy-claims audit** (2026-10-12, asked for as “audit every shipped string in both
catalogues for claims the app cannot currently keep”): thirteen families of claim, every shipped
string that makes one read against the code that renders it. **Eleven** families were scanned by a
standing check with **29** keys on its ledger — two of the eleven cleared and asserted empty, and the
copy that is true (row 13) recorded beside them rather than scanned. **A fourteenth family joined on
2026-10-13** (above), which brings the scan to twelve families and the ledger to 31 keys. One family was fixed a second time over, and the second
one followed the same day it was recorded ([ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md)).
[docs/copy-claims-audit.md](docs/copy-claims-audit.md) is the index;
`src/config/__tests__/copy-claims.test.ts` is the ledger in code.

- **The scan found four strings the manual pass had missed**, all of them claiming background
  capture: the export document's own consent lines (`privacy.export.contents.consent.on`/`.off`,
  “Background tracking on/off” — the copy the picker takes away), and **two Finnish strings that had
  kept the frames' heavier word after their English originals changed**
  (`privacy.termsPrivacy.record.consent.label`, `privacy.accountSecurity.signOut.note`). All four
  now state visit tracking while the app is open, and the Finnish pair is the reason the scan reads
  both catalogues: a translation can say more than its original, and nothing else in the gate
  compares them for meaning (ADR-047 §1).
- **The rest of the families are the design's sample, disclosed and already recorded** — automatic
  detection (known issue 17), a synced visit (demo rows A9/F1), cached tiles and a last sync (A16),
  the forecast (A3, A16), push alerts (A17), trust judgements (A3), escrow and held payment (A12),
  the demo thread (A12), and the four owner-affirmed sentences about position never being shared
  (PROJECT.md “Recorded requirement” §1). The audit's value there is the index, not a change: each
  claim now names its record in one place instead of being rediscovered per screen — and the scan's
  own vocabulary became a finding: three of the seven delivery strings were phrased in words the
  pattern did not know, which is why the family is now wider and its originals are planted (ADR-048
  §5).
- **One family had no record anywhere**, and was recorded as **known issue 32**: the seven strings
  across screen 04, the sign-in screen and the account surface that said a code was sent, while the
  app sends nothing — the notice's own line says so, so the app contradicted itself on the first
  screens a picker reads. The wording waited on which account service answers (open question 12),
  and the owner asked for it the same day: corrected in
  [ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md), which is where each
  branch's sentence is recorded.
- **4 new tests** (`src/config/__tests__/copy-claims.test.ts`; the suite now stands at 1046): every
  match recorded or the scan fails, no ledger entry left behind by a fixed string, the
  cleared-and-asserted-empty family (a reverted background promise, in either language, fails the
  build), and the two originals planted to prove the vocabulary catches them.

Done — **the consent says what the app does** (2026-10-12, asked for as “reconcile the consent
screen's promise with what the app now does”: state the foreground limit, and put the
background-permission decision to the owner): the copy corrected, and the decision written down as
the owner's rather than assumed ([ADR-047](docs/adr/ADR-047-the-consent-says-what-the-app-does.md)).

- **The promise now matches the app.** Five strings in both languages state it: screen 05's consent
  row (“I consent to visit tracking while the app is open…”) and the benefit above it, frame 14's
  switch label, the notice's row for the consent record, and screen 09's arrival note, whose second
  sentence promised the background. The frames' heavier promise — timing “even with the screen
  locked” — is **withdrawn from the copy**, since the app reads a position in the foreground only
  ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)) and a purpose the app
  states but does not serve is a purpose nobody can check (AGENTS.md §11.1). This is screen 05's
  third recorded departure from the design, beside its unchecked row and its unrequested permission.
- **The stored field says what was agreed to**: `PrivacyConsent`'s boolean is `visitTracking` and the
  record lives under `picky.privacy-consent.v2` — a field named for a promise the app no longer
  makes is a claim the code cannot keep. A record from the old shape is **not migrated**: it is
  refused and cleared, because a record nothing can show or withdraw answers none of the four
  questions AGENTS.md §11 asks, and the safe direction is to ask again. This amends ADR-020's field
  name and key without changing what ADR-020 decided.
- **The background half is the owner's, with its consequences written down**: ADR-047 §2 records
  five slots — whether Picky ever captures in the background, and if so the permissions and store
  declarations, the watch's cadence, the lawful basis, and what may be kept against ADR-014's 12
  months — each naming what an answer changes in code. No questionnaire asks it yet; the four sent
  on 2026-10-11 are closed at 58 slots, and the decision is ranked in
  [to-owner-brief.md](to-owner-brief.md) as the item that waits outside that send.
- **2 new tests** (the suite now stands at 1042): the record's versioned key, and the refusal and
  clearing of a record left under the old shape. Every copy assertion that pinned the old words was
  updated rather than relaxed — the screens' own tests, both languages' catalogues and the browser
  harness — and the layout harness re-measured the two lines the Finnish sentence has to hold in.

Done — **a position behind a port, and nothing kept** (2026-10-12, asked for as “wire real position
capture behind the `LocationSource` port”): what the app could be true about, and the record
corrected for what it could not.

- **The seam is real** ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)):
  `src/services/location/` holds the port (`requestAvailability`, `watch`) with `expo-location`
  behind it — installed with `npx expo install`, configured in `app.json` with the app's own
  foreground usage string — and it is the only place in the app that touches the platform's location
  API. A platform answer that is neither granted nor denied reads as `unavailable`, and a platform
  that will not answer at all rejects: a failure is never presented as a refusal.
- **The gate is the picker's own consent**, in `src/hooks/use-device-position.ts`: no record, a
  record that says no, or a record the device would not hand over all mean nothing is read; a watch
  runs only while a screen is asking for it and stops when that screen goes away; a watch that dies
  drops the fix it was holding, because a fix from a dead watch is no longer evidence of anything.
  **No watch runs in the app today** — nothing can use a fix while the map has no geography and no
  zone service returns rings — so the app reads nothing at all, which is the least it can collect.
- **Foreground only, with the answer recorded**: no background location, no “Always” string, no
  Android foreground service, and the guard `src/config/__tests__/location-permissions.test.ts`
  fails if any of them appears in `app.json`, because a permission is a one-word edit away from
  existing. The copy no longer promises what this list forbids: the consent, frame 14's switch and
  the screens that repeat them say “while the app is open” (ADR-047 §1), and the other half was
  put to the owner as ADR-047 §2: no background capture for v1 ([ADR-056](docs/adr/ADR-056-background-capture-is-out-of-scope.md)),
  retention in [ADR-055](docs/adr/ADR-055-retention-and-processors.md), and the foreground budget
  in [ADR-063](docs/adr/ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md).
- **The join to the visit domain is drawn**: `features/visits/domain/position-presence.ts` turns a
  containment answer into the tracker's samples, closing what was left before opening what was
  entered. The domain still has no caller in a screen, which is now the only thing missing between a
  real fix and a real visit: the zone service's rings (known issue 14).
- **The frames' recentre control stays absent, with the right reason**: the map's own geometry showed
  the drawing carries no latitude or longitude, so a real fix has no honest place on it — the control
  waits on the real basemap ([ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md),
  known issue 30) beside a position source, not on a pannable drawing. Known issue 12 and the status
  rows in `docs/design-source.md` now say so.
- **The tracker is driven end to end** ([ADR-046](docs/adr/ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)):
  `features/visits/hooks/use-visit-presence.ts` takes the fixes the seam produces, resolves the zone
  they fall in, and applies the samples through the lifecycle — arrive, stand, walk out, come back
  inside the grace window, walk into another zone — with visits keyed by a real UUID
  (`expo-crypto`, ADR-005's idempotency key). It ships **no zone list**: the lists its tests drive are
  fixtures, because a scripted list in the app would be invented geography. `use-device-position`
  gained the `onFix` subscription the hook folds in, held in a ref so an inline callback cannot
  restart the watch.
- 38 new tests (1002 → 1040): the platform reading and the watch, the consent and permission matrix
  (including the record that cannot be read and the watch that stops on unmount), the sample-ordering
  rule, the config guard, and the ten cases around the tracker — nine driving it from scripted fixes
  and one asserting the hook is reachable through the feature's public API.

Done — **the partial frames' remaining parts** (2026-10-12, asked for as “do the other screens”):
the six parts the frames still drew and the app did not, each decided by what its own kind of
truth allows — one built, five recorded with what has to exist first.

- **Frame 07's “See all 11” opens the zone's own report list** (`/zone-reports`), an app-drawn
  screen the design never drew
  ([ADR-044](docs/adr/ADR-044-the-partial-frames-remaining-parts.md)). The frame's eleven are its
  sample week, read from the zone's own figures so the card above and the line under it cannot
  disagree; beneath them the screen lists exactly the reports **this phone holds for that zone**,
  newest first, each with the frame's own order of facts (its day, its length, the rating the
  picker gave on the design's 1–5 scale, the harvest they typed) and the queue's own “Queued”. The
  zone's reports from other pickers are named as missing rather than faked, a store that could not
  be read is a line saying so rather than an empty list, and another zone's report is never printed
  under this zone's name. The row on screen 07 keeps the frame's own visible label and carries the
  role of an action only where the route supplies the list; its accessible name says where the
  press leads, because the frame's eleven and the phone's own record are not the same thing.
- **Five parts stay absent, each now recorded with what it waits on.** Frames 06 and 09's recentre
  control needs a position source **and** a map that can move; frame 12's “View Zone 18” needs a
  zone source, or a zone the design never drew; frame 15's three filter chips and sliders glyph
  need a listings service holding the metadata a filter would act on (every one of the frame's
  filters leaves both of the app's two listings); frame 18's “Confirm berries received” and “Open
  dispute” need a payment provider, and their strings stay out of the catalogue. These are not the
  frames' sample blocks: a control that looks operable on a live map, alert, search field or order
  is exactly what AGENTS.md §11.2 forbids, so they stay out rather than drawn inert.
- 14 new unit/component tests (988 → 1002); the link is a real control on the built page, pressed by
  the browser suite, and the new screen is measured by the layout harness in both languages and at
  the largest system text size, classified by the demo-disclosure guard and inventoried in
  `docs/design-source.md`.

Done — **the sign-in screen, and the two screens frame 14's remaining rows open** (2026-10-11, asked
for as “do the remaining screens”): the three surfaces the design never drew and the app owed.

- **The sign-in screen** (`/sign-in`, app-drawn). Frames 01 and 03 both draw “Already have an account?
  Sign in”, and neither link had a destination. The design owner's answers arrived for §1.1, §1.2,
  §1.3, §1.6, §1.7 and §2.1 of [to-questionnaire-sign-in.md](to-questionnaire-sign-in.md) — one
  identifier field and then the code screen the sign-up already walks, its own route outside the app
  shell, a returning user landing in the app rather than on screen 05 — and the screen is built from
  them ([ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md)). Both links
  are wired, its copy is the app's own in both languages, and a sign-in carries **no name**: the
  session records `null` and the settings row names the account by its identifier instead of
  inventing a person ([ADR-038](docs/adr/ADR-038-a-session-may-carry-no-name.md)).
- **“Account & security”** (`/account-security`) and **“Terms & privacy”** (`/terms-privacy`) — the two
  rows frame 14 draws with a chevron and the app deliberately left undrawn until their destinations
  existed ([ADR-039](docs/adr/ADR-039-frame-14s-two-remaining-rows-get-their-screens.md)). The account
  screen draws frame 14's account row from the same session and states the session's own facts —
  where it is kept, the hour it lasts, what ends it — names what is not there (no password to change
  or recover, no device list, no account deletion, because no account service exists), and offers the
  same sign out the settings screen does. The notice answers, per record this phone holds, the four
  questions AGENTS.md §11 asks of a stored field: which records exist is a rule
  (`features/privacy/domain/held-records.ts`), a record the app could not read is never claimed, and
  the written notice and terms are named as still owed rather than invented. Since 2026-10-11 the
  notice is also reachable from the screen that asks for the consent: **screen 03's terms link opens
  it** ([ADR-043](docs/adr/ADR-043-three-waiting-frame-parts-get-their-answers.md)), so the link is a
  real action rather than the label it had to be while it had nowhere to go.
- 29 new unit/component tests (897 → 926), both screens in the layout harness's manifest and in the
  accessibility suite, and the demo-disclosure guard now classifies all three app-drawn screens.
  What the answers do **not** settle is recorded: §1.4 (states), §1.5 (recovery) and §2.2–§4 of
  ADR-034 are still `_pending_`, and the sign-in flow still runs on the stand-in code (known issue 24)
  and the in-memory session (known issue 25).

Done — **the copy the app owed, the session's own hour, and the last half of frame 13**
(2026-10-11, the same request): three gaps the app had named on its own screens, closed.

- **The copy of the user's data** ([ADR-040](docs/adr/ADR-040-the-copy-the-app-owes-is-a-document.md)):
  AGENTS.md §11 asks every stored field how the user gets a copy, and open question 23 named the
  portability path the app still owed for its device-side records. There is now a screen the design
  never drew, `/your-data`, reached from the notice's own row: it states what the copy contains record
  by record, what the file is — one versioned JSON document (`picky.personal-data.v1`) whose keys are
  the app's own field names, so another tool can read it — and where it goes, which is the
  **platform's own share sheet**. The app picks no destination, uploads nothing, stores nothing new
  and creates no processor, so no new lawful basis is needed for it; a read that failed is carried
  into the document as `incomplete` and said on the screen, so a short list is never presented as the
  whole of what the phone holds.
- **A session that runs out says so** ([ADR-041](docs/adr/ADR-041-a-session-that-can-run-out-says-so.md)):
  the account surface states the hour the session is good for, and an hour that is stated must not
  become silently false. The screen now reads the clock through a shared `useNow` hook and asks the
  session's own pure rules for the time left — whole minutes, floored — and when the hour is up it
  stops drawing the account it no longer holds, says the session has ended and offers the way back
  in. Nothing is extended or refreshed: there is no provider to refresh against (open question 12),
  and a silent refresh would falsify the hour the same screen states. This closes the “no session
  expiry a user can meet” clause of known issue 25.
- **Frame 13's downloaded region, drawn as the design's own sample**
  ([ADR-042](docs/adr/ADR-042-frame-13s-region-is-the-designs-sample.md)): the frame's region, its
  tiles and forecast, its storage meter, both actions and its last-sync line are on the screen —
  with the eyebrow's season-demo disclosure and a sentence above the block saying the figures are the
  design's own sample and that this phone has downloaded nothing. The figures live in one `DEMO_*`
  module whose two descriptions of the region cannot disagree (the region's weight *is* the storage
  it occupies, and the meter's fill is computed from the same two numbers), and neither action claims
  a role, because there is no transport to retry over and no region store to manage. The queue above
  them stays the picker's own record.
- **Evidence**: 39 new unit/component tests (926 → 965, 95 suites), and the browser harness at **130
  checks in the development export plus 3 in the production one**, which now measures the copy's
  screen and re-measures frame 13 with the sample block it gained, in both languages and at 200 %.
  The demo-disclosure guard moved frame 13's screen from the sample-free list to the demo list, so a
  future edit that drops its disclosure fails in Finnish as well as in English.
- **The ADR record is guarded** (`src/config/__tests__/adr-integrity.test.ts`, +6 tests): the three
  ADRs above were cited by shipped code before they were written — a defect nothing caught — so the
  guard now fails if any document cites an ADR that does not exist, if `docs/adr/README.md` misses an
  ADR or lists a phantom one, or if PROJECT.md's decision list loses one. It was proved to bite in
  both directions by planting a dangling citation and an unindexed ADR in turn.
- **The screen inventory is guarded too** (`src/config/__tests__/screen-inventory.test.ts`, +4 tests),
  because “are the remaining screens done?” was answered twice by reading the code. It now fails when
  a frame the design file contains has no status row, when a status row names a route that is not on
  disk, or when a page file under `src/app/` has no row anywhere in `docs/design-source.md` — so a
  screen can no longer be added without the inventory saying so. Proved to bite by planting a page
  file, and an undecided frame in the file's own table. Two stale claims
  found in the same sweep were corrected rather than left standing: known issue 1 said the molecules
  and `env.ts` were “referenced by nothing” (both have callers), and design-source.md's open list
  still described the actions as a compact 8 px-radius control (they have been the design's 54 px /
  10 px since the API change, via `min-h-action` and `rounded-control`).

Recorded, deliberately not built — **the real basemap** (2026-10-10, asked for as “for map we will
use maybe open street map because i think its free to use”):
[ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) fixes who serves the tiles
— OSM-derived vector tiles that the project hosts itself (Protomaps PMTiles, drawn by MapLibre
React Native) — after checking the one fact the ask rested on: OpenStreetMap's **data** is free
(ODbL), and its **tile servers are not** an app's backend — the OSMF's own policy offers no SLA,
blocks usage without notice, requires an identifying User-Agent and on-map attribution, and
forbids the bulk prefetch that frame 13's downloaded regions are. Nothing was installed and no
screen changed: the drawn map ([ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md))
stays until a zone service exists, ADR-021's status now scopes itself to that drawing, and known
issue 30 records what has to be true first (zone geometry, the tile host, and a spiked answer for
offline regions).

Done — **frame 14 finished to the end of what the app can be true about, and the way into it**
(2026-10-10, asked for as “the rest of the settings surface”):

- **The frame's account row** (nodes 5:23626–5:23631) is drawn from the session the sign-up
  produced — the avatar's monogram, the name screen 03 collected, and the identifier with what
  the frame claims about it. The name travels screens 03 → 04 → the port and lives in the
  session, so a name the form requires is no longer collected and dropped
  ([ADR-029](docs/adr/ADR-029-the-session-carries-the-accounts-name.md); what its claim of
  verification still owes is known issue 27).
- **“Saved spots”** is the frame's settings card (node 5:23640) with the design's own subtitle
  under its label, counting the plan the row opens. The list behind it is the screen the design
  never drew ([ADR-030](docs/adr/ADR-030-the-saved-plan-gets-a-screen.md)): the record in the
  order it was made, each zone as frame 06's own row and opening that zone's screen, an empty
  plan that says it is empty and offers the map, and a saved identifier the zone source cannot
  describe named rather than dropped.
- **“Sign out”** (node 5:23691) is the frame's last control and does what it says: the deletion
  runs first (consent, queued reports, plan) and only then the session is dropped, so a failure
  leaves the user signed in with their data intact and is stated rather than claimed
  (`src/services/sign-out.ts`; the assumption is known issue 29 and open question 25).
- **The rows group the frame draws outside a card** (node 5:23663) is drawn where the frame
  draws it — the content column's full width, the design's own 5 px between rows
  (`spacing.chartStack`, whose second measured use this is). The first version wrapped those
  rows in a card, and the layout harness failed frame 14 in Finnish because of it: the frame
  gives the “Offline maps & sync” label 244 px (node 5:23671) and “Offline-kartat ja
  synkronointi” needs them.
- **The way into it**: screen 05's continuing and skipping actions now lead into the app
  (`/discover`) instead of nowhere — until 2026-10-10 the last onboarding screen handed the user
  over to no screen at all, which made the whole settings surface unreachable in the built app —
  and the account the sign-up produces is held in the process, so nothing but the app's own
  controls can walk it.
- **Evidence**: 847 unit/component tests (84 suites), the layout harness over the two new
  entries (frame 14's row copy, and the app-drawn list as its own screen, which the design never
  drew and which is therefore held only to “nothing is lost” at 200 %), and a browser journey in
  `e2e/accessibility.spec.ts` that signs up, reads the account row back, saves a zone, lists the
  plan, and signs out — asserting that the device holds none of the three records afterwards.

Done — **the demo disclosure, on the five screens that were missing it** (2026-10-10): five
screens whose figures are the frame's own composition carried no marker on themselves saying so,
so a picker read the design's season as the app's knowledge — frame 07's yield card, frame 08's
walk, frame 09's running timer, frame 10's exit summary and frame 12's alert. Each header now
carries the same “· SEASON DEMO” frame 06's map and frame 11's season screen already carried
(“· KAUSIDEMO” in Finnish), and the two sentences that named services the app does not have say
what it can be true about instead: frame 08's note claimed a downloaded tile cache (the
boundaries are drawn from data on the device, and the missing cache is named), and frame 12's
claimed a forecast assembled from weather, season and trust-weighted reports (the alert is a
sample, and a harvest is never guaranteed). Found by the audit in
[docs/demo-and-stand-ins.md](docs/demo-and-stand-ins.md) (finding F2); the same audit's finding
F1 is known issue 26. Six suites' assertions updated in both languages, with negatives that the
old strings are gone; the layout harness re-measured the five screens in both languages at both
text sizes (105 checks) and the production export (2), all passing. The drift cannot happen
quietly again: a **guard test** (`src/features/discover/components/__tests__/demo-disclosure.test.tsx`,
34 cases) reads every `*-screen.tsx` on disk and fails until each screen is classified — as drawing
the design's sample (and rendering its disclosure in every shipped language) or as drawing none of
it — and it was proved to bite by mutating a disclosure and a classification in turn.

Done — **the four planned-marketplace frames 15–18** (2026-10-10, asked for as “the remaining
screens if any”): a `marketplace` feature renders the design's browse list (`/marketplace`), the
listing (`/marketplace-listing`), the seller's thread (`/marketplace-chat`) and the demo order
(`/marketplace-order`), with 60 unit tests of its own and every screen in the layout harness in
both languages at both text sizes. What is real in them is what can be: the browse screen's
**search** filters the app's own two demo listings and says how many are left, the one card with
a screen behind it opens it, frame 16's two actions open frames 17 and 18, frame 17's summary
opens the order, and the order's figures are arithmetic on whole cents printed through one
language-aware money formatter. What the frames draw and the app does **not** draw as a control:
the three filter chips, the composer and the order's “Confirm berries received” and “Open
dispute” — nothing filters, sends or holds a payment, so none of them claims a role (AGENTS.md
§11.2). Recorded in [ADR-026](docs/adr/ADR-026-marketplace-screens-as-a-disclosed-demo.md); the
gap that the frames are outside the shell and nothing links to them is known issue 22 and open
question 24.

Done — **the authentication seam, so a signed-in app can be built before Firebase is decided**
(2026-10-10, [ADR-028](docs/adr/ADR-028-an-authentication-seam-behind-a-port.md)): one session
port in `src/services/session/` — `signIn`, `current`, `signOut` — with a **stand-in provider**
behind it that (since the 2026-10-24 re-cut) accepts any non-empty password outside production,
refuses every credential in a production build (`unavailable`), keeps the session in memory rather than on disk, and talks to no
server. Its first caller was screen 04, which has since been retired; **the port was re-cut on
2026-10-24 to take email + password**, and screens 03 and `/sign-in` are its callers
([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)). Expiry is a rule rather
than a screen's arithmetic
(`isExpired`/`remainingMilliseconds` take the moment they are asked about, the port takes an
injectable clock, and `current()` drops a session that is past it, as sign-out does). The rule for
the stand-in code moved here with it, because the screen and the provider ask the same question
and two copies would drift (ADR-027, amended). 27 new tests (the record and its strict reader,
the store port's contract, the provider's behaviour, expiry on an injected clock); 79 suites, 770
tests; the harness measures the app as it ships against a second production export. What the seam
does **not** do is known issue 25, and what it left undecided is open question 25.

The same pass found and fixed two defects the tests could not see, both recorded: a production
export answered `development` (a public variable read through a variable name is never
substituted), and **Metro's transform cache is keyed on the source rather than on the inlined
`EXPO_PUBLIC_*` values**, so the harness's second export silently baked in the first one's
environment and the production checks reported the opposite of what they were checking. Each
export now runs alone with `--clear` (TESTING.md §12).

Done — **the parts of frames 07, 10 and 13 that only needed a decision, not a service**
(2026-10-10, asked for as “the rest of the screens”):

- **frame 10's third species chip (“More”)** is no longer a missing index. The design names
  three berries in its own chips; the app's vocabulary is those three plus the pilot's crowberry,
  so the chip reveals the rest of it (`REPORT_SPECIES_MORE`), and a report about any of the four
  can be saved. Nothing was invented: the vocabulary is the design's plus the team's fourth
  species code, and the chip is a disclosure
  that disappears once the row holds every species it can name.
- **frame 07's “Save zone”** is a real bookmark: the frame's own 54 px tile writes the zone to
  the picker's plan on this device and takes it back out (ADR-024), shows its state as a shape
  (outline → filled) rather than a colour, and reports a write the device refused.
- **frame 13's “You're offline”** is drawn only when the device really reports no reachable
  connection: the app reads the platform's network state through `expo-network` and translates it
  with one tested rule (`connectionState`), so an unanswered platform is never turned into a claim
  either way (ADR-025).

What those three still lack is recorded per screen below (known issues 15, 18 and 21): a surface
for the saved plan, evidence media, and frame 13's cache, meter and transport.

Done — **screen 01 · Onboarding · Welcome** (frame node 5:22710): built as the
`onboarding` feature and rendered by the root route, with 16 new tests covering the
frame's copy, its measured metrics, its accessibility and both actions. The frame's
own values became tokens rather than magic numbers: `chip` 10/14, `bodySmall` 14/20,
`headline` 30/42, `brand` 42/51, the 18 px section gap, the 10 px control radius,
the 54 px action height, the 64 px header height and the berry mark's `berryDeep`.
The hero photograph was exported from the design file (342×294 @2x) into `assets/`.

Also done, as its prerequisites: **Tailwind through NativeWind v4.2.7** (theme mirrors
`theme.ts`, enforced by a drift test that was proved to fail on a changed or stray
value), and **`AppButton` at the design's action metrics** (54 px tall, 10 px radius,
accent fill, leading icon).

Done — **EU privacy and accessibility recorded as standing requirements** (owner
requirement, 2026-10-08): AGENTS.md §11 now binds every change to the GDPR rules
(lawful basis and affirmative consent, minimisation, rights answerable per field, no
new processor or non-EEA transfer without a decision) and to an accessibility bar
(WCAG 2.2 AA with 2.1 AA as the EN 301 549 floor: roles, names and states on every
control, 44 px targets, tokens for colour and type, both languages). Every colour pair
the app paints is now asserted for WCAG AA contrast in both schemes
(`src/constants/__tests__/contrast.test.ts`, 34 checks), and the owner decisions this
raises are open questions 15–19.

Done — **Finnish and English** (owner requirement, 2026-10-08): the app resolves the
device's language through `expo-localization` and reads every user-visible string from
a typed catalogue in `src/services/i18n/`, with English as the source language and
Finnish typed against it; both screens built so far and the not-found screen are
localized, and `app.json` declares the supported locales so iOS and Android offer the
app in their own per-app language settings. There is no in-app picker, on purpose:
[ADR-017](docs/adr/ADR-017-localization.md) records why, and the Finnish wording needs
a native review (open question 13) because the design file contains no Finnish copy.

Done — **screen 03 · Onboarding · Create account** (frame node 5:22788): built in the
same `onboarding` feature and rendered by `src/app/create-account.tsx`, with 32 tests
covering the frame's copy, its measured metrics, the form's rules and accessibility.
The frame's own values became tokens (`spacing.field` 14, `spacing.label` 7,
`spacing.tight` 3, `layout.chipHeight` 36, `layout.minTouchTarget` 44), and its
components became `AppTextInput`, `AppCheckbox`, `FormField`, `ChoiceChips` and
`Callout`. The form's rules live in `features/onboarding/domain` as pure functions.
Screen 01's primary action now navigates here, and submitting leads on to screen 04 — **since
2026-10-24 it creates the account and its session and goes straight to screen 05**, because
screen 04 is retired ([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)); the
email/phone chips are gone too. See "Open questions" 11–12 for the deliberate departures from the
frame and the error treatment it does not draw.

**Retired 2026-10-24** ([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)) —
**screen 04 · Onboarding · Verification** (frame node 5:22840) was built in the same
`onboarding` feature and rendered by `src/app/verify-email.tsx`, which screen 03's submit
now leads to with the address the code goes to. 52 new tests cover the frame's copy, its
measured metrics, the code field's behaviour, the resend wait and accessibility. The
frame's own values became tokens
(`typography.digit` 25/30, `layout.codeCellHeight` 62, `layout.symbolTile` 76), and its
components became `CodeField` (six cells over one invisible, labelled input, so the code
is a single accessible control with the platform's number pad and one-time-code fill) and
`TextAction` — the third screen to draw the design's text link, which is when the
repository extracts a component, so screens 01 and 03 now import it instead of each
writing it. The screen's rules are pure functions in `features/onboarding/domain` (what a
complete code is, the frame's `mm:ss` countdown, the resend wait) and the address is held
in the feature rather than passed as a route parameter, because on the web target a route
parameter is a URL and an address does not belong in one. See "Open questions" 12 and 20
for what is still unconfirmed — the wait's length and what a phone sign-up's screen says,
since the frame draws the email state only.

Done — **screen 05 · Onboarding · Location consent** (frame node 5:22885): built in the
same `onboarding` feature and rendered by `src/app/location-consent.tsx`, the last screen
of the onboarding flow. 18 new tests cover the frame's copy, its measured metrics, the
consent rule and both of its ways forward. Its own values became tokens
(`typography.cardTitle` 15/21, `spacing.cardGap` 10), and the frame's zone-map preview was
exported from that node (342x192 @2x) into `assets/images/`. The screen's rule — consent
is the user's affirmative action, never a default — lives in
`features/onboarding/domain` as a pure function.

Two things this screen settled or found, both recorded below and in
[docs/design-source.md](docs/design-source.md): its consent row ships **unchecked**
although the frame draws it ticked, and the action **does not ask the operating system for
location yet** — the owner chose "present and report" over requesting the permission, so
nothing privacy-critical ships before the lawful basis (open question 15) and the
background-tracking declaration do. Measuring it also caught a real defect in a shared
component: at the largest system text size the frame's own label “Continue to location
settings” was cut off inside `AppButton`'s fixed 54 px box, which is now a floor the action
grows from (ADR-019).

Done — **the consent record and the screen that withdraws it** (owner answer to open
question 21, 2026-10-09; [ADR-020](docs/adr/ADR-020-record-consent-on-device.md)): screen
05's consent row is now written to a versioned record on the device
(`src/services/privacy-consent.ts`, read by screens through
`src/hooks/use-privacy-consent.ts`) instead of being held in the screen's own state, and
`src/app/privacy-settings.tsx` renders the privacy settings screen the row's own sentence
promises (“I can turn it off in Privacy settings”) — the part of frame 14
(node 5:23613) that can be real today: its header, its “GPS trails are never public”
status message and the “Background visit tracking” row that switches the same record off
again. A consent is written when the user decides and never on a read; a write that fails
is reported and the control falls back to what is *stored*, so a switch can never claim a
consent that was not kept; and an unreadable or unknown value reads as no consent, never
as a yes. The frame's own values became a token (`spacing.setting` 6, the padding of all
six of its settings rows), and the whole flow was driven in the built web app rather than
only in tests: consenting on screen 05 writes the record, the privacy screen shows it, and
switching it off there leaves screen 05's row unchecked with its action disabled — the
promise kept in both directions, against the artifact the app ships.

That browser pass also found a real accessibility defect in a shared component, which
the unit tests could not see: `react-native-web` renders `AppCheckbox` without
`aria-checked`, so the consent row's state reached a browser's accessibility tree nowhere but
the glyph's colour — a colour alone is never a state (AGENTS.md §11.2). `AppCheckbox` now
states the checked and disabled states twice on purpose (`accessibilityState` for iOS and
Android, `aria-*` for the web target, which React Native treats as the same state), and the
new `e2e/accessibility.spec.ts` checks the states in the built export and the consent record
through the interface a user has, in CI (TESTING.md §12).

Done — **screen 06 · Core picker · Discover map** (frame node 5:22942), the first screen of
the core picker and the one where onboarding hands over: built as the `discover` feature and
rendered by `src/app/discover.tsx`, with 32 new tests covering the frame's copy, the map's
accessible names, the zone-state rules and its measured metrics. It is also the project's
first drawing rather than a form: the frame's own map is extracted from the design file as
geometry (`GET …/nodes?ids=5:22942&geometry=paths`) into a generated module and painted with
`react-native-svg`, because the design's map is an illustration in the product's language and
not a tile provider's rendering — [ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md)
records the decision, the alternatives (an alpha native SDK that drops the screen out of the web
export, or a raster that cannot carry translated words) and what it costs. The frame's own
values became tokens: the map's 342×300 box and its base and terrain colours, the three zone
fills (its 50 % tints, composited), the legend's 8 px swatch at a 2 px corner, and four new type
slots (19/27 card heading, 12/15 and 10/12 map labels, 15/21 input).

Three things this screen established, all recorded in [docs/design-source.md](docs/design-source.md):
**four of the frame's own annotation colours could not ship** — its lake name, both zone
identifiers, its scale line and the picked zone's outline reach only 2.2–4.0:1 on the fills they
are painted over, so the palette carries the nearest values that clear WCAG AA and the contrast
test asserts each pair in both schemes; the zone polygons are painted as opaque composites of
the frame's 50 % tints, which the frame's own pixels confirm to the bit; and the drawing **is**
measured by the layout harness, in both languages and at both text sizes, because the map is a
component tree rather than a native view. The harness immediately found a real break — at 200 %
the three Finnish legend states no longer fitted the content column and the row was cut off — and
the screen the app renders was compared against the exported frame in a browser, which is how a
generator defect was caught that no test saw: every zone polygon was drawn in the map's corner
because the node's own transform had been subtracted instead of applied. The fix came with the
test that would have caught it (each zone's label must lie inside its own polygon).

Done — **screen 07 · Core picker · Zone details** (frame node `5:23032`), the screen frame 06's
zone card opens: built in the same `discover` feature and rendered by `src/app/zone-details.tsx`,
with 24 new tests covering the frame's copy in both languages, its measured metrics, its
accessibility and the demo zone's rules. Its what-you-see-before-you-walk-out blocks are the
season photograph, the yield card (the score, its confidence, the week's reports and the frame's
own disclaimer), today's outlook with its weather line, and the freshest report with its
provenance. Two new type slots came out of it (`typography.metric` 50/61 and
`typography.sectionHeading` 18/25), and the frame's photograph was exported at @2x.

Three things it established. **The demo zone is one story told twice**: the score, the state and
the report's age are frame 06's own values, so `DEMO_ZONE_DETAILS` is tied to that zone by test
rather than by a copied literal — a drift would have the app tell the user two different numbers
about one place. **The card's chevron now exists, and only because the destination does**: the
card claims a button role, draws the frame's chevron and carries an accessible name saying where
it leads only when the route gives it somewhere to go, and the feature still imports no router
(the route supplies the navigation). **What the frame draws and still cannot act is not drawn**:
its **species row** is now built, but as *what this zone is reported for* — data from the zone,
the first berry in the frame's accent fill, and no role on any chip, because a single zone's
screen has nothing for a species to filter (the filter is screen 06's) — and “See all 11” is
rendered as the design's words rather than as a control, so nothing announces an action it cannot
perform. **“Save zone” stays unbuilt on purpose**: it would write a personal record about the
picker's own plans to this device, which is a lawful-basis and purpose decision for the owner
(AGENTS.md §11), not one this screen can make for itself. The layout harness caught
the one defect here (the Finnish scoring note ran to two lines where the frame draws one); the
rendered screen was then measured in a browser at the frame's 390 px width, where the photograph,
the card's row gaps and the three sections' spacing come out as the frame's own numbers.

Done — **screen 08 · Core picker · Route to zone** (frame node `5:23106`), the walk screen 07's
“Navigate · 1.4 km” now opens: built in the same `discover` feature and rendered by
`src/app/route-to-zone.tsx`, with 28 new tests covering the frame's copy in both languages, the
map's accessible names, the route's rules and its measured metrics. It draws what the design
draws without a routing service: the offline note, the frame's own map at 342×322 with its route
over it, the distance and arrival card, the next turn on the trail and the frame's way out
(“Cancel route”).

Three things it established. **The three frames draw one map at three heights.** Frames 06, 08
and 09 draw the same drawing at 300, 322 and 210 px, and their node boxes say it is stretched
rather than redrawn — every shape and label inside moves by the same factor — so `ZoneMap` now
takes the height its screen gives it, scales the drawing's vertical axis and its label anchors
with it, and its test asserts it the way the design states it (frame 08's place name sits at
y144.9, which is frame 06's 135 × 322/300). **The frame's walking route was traced, not fetched**:
the geometry endpoint's quota for this token was spent, so the node was rendered at @2x and its
5 px accent stroke was read back into a polyline by a committed script
(`scripts/trace-figma-stroke.mjs`), with the frame's own node box (`x83 y115.9 112×144.9`) as
the test's check — every edge of the traced centreline lands within one stroke of it, the route
starts inside the unpicked zone and ends at the picker's marker. **The frame's “Start walking”
action is not drawn**: it opens the active-visit screen (frame 09), which does not exist, and a
primary action that does nothing is the one thing this repository does not ship — the same reason
frame 06's card had no chevron until screen 07 did. The zone and the distance both this screen
and screen 07 print come from one constant, asserted by test rather than copied, so the two
screens cannot disagree about one walk. Two new type slots came out of it
(`typography.stat` and `typography.rowTitle`, the frame's 27/37.8 and 17/23.8 — the design's
guidance title is a weight apart from its card title). The layout harness found the one defect: the Finnish turn
guidance (“Käänny oikealle 180 m kuluttua · määränpää Laajavuori”) wrapped to two lines where the
frame draws one, and the place name now closes the line.

Done — **screen 09 · Core picker · Active visit** (frame node `5:23185`), the walk screen 08's
“Start walking” now opens: built in the same `discover` feature and rendered by
`src/app/active-visit.tsx`. It is the first screen in the app with something genuinely alive on
it: the frame's own reading (00:42:17) counts up for real, “Pause visit” holds it, and resuming
restarts the clock from the reading it held, so a paused stretch is not counted as time in the
zone. Its units are tested independently — the pure readings (`formatElapsed`, `formatClockTime`)
and the ticking hook (`use-elapsed-ms`, five tests with a fake clock) — and the screen's tests drive
the same clock the app reads, so the frame's own numbers are what they assert.

Two defects the layout harness found, both fixed: the frame's action labels are shortened in
Finnish (“Keskeytä käynti” and “Lopeta käynti” each wrapped to two lines in the 103 px label box the
frame draws), and at the largest text size the reading needed 440 px in a 302 px card — it is now
painted in parts that reflow onto a second line instead of being clipped or capped below the size
the user asked for, while assistive technology still hears one reading. Two new type slots came out
of the frame (`statusLabel` 12/16.8, `timer` 52/62.9), the map is the same drawing at 210 px
(`layout.visitMapHeight`), and the card's own 20 px inset became `spacing.cardInset`.

Done — **screen 10 · Core picker · Post-visit feedback** (frame node `5:23259`), the report the
visit ends in: built in the same `discover` feature and rendered by
`src/app/post-visit-feedback.tsx`, with 11 new tests. It is the first screen whose action writes
something real: **“Save report offline”** puts the picker's report on the device's own queue
(`src/services/report-queue.ts` — versioned key, strict reads, a delete path, and the four GDPR
questions answered in the module), which is the first half of the offline slice (ADR-005). The
owner chose that on 2026-10-09; the lawful basis is still an owner decision and is recorded as the
thing that has to be answered before any release (open question 15).

Two of the frame's parts are deliberately not built, both owner decisions: its **“Add a berry
photo” row** (evidence media needs an image picker, camera and photo permissions and its own
security rules — deferred) and its third species chip **“More”** (a species index the app does not
have). The rating row is real: five cells at the frame's own metrics holding the design's five
answers, with “Good” chosen as the frame draws it. The harness found one defect here and it is
fixed: the Finnish word for “Fair” is wider than the frame's own 63 px cell, so the cells now size
to their words and the row wraps — the frame's equal cells cannot hold Finnish at any text size.
The whole flow is also driven in the built app (`e2e/accessibility.spec.ts`): the walk opens the
visit, the clock holds when paused, the visit ends in the report, and saving writes exactly one
queued report — while skipping writes none.

Done — **screens 11, 12 and 13** (frame nodes `5:23343`, `5:23439` and `5:23530`), the remaining
design screens in v1 scope, with 66 new tests and three harness findings fixed. **11 · Visits and
analytics** (`src/app/visits.tsx`, `discover`): the design's sample month in a summary card and a
harvest chart, and beneath it the picker's own record — the device's report queue read back
(newest first) above the design's three sample visits. It is the first screen where screen 10's
write becomes visible, and its eyebrow carries the design's own words plus “· SEASON DEMO”, the
disclosure frame 06's eyebrow already makes. **12 · Alerts and forecast** (`src/app/alerts.tsx`,
`discover`): the design's alert with its score and confidence chips (the same word frame 07's zone
card prints) and the three reasons it gives, with the frame's own disclaimer rendered. **13 ·
Downloads** (`src/app/downloads.tsx`, the new `offline` feature): the sync centre's real half — the
reports still waiting on this phone, with the frame's heading and each row's own line — which is
what makes `report-queue.ts` answer AGENTS.md §11's “how does the user get a copy?”. Each screen's
absent parts are listed in decisions 19–21 and in `docs/design-source.md`.

The queue's read path is shared rather than duplicated: `use-report-queue` moved to `src/hooks/`
(both features read it) and `formatShortDate` to `src/services/i18n/` (both print a day), because a
cross-feature import is a review blocker (AGENTS.md §3). Two type slots came out of the frames
(`heroTitle` 24/33.6 and frame 14's row value `rowValue` 14/17) and three layout values
(`harvestBarWidth` 44, `spacing.chart` 28, `spacing.chartStack` 5). Screen 10's save now leads to screen 11, so the picker sees the report
they just made; frame 14's “Offline maps & sync” row now opens screen 13, which is how the sync
centre is reached inside the app; the built-app flow test drives that whole path — walk, visit,
report, the row's own count, and the queued row itself, values included.

Next: (1) **the core navigation** the design draws on frames 06–14 — **built 2026-10-10**: one
app shell over the nine screens, its four destinations mapped to the routes that exist, and the
bar's labels measured in both languages and at both text sizes (ADR-022). What is left inside it
is the owner's answer to one question: whether the four destinations stay one stack, as they are
now, or each keeps its own history (open question 22); (2) an **export or portability path** for
the queue, since the list exists but
the picker cannot yet take a copy away (open question 23); (3) the **zone source** screens 06–12 all wait on, since nothing today returns a zone, its
species, its score, its weather, its reports or a route, and the species the report offers are the
design's own two until it exists; (4) what happens to a verified code and to the consent now that
it is recorded — there is still no account service and no position capture; (5) load Inter, which
the design uses and the app still replaces with the platform font; (6) review the app-side dark
palette against a real dark design when one exists.

**First vertical slice — visit capture** (approved by the owner on 2026-10-08).

Done: the pure domain for zone containment and the visit lifecycle — written
test-first, with the calendar-day split, duplicate/out-of-order sample rejection and
immutable state transitions all covered.

Next, in order: ~~(1) a `LocationSource` port with a fake implementation, so the
domain can be driven without a device~~ and ~~(3) real GPS behind that port~~ —
**done 2026-10-12** as the position seam ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)):
the port, `expo-location` behind it, the consent and foreground-permission gate, and the rule that
turns containment answers into the tracker's samples. (2) is done too, as
`useVisitPresence` ([ADR-046](docs/adr/ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)) —
what it needs to run in the field is a **zone list**, and the app ships none (a scripted one would
be invented geography): real rings are what nothing returns yet (known issue 14).
(4) local persistence and the sync queue (ADR-005) and (5) the capture UI remain, and **no watch
runs in the app**: nothing can use a fix yet, so the app reads nothing at all.

## Completed work

- 2026-10-09 — Screens **11 · Visits and analytics** (frame `5:23343`), **12 · Alerts and forecast**
  (`5:23439`) and **13 · Downloads** (`5:23530`) implemented — the last of the v1-scope design
  screens. Screen 11 (`src/app/visits.tsx`) draws the design's sample month and, beneath it, the
  picker's own history read from the device's report queue; screen 12 (`src/app/alerts.tsx`) draws
  the design's alert and the three reasons for it; screen 13 (`src/app/downloads.tsx`, the new
  `offline` feature) is the queue's own screen, which answers how the user gets a copy of what the
  app keeps. The queue hook moved to `src/hooks/use-report-queue.ts` and the short-date formatter to
  `src/services/i18n/format-date.ts`, because two features read each of them and a cross-feature
  import is a review blocker. Screen 10's save now opens screen 11. Three harness findings fixed:
  the Finnish period chips wrap, the Finnish alert context line fits the frame's single line, and
  the chip's 36 px height is a floor rather than a cap. Frame 14's own “Offline maps & sync” row is
  built with them, so the queue is reachable inside the app. 66 new tests; 59 suites, 583 tests;
  the layout harness measures all four screens in both languages at both text sizes (74 checks,
  including the built flow from the walk through the report, the sync row, to the queued row).
- 2026-10-09 — Screens **09 · Active visit** (frame `5:23185`) and **10 · Post-visit feedback**
  (frame `5:23259`) implemented in the `discover` feature and rendered by `src/app/active-visit.tsx`
  and `src/app/post-visit-feedback.tsx`. Screen 09's timer runs for real (frame `use-elapsed-ms`)
  and holds while paused without counting the pause; screen 10's “Save report offline” writes the
  picker's report to a device-only queue (`src/services/report-queue.ts`, 9 tests), which is the
  first half of the offline slice. Two harness findings fixed: the Finnish action labels fit the
  frame's 103 px label box now, and the frame's own 63 px rating cell cannot hold “Kohtalaisesti”
  at any text size, so the cells size to their words and the row wraps. 53 new tests; 50 suites,
  517 tests; the layout harness measures both screens in both languages and at both text sizes
  (61 checks, including the built flow from the walk to the queued report).
- 2026-10-09 — Screen **08 · Core picker · Route to zone** (frame `5:23106`) implemented in the
  `discover` feature and rendered by `src/app/route-to-zone.tsx`: the offline note, the frame's
  own map at 342×322 with its walking route over it, the distance and arrival card, the next turn
  and “Cancel route”. Screen 07's “Navigate · 1.4 km” now opens it, and the zone and the distance
  both screens print come from one constant, tied by test. `ZoneMap` takes its height from the
  screen and scales the drawing and its labels with it, which is how one drawing serves the three
  frames' heights (300/322/210 px); the frame's walking route was traced from a rendered node by
  a committed script because the geometry endpoint's quota was spent, and the frame's own node box
  is the test that checks the trace. Two new type slots (`stat` 27/37.8, `rowTitle` 17/23.8). The
  frame's “Start walking” is deliberately not drawn — it opens frame 09, which does not exist.
  28 new tests; 44 suites, 455 tests; the layout harness measures the screen in both languages and
  at both text sizes (51 checks) and found one defect, now fixed: the Finnish turn guidance
  (“Käänny oikealle 180 m kuluttua · määränpää Laajavuori”) wrapped to two lines where the frame
  draws one.
- 2026-10-09 — Screen **07 · Core picker · Zone details** (frame `5:23032`) implemented in the
  `discover` feature and rendered by `src/app/zone-details.tsx`: the season photograph, the yield
  card, today's outlook and the freshest report, with `DEMO_ZONE_DETAILS` tied by test to the demo
  zone frame 06 draws. Two new type tokens (`metric` 50/61, `sectionHeading` 18/25), the frame's
  photograph exported at @2x, and the zone-state copy frames 06 and 07 share moved into one
  module so the two screens cannot start naming one state two ways. Frame 06's zone card now
  opens it: the chevron and the `button` role appear only when the route supplies a destination,
  and a browser test walks that path and back. 24 new tests; 42 suites, 427 tests; the layout
  harness measures the screen in both languages and at both text sizes (46 checks), and found
  one defect, now fixed: the Finnish scoring note wrapped to two lines where the frame draws one.
- 2026-10-09 — Translation catalogue audited and guarded against dead copy: all 34 keys
  are named by a screen or a template (the audit found none unused), and the catalogue test
  now fails, per shipped locale, when no app source file names a key — a test naming one does
  not count, and neither does prose. 258 tests.
- 2026-10-09 — Both-language layout measured at the largest system text size too: the
  harness emulates the platform's 200 % text scale in the page and re-measures every built
  screen in Finnish and English at it ([ADR-019](docs/adr/ADR-019-measure-at-the-largest-system-text-size.md))
  — 23 checks per run. It found three defects and all are fixed at token level: the design's
  64 px header could not hold its own eyebrow and title (now `min-h-header`, the design's
  height as a floor); the Finnish choice-chip row ran past the viewport, where the screen
  clips instead of scrolling (now wrapping); and a form field grew past the screen, because a
  text input's intrinsic width is a character count at the current font size (now
  `min-width: 0`, so the value scrolls inside a field that keeps its width). At the design's
  own text size all three render exactly as the frames draw them — the header still measures
  64 px and the chips still sit on one 36 px row.
- 2026-10-08 — Both-language layout measured automatically: a browser harness
  (`e2e/`, `npm run test:layout`, [ADR-018](docs/adr/ADR-018-measure-layout-in-both-languages.md))
  renders every built screen at the frame's 390 px width in Finnish and English, holds
  each string to the number of lines its frame draws, and checks the whole page for
  sideways scroll and clipped text — 13 checks per run, including tests of the probes
  themselves. It runs in CI as its own job, and was proved to fail on the pre-fix Finnish
  tag (“Yksityinen luonnostaan”, which wrapped to two lines) before being wired in.
- 2026-10-08 — Initialization scaffolding retired: the `diagnostics` placeholder
  feature, its two test suites, the card it rendered and the bootstrap
  specification were deleted, and the home screen is now a thin route with no
  feature import.
- 2026-10-08 — Owner interview on the open questions (five rounds): geography,
  visits, scoring, privacy, identity, backend, retention, evidence and scope. All
  outcomes are recorded in "Domain model decisions", in
  [CONTEXT.md](CONTEXT.md) and in ADR-009 … ADR-014.
- 2026-10-08 — First product slice: the `visits` domain (containment + lifecycle),
  test-first, 61 new tests.
- 2026-10-08 — Project initialization: structure, tooling, documentation, ADRs,
  CI, verified skeleton.
- 2026-10-08 — All of the above committed as `feat: land the initialized Picky
  mobile app` (78 files) plus a `docs:` follow-up, together with the design-token
  alignment extracted from the Figma source (palette, spacing, radii, measured type
  metrics).
- 2026-10-08 — Pushed to GitHub and **verified there**: the first Mobile CI run on
  `main` completed successfully in 1 m 4 s. In the standalone repository `dev` also existed
  as the integration branch; that repository's rules are history now.
- 2026-10-22 — **Moved into the team monorepo** at `app/` (ADR-052): the same tree, a
  path-filtered `mobile.yml`, and `main` as the only long-lived branch. The app's documents
  now defer to the root `CONTEXT.md` and `CONTRIBUTING.md` for team-level facts.
- 2026-10-22 — **Screen 06's map became real geography** (ADR-053): MapLibre React Native over
  the data team's 50-zone stub through a `ZoneSource` port, the same rings projected into an SVG
  on the web export, five yield-score bands with low confidence faded, no basemap or tile host,
  every gesture off until the recentre control exists. The card, the list and frames 08–09 keep
  the design's drawing and sample.

## Known issues and limitations

1. **The documented baseline is in use; what it lacks is its own tests.** `src/components/molecules`
   (`Card`, `InfoRow`) is the UI baseline of ADR-003 and ARCHITECTURE.md §3.5, and it is now used by
   the settings surface, the account surface, the notice, the copy, the saved plan and the
   marketplace screens — the screens that use it are what covers it, and it has no test of its own.
   `src/config/env.ts` keeps its direct tests and is read by the gates that need it
   (`appEnvironment()` decides whether the stand-in accepts a credential and whether a prototype mounts);
   what has no screen is a *validation failure* — entry 2 below.
2. No `.env` is committed (correctly) and `src/config/env.ts` validates it when
   called, but nothing renders that state any more: the retired diagnostics card was
   the only screen that surfaced configuration problems.
3. No E2E test infrastructure (Maestro/Detox) is configured yet; critical flows
   have no end-to-end coverage.
4. No coverage thresholds are enforced yet (see DEFINITION_OF_DONE.md).
5. No git hooks (Husky/lint-staged) — deliberately deferred, see ADR-008.
6. iOS bundle identifier and Android package name are unset; EAS builds need
   owner-provided reverse-DNS identifiers.
7. `/ios/` and `/android/` do not exist: the project runs
   through Expo Go / development builds with continuous native generation.
8. The Expo template ships `react-native-reanimated`, `react-native-worklets` and
   `react-native-gesture-handler` without first-party product usage yet; they are
   the documented animation/gesture baseline (ADR-008).
9. The `visits` domain has **no caller yet**: no location source, no persistence
   and no screen depends on it. Its rules are therefore verified by tests only, and
   the calendar-day split uses a device-local day ordinal that is approximate across
   daylight-saving transitions until open question 10 is answered.
11. **Frame 14 is built almost to the end of what the app can be true about** (finished
   2026-10-10). Drawn: the header; the **account row**, filled from the session the sign-up
   produced rather than from the frame's example (ADR-029); the “Use Picky as” card with both
   of the frame's chips as readings and the design's own note; the frame's **settings card**
   with the **“Saved spots” row** in it — its label, the frame's subtitle counting the plan,
   the count and the chevron — opening the list the design never drew (ADR-030); the status
   message; the frame's own group of rows (**visit tracking while the app is open** — the frame's
   “background visit tracking”, renamed to what the app does, ADR-047 — **offline maps &
   sync**, **language**), drawn where the frame draws them: outside a card, at the content
   column's full width and 5 px apart (node 5:23663), which is what the Finnish label needs;
   and **sign out**, the frame's last control.   Its group of rows is complete since 2026-10-11:
   **“Account & security”** and **“Terms & privacy”** are drawn where the frame draws them, each
   opening the screen the design never drew ([ADR-039](docs/adr/ADR-039-frame-14s-two-remaining-rows-get-their-screens.md))
   — the account surface, which states the session's own facts and names what is missing, and the
   notice, which names every record the phone holds and how each one goes away. What is still not
   drawn is the **“Default spot visibility”** block (Private/Shared/Public describe how *other
   people* see a spot — invites, a community map, a sharing model the app does not have), so it
   claims no role (AGENTS.md §11.2). The screen is reached the way the design reaches it — the
   Profile destination of the app shell (ADR-022) — and what its account row and sign out still owe
   is recorded in 27 and 29.
10. The large-text measurement stops at 200 % (Android's maximum and WCAG 1.4.4's
   requirement; ADR-019). iOS accessibility sizes go beyond it, and icon glyphs are not
   measured at all: `react-native-web` ignores the props that control their scaling, so what
   a glyph or the berry mark does at 200 % on a device is a check only a device can make —
   the same gap ADR-018 records for platform fonts.

12. **The core navigation is built; what each destination would add is the part still open.**
   Frames 06–14 all draw the same tab bar (Discover, Visits, Alerts, Profile) with one item
   current, and since 2026-10-10 one app shell renders it over those nine screens, each mapped
   to the route that exists (`src/app/(app)/_layout.tsx`, ADR-022). What the owner has not yet
   answered is the shape inside it — one stack or four (open question 22). Screen 06 is now
   complete apart from one control: its search field, its species chips (the frame's three plus
   the pilot's crowberry), its map/list
   toggle, the zone list behind it and its download glyph are built and really filter (the map
   draws only the zones the two controls leave, the list holds the same ones, and a line says
   how many are left). What is **not** built is its **recentre control**, because the map does
   not pan or follow the device, so there is nothing to recentre — it arrives with the position
   capture and the pannable map, not before (AGENTS.md §11.2). What that wording left out, and a
   reading of the code on 2026-10-12 found: even with a position source and a map that pans, the
   control has nowhere to recentre *to* — the drawing's paths are the frame's own 342×300
   coordinates, not latitude and longitude (ADR-021), so a real fix has no honest place on it.
   As of 2026-10-22 the map **has** geographic coordinates ([ADR-053](docs/adr/ADR-053-the-discover-map-is-real-geography.md)):
   screen 06 renders the pilot stub's 50 rings with MapLibre React Native on the device and the
   same rings as an SVG on the web export, through a `ZoneSource` port. The recentre control is
   still not drawn, now because every map gesture is deliberately off until the control exists —
   a map that can be dragged away from the pilot area with no way back is worse than one that
   stays put. Three things remain open on this screen: no basemap (known issue 30), the card and
   list still read `DEMO_ZONES` while the map reads the source (issue 14), and the two filters
   narrow the card/list rather than the map.

13. **The map's five score bands reach a sighted user through colour, and the map prints no
figure per zone.** The legend names the five ranges in words and says what the faded treatment
means, but a colour-blind user cannot separate the bands by hue, and a sighted user cannot read a
zone's exact score from the map at all — the list and the card carry the numbers. A score label
on tap (and a second, non-colour signal) is the fix when the design draws one; the map carries a
text alternative naming what it shows, not fifty accessible zone names.

14. **Screen 06 reads one zone source; screens 08–09 still read the sample.**
   Since 2026-10-22 the 50 pilot zones arrive through `ZoneSource` from the data team's stub
   (`data/test_zones.geojson`, copied into the app and kept equal by a test), and the map says
   “test data” (ADR-053). Since 2026-10-23 the **card, the list and both filters read that same
   answer** ([ADR-057](docs/adr/ADR-057-screen-06-reads-one-zone-source.md)): the field filters by
   zone name, the species chips choose the score layer one berry at a time, and the card reads the
   first zone left. Two consequences are recorded rather than hidden: the card's walking distance
   and report age are gone (nothing supplies them), and — since 2026-10-24 — **the card opens
   screen 07 again**, because that screen now reads the same source ([ADR-058](docs/adr/ADR-058-screen-07-reads-the-zone-source.md)).
   Since 2026-10-24 the **saved plan reads the same answer** too
   ([ADR-060](docs/adr/ADR-060-the-saved-plan-reads-the-zone-source.md)), so no surface of the
   picker's own plan draws `DEMO_ZONES` any more. Screens 08–09 still read it. When a zone service
   exists it replaces the adapter and the demo constant. What that service has to
   return — and the calls about where polygons come from, who curates them, whether a smaller unit
   is curated below a zone and what their geometry is authoritative about — are asked in
   [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) (2026-10-10). What a
   *shared* spot is (a name the sharer types onto a grant, or the zone the service already names)
   is [to-questionnaire-community-map.md](to-questionnaire-community-map.md) §1.2 — the two
   documents were divided along that seam on 2026-10-10 so neither asks it twice.

15. **Screen 07 (Zone details) reads the zone source, and keeps the design's sample where no
   source exists.** Since 2026-10-24 ([ADR-058](docs/adr/ADR-058-screen-07-reads-the-zone-source.md))
   the card frame 06 opens hands over a zone id and a berry, and the screen asks the same
   `ZoneSource` for that answer: the zone's own name, its scored species (the read berry first),
   its score, confidence and one of the map's four season words. The design's week of reports is
   gone from that reading, because no source counts one. Under the yield card the screen prints
   **the zone's own score timestamp** — the `updated_at` the map's line reads, in the same words,
   omitted when the payload carries none — so the two screens state one age for one answer. The
   **outlook, freshest report, walk and
   report list** have no source at all and stay the design's sample, disclosed by one sentence
   before them and the eyebrow's “SEASON DEMO”; `DEMO_ZONE_DETAILS` still supplies them, and the
   frame's forecast disclaimer stays. Loading, a failed read and an id the source does not answer
   to are three sentences — never the demo zone's figures. **Without a zone id** (a bare URL
   alone since the saved plan reads the source — [ADR-060](docs/adr/ADR-060-the-saved-plan-reads-the-zone-source.md))
   the whole screen is still the design's sample, as it was since 2026-10-10; that path is the last
   demo on this screen, kept for a deep link the app cannot fill.

   The season photograph and the frame's structure are unchanged.
   Its **species row** (frame node `5:23047`) is built as data — on the source path the berries
   the payload scored for that zone, the read berry first; on the sample path the demo zone's two
   — so the frame's third chip (“More”) is not drawn, because the row is what grows here and a
   species has nothing to narrow on a single zone's screen (the app's species are offered where
   one is chosen: screen 10). **“Save zone”** is real since 2026-10-10: the frame's own bookmark
   writes and removes the picker's plan on this device (ADR-024), and it says what its next press
   does. **“Navigate · 1.4 km”** opens screen 08; and **“See all 11”** opens the zone's own report
   list since 2026-10-12 — an app-drawn screen (`/zone-reports`) the design never drew, because the
   frame's eleven are its own sample week and nothing returns another picker's report
   ([ADR-044](docs/adr/ADR-044-the-partial-frames-remaining-parts.md)). The link stays the frame's own
   words where no list is wired, and states — on the screen it opens — the difference between the
   design's week and what this phone holds.

   The plan's own surface exists since 2026-10-10: frame 14's “Saved spots” row opens the list
   the design never drew — the record in the order it was made, each zone as the same row frame
   06's list draws, opening that zone's screen (ADR-030). Since 2026-10-24 its rows resolve
   against the zone source, so a saved zone shows the name and figures the map shows and opens
   its details (ADR-060). What it does **not** have yet is an
   export path (open question 23), and the lawful basis for storing the plan is owed with every
   other field (open question 15). The figures themselves — the score, the week's report
   count, the temperature, the report and its age — are invented: there is no zone service, no
   weather source and no report stream, and the frame's demo is what the app repeats until there
   is one.   A Finnish reviewer's reading of the new copy is due with the rest of the catalogue
   (open question 13).

16. **Screen 08 (Route to zone) is built in part.** Both of its actions are real now — “Start
   walking” opens screen 09 and “Cancel route” goes back, and its **core navigation** is the app
   shell (ADR-022) — but its figures are the design's sample, so the header carries the
   “SEASON DEMO” disclosure frame 06's map carries (2026-10-10). Its **offline note** used to be
   the frame's own claim about a tile cache this app does not have (“Laajavuori tiles and zone
   boundaries are cached.”); since 2026-10-10 it says what the app can be true about instead — the
   boundaries are drawn from data on the device, and the tile cache it does not have is named as
   missing — and its glyph is informational rather than a download. Nothing computes the walk
   either: `DEMO_ROUTE` (1.4 km, 22 minutes, a right turn in 180 m, arrival 10:03) is the frame's
   own sample, tied by test to the zone frames 06, 07 and 09 tell their story about.

17. **Screen 09 (Active visit) is built in part.** What is real: the timer (it starts at the
   frame's own 42:17 and counts up), the pause that holds it without counting the paused time, the
   arrival time read back off the timer's own start instant, and “End visit” leading to the report.
   What is the design's sample or absent: the visit itself is `DEMO_ACTIVE_VISIT` (there is no
   position source and nothing detects an arrival — the frame's “Arrival detected automatically”
   is the design's claim about a tracker this app does not have yet, and its arrival note's second
   sentence says timing runs **while the app is open** where the frame promised the background
   (ADR-047 §1)); the frame's **recentre control** is not
   drawn (the map does not move, the app reads no position and the drawing carries no geographic
   coordinates — ADR-021, and known issue 12 reads what that costs); and the species in the status label is the design's own
   demo sentence, like the zone card's, while the header carries the same “SEASON DEMO” disclosure
   frame 06's map makes (2026-10-10). A Finnish reviewer's reading of the new copy is due with
   the rest of the catalogue (open question 13).

18. **Screen 10 (Post-visit feedback) is built in part.** The report is real — its fields, its
   five-way rating, its validation and the write to the device — and since 2026-10-09 it is
   **listed back** on screens 11 and 13, which is what makes the queue a record rather than a
   promise. Its third species chip **“More”** is real since 2026-10-10: the design names three
   berries in its own chips, and since 2026-10-22 the app's vocabulary carries the pilot's fourth
   (crowberry), so the chip reveals the rest of the vocabulary instead of opening an index that
   does not exist, and a report about any of the four can be saved. One part of the frame is still not built: the **“Add a berry photo”
   row** (the owner deferred evidence media on 2026-10-09: it needs an image picker, camera
   permissions and its own security rules, decision 17). The visit it reports on is the design's
   own sample (`DEMO_VISIT_WINDOW` and the demo zone), so its header carries the “SEASON DEMO”
   disclosure frame 06's map makes (2026-10-10), and its core navigation is the app shell
   (ADR-022).

   **The sample reaches further than the screen, which is known issue 26 below:** two of a saved
   report's six fields — the zone it is about and its 52 minutes — come from the demo, so a report
   the picker saves as their own carries values they did not choose, and screens 11 and 13 print
   them back. Recorded as finding F1 in [docs/demo-and-stand-ins.md](docs/demo-and-stand-ins.md);
   the fix is a visit that measures itself.

   One open question the connection rule raises for this screen: its **offline note** reads
   “Offline · ready to queue” — the frame's own words for the *save path* (the same words its
   button carries, “Save report offline”), not an assertion about the device — and it is drawn
   whether or not a connection is up, because the report is queued on the device in either case.
   Now that the app can observe the connection (ADR-025), the note *could* be drawn only when the
   device reports no connection; that needs the owner's wording for the connected case (the frame
   draws only the offline one) before it is “Offline” for some pickers and something else for the
   rest. Recorded as a question rather than decided in code.

19. **Screen 11 (Visits and analytics) is built in part, and its figures are the design's sample.**
   The frame tells two kinds of thing, and the screen keeps them apart: its **summary card and
   harvest chart are the design's demo month** (`DEMO_SEASON_TOTALS`, `DEMO_HARVEST_BY_VISIT` —
   there is no analytics service, and the eyebrow says so with the same “SEASON DEMO” disclosure
   frame 06's eyebrow already makes), while its **visit history lists the reports this device is
   holding**, newest first, above the design's three sample visits. What is absent: the frame's
   **period chips are a real choice** since 2026-10-11: they filter that history — the first is the
   month the design's own three sample visits are in, the second is everything the phone holds, and
   the screen opens on the second because that is the period holding the visit screen 10 has just
   saved ([ADR-043](docs/adr/ADR-043-three-waiting-frame-parts-get-their-answers.md)). The two lines
   under the history's heading state what is showing — the period and how many visits it holds, and,
   whenever the month chip leaves any out, how many — so a filtered-off visit is counted rather than
   dropped in silence. The screen still aggregates nothing: a visit's month is read in UTC the way
   every date the app prints is, and the summary above the list remains the design's sample month
   under the eyebrow's disclosure. Its core navigation is the app shell (ADR-022). One harness
   finding: the
   Finnish chip row was cut off at the largest text size and now wraps.

20. **Screen 12 (Alerts and forecast) is built in part, and its alert is the design's sample.**
   Nothing observes weather, a season or other pickers' reports, so “Ripe bilberries 1.8 km north”
   and its three reasons are the frame's own story, recorded as a demo like frame 07's forecast
   and frame 08's offline note. Its header carries the same “SEASON DEMO” disclosure frame 06's map
   makes (2026-10-10), and the frame's closing sentence has said what is true since that date — “A
   sample alert. No weather, season or report source is connected yet, and a harvest is never
   guaranteed.” — because the frame's own wording claimed a forecast assembled from three sources,
   none of which exists. Its **alert-preferences card is drawn as the design's own sample** since
   2026-10-11: the frame's four settings (its own push row, its 3 km radius, its 21:00–07:00 quiet
   hours and bilberry plus one species) sit in one `DEMO_*` module, printed through the app's own
   notation — the radius by `formatRadius`, whole kilometres, because the frame sets a number where
   its headline prints a measured distance — and a line on the card says the settings are the
   design's and that nothing reads them. Nothing on it can act: the switch is a **figure** with no
   role (nothing delivers an alert and no permission is asked for) and the three rows below it are
   readings that drop the chevron the frame draws, for the reason frame 13's rows drop theirs
   ([ADR-043](docs/adr/ADR-043-three-waiting-frame-parts-get-their-answers.md)). What is absent: its
   **“View Zone 18” action**, which stayed absent when the owner asked for the frame to be finished:
   it needs a zone source, or a zone the design never drew, because the app's demo composition has
   no Zone 18 ([ADR-044](docs/adr/ADR-044-the-partial-frames-remaining-parts.md)). Its core
   navigation is the app shell (ADR-022). One harness finding: the Finnish context line ran
   to two lines where the frame draws one, so the Finnish states the reading alone.

21. **Screen 13 (Downloads) is built in part: the sync centre is the queue, and nothing syncs.**
   The screen lists the reports this device is holding, with the frame's own heading, each row's
   own line and its chip — the answer to “how does the user get a copy?” that AGENTS.md §11 asks of
   a stored field. Where the frame promises a retry it says what is true instead: the report is on
   this phone and nothing has been sent, because there is no transport (ADR-005). Its **“You're
   offline” status message** is real since 2026-10-10: the app reads the device's own network state
   and draws the frame's sentence only when the device reports no reachable connection (ADR-025).
   Its **downloaded region, cached tiles and forecast, storage meter, last-sync line and two actions
   are drawn, and none of them is real**: since 2026-10-11 they are the design's own sample, named as
   such on the screen itself — the eyebrow's season-demo disclosure and a sentence above the block
   ([ADR-042](docs/adr/ADR-042-frame-13s-region-is-the-designs-sample.md)) — with the frame's figures
   in one `DEMO_*` module, the meter's fill computed from the two numbers it prints, and neither
   action claiming a role (there is still no tile cache, no forecast download, no storage measurement
   and no transport: ADR-031 and known issue 30 record what has to be true first). Its core
   navigation, as everywhere. One harness finding: the Finnish chip was clipped by the frame's
   36 px chip height at the largest text size, so the chip's height is a floor now. Frame 14's own
   **“Offline maps & sync” row is built with it** — it carries the queue's count and opens this
   screen,   so the reports a device is holding are reachable inside the app rather than only by
   route.

22. **Frames 15–18 are built, and nothing in the app can walk to them.** The four
   marketplace screens exist behind their routes and are measured like every other screen
   (ADR-026), but the design draws them **outside the core navigation** (no bar, “OUTSIDE
   CORE”, and no destination marked current), so a user reaches them only by typing the URL —
   the same gap known issue 11 records for the privacy screen, except that the design has an
   entry point for that one and none for this one. Also still absent on each screen, and each
   recorded in the ADR: there is no listings service or seller account (the two listings are
   the frame's own composition), no chat transport (the thread is the design's sample exchange
   and the composer is drawn without a role), and   no payment provider (the order is arithmetic
   over the frame's figures, and the two actions that would release or freeze money are not drawn;
   their strings stay out of the catalogue, and frame 15's three filter chips and its sliders glyph
   stay out with them, because every one of the frame's filters leaves both of the app's two
   listings — [ADR-044](docs/adr/ADR-044-the-partial-frames-remaining-parts.md) records both parts
   waiting on the service that would make them act). One harness finding on the way: the disclosure row used to stretch whatever a frame
   put beside its chip into the space that was left, which clipped the Finnish mode line and the
   seller badge at 200 %; the row wraps instead.

23. **The sign-in screen exists; the account service behind it does not.** The design file never
   drew the screen — frames 01–18 are the whole inventory (docs/design-source.md) and none of them
   signs a user in — and frames 01's and 03's own “Already have an account? Sign in” links had no
   destination for as long as the app had no way in. Since 2026-10-11 both links open `/sign-in`,
   an app-drawn screen built from the design owner's answers to §1.1, §1.2, §1.3, §1.6, §1.7 and
   §2.1, outside the app shell, with a returning user landing in the app rather than on screen 05
   ([ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md)). Since
   2026-10-24 its credential is **email + password** — no code screen sits behind it — and it is
   wired to the session port like screen 03
   ([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)). What is still owed:
   **the account service** (decided in [ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md)
   — the API owns the account, Firebase issues the credential) is what can check a password, so the
   flow runs on a stand-in that verifies nothing and accepts no credential in a production build
   (known issue 24) and the session lives in memory (known issue 25); a sign-in carries **no
   name**, so a returning account is named by its identifier until the provider can answer with
   the account's own ([ADR-038](docs/adr/ADR-038-a-session-may-carry-no-name.md)); and §1.4 (which
   states the frame must draw) and §2.2–§4 of
   [to-questionnaire-sign-in.md](to-questionnaire-sign-in.md) are still unanswered, each keeping
   its part unbuilt rather than defaulted. **Password recovery's request is wired** (2026-10-24):
   `/sign-in` opens the app-drawn request at `/forgot-password`, which calls the Firebase adapter
   behind the same port when `EXPO_PUBLIC_FIREBASE_API_KEY` is set; without it, the stand-in keeps
   the journey walkable outside production, sends nothing and says so
   ([ADR-062](docs/adr/ADR-062-password-reset-belongs-to-the-provider.md)). §1.5 is answered;
   the Firebase project's email template and key remain deployment configuration. One piece of scaffolding also stays behind:
   `npm run prototype:sign-in` still opens **three throwaway readings of the screen**
   (`/create-account?variant=A|B|C`, switchable from a floating bar) — prototype code, no tests,
   hard-coded English, ignored in a `production` build — because the switch that mounts them is
   shared with the community map's own three readings, whose question is still open. The sign-in
   set is deleted with the switch that mounts both
   (`src/components/prototype/`, `src/features/onboarding/components/prototype/`).

24. **The credential is a stand-in until the account service exists (re-cut 2026-10-24).**
   Screen 03 and `/sign-in` hand an email + password to the session port, and `/forgot-password`
   asks the same port for a reset link — a link Firebase really sends when the public key is
   configured, and a stand-in sends nothing when it is not
   ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md) decides the real credential).
   The sign-in stand-in cannot check a password and does not pretend to: outside a **production**
   build it accepts **any non-empty password** and issues a session; in a production build it
   accepts **nothing**, and screens 03 and `/sign-in` draw their action disabled because no
   service can answer there. `/forgot-password` is disabled in production only when no Firebase
   key is configured. Without a key the reset request is accepted outside production and sends
   nothing, with a test-build note saying so; with a key, Firebase sends the email and the
   confirmation changes to “Check your inbox.” Nothing is stored but the session, nothing is
   logged, and no password, address or reset token is kept.
   To walk the flow: open `/create-account` in a development build, fill the form and press “Create
   account” — the app opens screen 05; open `/sign-in`, type any email and a non-empty password,
   and the app opens the map; press “Forgot password?” to walk the reset request. **The `000000` code and screen 04 are gone**,
   deleted rather than left behind ([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)
   retires ADR-027), and the `pending-verification` hand-off, the countdown and the code field went
   with them.

25. **A session exists, and almost nothing uses it yet.** The seam is built
   ([ADR-028](docs/adr/ADR-028-an-authentication-seam-behind-a-port.md)): one port
   (`sessionPort`, `src/services/session/`) with a stand-in provider behind it; screen 03 and
   `/sign-in` establish a session through it (`/sign-in` since 2026-10-11 — ADR-034, known issue
   23), and `/forgot-password` asks it for a reset link (ADR-062). What is deliberately **not**
   there:
   **no route guard or redirect** — nothing gates `(app)` on a session: the settings screen and the
   account screen *read* `current()` and say whose account the app is holding, and the shell renders
   whether or not anyone is signed in — **no persistence** (the session is in memory and a reload
   loses it, which is what
   keeps ADR-006's secure-store adapter unbuilt-but-not-dodged — open question 25), **no server**
   (the provider talks to nothing), and — until 2026-10-11 — **no session expiry a user could meet**:
   the rule was implemented, tested and injectable but no screen observed it. The account surface now
   does ([ADR-041](docs/adr/ADR-041-a-session-that-can-run-out-says-so.md)): it shows the time left in
   the hour, states the end and offers the way back in. Screens 03 and `/sign-in` each have **one
   failure line for two causes** — a refused credential and a session the app could not keep —
   because the design draws no error treatment at all (open question 11).

26. **A saved report carries two of the design's sample values.** Frame 10's report is the
   picker's own data except for the visit it belongs to: `buildVisitReport` stamps every entry
   with `DEMO_ACTIVE_VISIT.zoneId` (the demo zone, Z14) and with 52 minutes read off
   `DEMO_VISIT_WINDOW`, so a queue entry — and the rows screens 11 and 13 print back from it —
   states a zone and a duration the picker never chose, in a zone the app cannot know they were
   in. It is the one place in the app where a demo value is **stored** rather than displayed, and
   it is finding F1 in [docs/demo-and-stand-ins.md](docs/demo-and-stand-ins.md). The fix is the
   visit that measures itself: the zone arrives from position capture and the duration from the
   timer screen 09 already runs; until then a saved report's zone and length are the design's.

27. **The account row states a verification nothing has performed, and the name it shows awaits
   its lawful basis.** Frame 14's own line is “aino@example.fi · Email verified”, and the app
   draws it from the session's identifier: an address reads as “Email verified”, a number as
   “Phone verified” (`features/privacy/domain/profile.ts`). Since screen 04 was retired on
   2026-10-24 **nothing verifies anything at all** — the app collects an email + password, hands
   it to the stand-in and never confirms the address — so the claim is purely the frame's until
   the provider's email verification exists ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md),
   [ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)). The
   row's other half — the name screen 03 collects and the session now carries (ADR-029) — is
   personal data, and its lawful basis is contract, recorded with the other purposes in
   [ADR-055](docs/adr/ADR-055-retention-and-processors.md); the ADR records the purpose (the
   account's own name, shown to its owner) and the four answers, not the basis.

28. **The plan's list is a screen the app designed, and its rows now read the zone source.**
   ADR-024 left the surface of the saved-zone record open because no frame was drawn for it;
   ADR-030 builds it from the app's own vocabulary and says so. It drew the design's demo zones
   until 2026-10-24, when it was moved onto the source
   ([ADR-060](docs/adr/ADR-060-the-saved-plan-reads-the-zone-source.md)): a zone saved from
   screen 07 shows the name, score and season the map shows, and its row opens that zone's
   details with the same berry the row printed. Since the same day the record also **keeps the
   berry it was saved under**
   ([ADR-061](docs/adr/ADR-061-the-saved-zone-remembers-its-berry.md)), so a plan may mix layers
   and each row is read from its own; a plan written before that is shown under the pilot berry.
   The record's order is kept, an identifier the
   source does not answer to is still named rather than dropped (with no role, because no screen
   has its figures), and an empty plan says it is empty and offers frame 06's map. There is no
   fallback to `DEMO_ZONES`: an old development id shows as itself rather than as a demo zone's
   figures. The **export path** open question 23 carried for both device-side records exists
   since 2026-10-11 ([ADR-040](docs/adr/ADR-040-the-copy-the-app-owes-is-a-document.md)): the copy
   handed to the platform's own share sheet carries the plan, the consent, the queued reports and the
   account. What the record still owes is the lawful basis (open question 15), which is the owner's.

29. **Sign out deletes the device's records, and that is this repository's assumption rather than
   the owner's decision.** The frame draws “Sign out” and says nothing about what it means; the
   app makes it mean the account is gone **and** the device holds nothing of the picker's: the
   session is dropped and the consent, the queued reports and the saved plan are deleted
   (`src/services/sign-out.ts`, `src/app/(app)/privacy-settings.tsx`). A run that fails is stated
   rather than claimed, and the user lands on the app's front door. Two parts of that are the
   owner's to confirm: whether those device
   records should survive a sign-out at all (the reports are not the account's data, and a picker
   who signs out and back in may expect their plan), and what signs a user out besides this
   control — the session's expiry (open question 25).

30. **The real basemap is decided and deliberately not built; screen 06 now ships without one.**
   [ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) records the shape —
   OSM-derived vector tiles hosted by this project (Protomaps PMTiles), rendered by MapLibre React
   Native. Since 2026-10-22 the map screen is real geography over the pilot stub's rings with a
   background-only style: no tile source, no network, no attribution owed (ADR-053). That closes
   the "no zone geometry to draw" half of this issue for screen 06; the basemap itself still waits
   on the **tile host** (a PMTiles file
   on object storage plus whatever refreshes it, whose region is the backend's open question 16);
   and a **verified answer for the offline region** frame 13 draws — hosting the tiles ourselves
   makes it possible without touching anyone's tile server, but MapLibre React Native's offline
   behaviour has not been spiked. Two constraints are easy to miss and are recorded there: the
   library is a **development build** (never Expo Go) and has **no web target**, so a screen
   carrying the basemap needs a fallback in the layout harness (ADR-018/019); and the ODbL
   attribution (“© OpenStreetMap contributors”) is part of the map wherever it is drawn.

31. **The sharing rule exists, and nothing calls it — there is still no server.**
   [ADR-032](docs/adr/ADR-032-the-first-backend-slice.md) specifies the first backend slice, and the
   rule is written and tested here (`src/features/sharing`, 24 cases), but **no screen imports it**:
   shared spots have no design frame, and no screen may be built before one exists (open question
   26, “Recorded requirement” §3). So it is a *contract*, not a feature — it sends nothing, stores
   nothing, and its only caller today is its own test file. Three things stand between it and a
   working feature: the **frame**, the **host** (an EU region and a data-processing agreement —
   questions 3 and 16), and a **lawful basis** for the account identifiers a share connects
   (question 15). The app's own position is unchanged: nothing is sent anywhere (SECURITY.md §17),
   and because a client check is never authorisation the server has to implement the rule rather
   than the app (SECURITY.md §3).

32. **The verification copy said a message was sent, and the app has never sent one — corrected
   on 2026-10-12.** Screen 04's heading read “Check your inbox.” and its supporting line “Enter the
   6-digit code **we sent** to {destination} to confirm it’s you.”
   (`onboarding.verification.heading`/`.supporting`), its phone note said the code arrives “by SMS”
   (`onboarding.verification.phoneNote.body`), the sign-in screen said “**We send** six digits…” with
   an action “Send me a code” (`onboarding.signIn.supporting`/`.action`), and the account surface
   repeated the claim (`privacy.accountSecurity.reach.body`, and the notice's account record,
   `privacy.termsPrivacy.record.account.value`). Nothing is sent: there is no transport at all, the
   flow runs on the stand-in code (known issue 24, refused in a production build), and the notice's
   own line says the app “sends nothing anywhere” — so the app contradicted itself on the screens a
   picker reads first. Found by the copy-claims audit of 2026-10-12
   ([docs/copy-claims-audit.md](docs/copy-claims-audit.md), row 3). **All seven strings were
   rewritten in both languages** when the owner asked for the wording
   ([ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md)): each now says what the
   step is for and names the destination the code belongs to, the frame's own words come back on the
   branch that earns them (email, SMS, or nothing), the claims guard's family is empty and asserted
   empty, and the frame's resend row is not drawn because no caller can send a code. What stayed
   open beside it: a development build's screen still cannot tell a picker which code works (known
   issue 24) and the account row's “Email verified” still claims a verification no service made
   (known issue 27).

33. **Screen 05's continue action named a settings step the app never takes — corrected
   2026-10-13.** The consent screen's primary action read “Continue to location settings” /
   “Jatka sijaintiasetuksiin” (`onboarding.location.action`, the frame's own words), while the press
   recorded the consent and opened the app — the same destination its “Skip without tracking” action
   has. No location-settings screen exists: the platform's own permission is asked **in** the app the
   first time a screen reads a position
   ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)), which is what the
   consent screen's own copy already says (ADR-047 §1). Found by the control-claims audit of
   2026-10-12 ([docs/control-claims-audit.md](docs/control-claims-audit.md), family 8) and left
   open deliberately then, because the label is the frame's and the choice was the owner's. Decided
   on 2026-10-13 ([ADR-050](docs/adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)):
   the action says where the press leads — “Continue to the map” / “Jatka kartalle”, the map being
   the illustration the screen draws above it — and no settings surface is built for it to open. The
   frame's own words are kept as the branch that earns them: if a journey ever really does lead to a
   platform settings surface (a refusal the platform will not re-ask is the realistic case), they are
   that journey's label. The claim cannot come back quietly — the copy scan holds it as
   `a-settings-step-the-app-never-takes`, **empty and asserted empty**, with the defect as it shipped
   among its planted originals in both languages.
34. **`AppButton` was the one interactive primitive that claims a role with no handler — corrected
   2026-10-12.** Its `button` role, accessible name and disabled state were unconditional, so a
   caller that passed no `onPress` would ship an inert button that announces itself as one. Every
   other primitive in the app drops what it cannot back: `TextAction` drops its role **and** its
   name without a handler, `SettingRow`, `ZoneRow`, `ZoneCard` and `ListingCard` return their plain
   drawing (no role, no chevron), the sync-centre button is not drawn, and frame 12's switch is a
   figure rather than a `Switch`. **No shipped screen did it** — every `AppButton` site passes a
   handler (14 of them, read again as part of the fix) — so it was a gap in the primitive's contract
   rather than a control in the field. It now follows `TextAction`'s rule: with no `onPress` the
   action is the frame's drawing of one and claims no role, no name and no state, and takes no place
   in the tab order (`react-native-web` gives every `Pressable` `tabIndex = disabled ? -1 : 0`,
   which is what made frame 15's count line a keyboard stop that led nowhere); with a handler it
   keeps all three plus the disabled/busy state, because an action waiting on a state is still an
   action. Held by `src/components/atoms/__tests__/app-button.test.tsx` (both halves, so a fix
   cannot overshoot into dropping a disabled action's name) and by the ledger in
   `src/config/__tests__/control-claims.test.ts`, whose guard invariant now asserts this site too
   ([docs/control-claims-audit.md](docs/control-claims-audit.md), family 9, now **Kept**).

35. **The discover map reached the accessibility tree as one unnamed image — decided and fixed
   2026-10-12: the map is content, and its drawing carries a text alternative.** The walk read
   `/discover`'s, `/route-to-zone`'s and `/active-visit`'s trees as a single `- img` with no name:
   the map drawing ([ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md)) was the
   node a screen reader could only announce as “image”, on three shipped screens. **The decision:**
   it is *content*, not decoration — it is how Discover presents its zones, so WCAG 1.1.1 asks a
   text alternative of it, and hiding it would have removed the screen's primary presentation. What
   made the decision cheap is that the app already shipped the words for it (`discover.map.label`,
   “Map of nearby berry zones”), on the container, where — measured in the built export — they
   reached **nothing**: a role-less `div` computes to `generic` and Chromium ignores `aria-label`
   there, while the `<svg>` is the node a browser exposes. The drawing now carries that name (the
   platform reads `accessibilityLabel`, the web target `aria-label`, the same double spelling
   `AppCheckbox` and `ChoiceChips` use for their states) and its role as an image, and the map's own
   words stay beside it as text. **The rule that replaces the blind spot:** the walk now reports any
   image node in the tree with no accessible name — an image is either named content or hidden
   decoration, and unnamed is neither — so this cannot come back on a screen nobody has walked yet.
   Held by the map's unit test (the drawing carries the name, and its labels are untouched), by
   three checks in `e2e/accessibility.spec.ts` that read the built tree on all three routes, and by
   a planted unnamed drawing inside the walk's planted-violation case.

36. **The map's per-zone state names reach a native screen reader and not a web one — measured,
   recorded, not fixed.** The four labels the map positions over its drawing (two zone labels, the
   score badge, the position marker) carry `aria-label`s, and Chromium ignores every one of them:
   React Native renders them as role-less `div`s, which compute to `generic`, where ARIA forbids a
   name. On `/discover` the tree therefore reads the map as one flat text run — “Laajavuori
   Tuomiojärvi Z09 Z21 78 · Z14 …” — beside the named drawing, so a web screen reader hears the
   zone ids and, separately, the legend's three state words, and **never the pairing between them**
   (which state Z09 is in). On a device the platform reads `accessibilityLabel` from these labels —
   that is the contract the map's unit test holds — so this is the web target's half of the
   contract, like the `aria-checked` defects before it. It is not fixed here because
   every fix is a design decision rather than a prop: give each label a role that permits a name
   (an image with the state in its alternative), render the state as a word beside the zone id (a
   drawing the frame does not draw), or say the zones' states in the map's own text alternative and
   drop the per-label names. The frame's map carries state in colour alone, so whichever it is, it
   is also the answer to the state-glyph question ADR-021 left open.

## Constraints

- Small team, short timeline, low operating cost: no microservices, no
  Kubernetes, no premature scaling (bootstrap specification §26).
- Offline-first field use is a hard requirement for capture flows.
- Location data is sensitive personal data; privacy must be enforced server-side.
- The mobile client is untrusted at all times.

## Important decisions

| ADR | Decision |
| --- | --- |
| [ADR-001](docs/adr/ADR-001-mobile-framework.md) | React Native + Expo instead of Flutter |
| [ADR-002](docs/adr/ADR-002-feature-based-modules.md) | Feature-based modules with a public entry point |
| [ADR-003](docs/adr/ADR-003-atomic-design.md) | Atomic Design for UI composition |
| [ADR-004](docs/adr/ADR-004-tdd-and-test-stack.md) | TDD with Jest + React Native Testing Library |
| [ADR-005](docs/adr/ADR-005-offline-first-sync.md) | Offline-first capture with idempotent sync (design accepted, not implemented) |
| [ADR-006](docs/adr/ADR-006-secure-credential-storage.md) | Credentials in platform secure storage, never in plain storage |
| [ADR-007](docs/adr/ADR-007-repository-layout.md) | Single app package now; workspace when the backend lands |
| [ADR-008](docs/adr/ADR-008-quality-tooling-and-ci.md) | ESLint + Prettier + Jest gates in CI; hooks deferred |
| [ADR-009](docs/adr/ADR-009-scoring-model.md) | Per-visit yield score; server-only per-user trust score (band + reasons to its subject); score-gated access is server-side and auditable |
| [ADR-010](docs/adr/ADR-010-position-retention.md) | Position retention: derived per-segment centroids, never movement traces; verification is probabilistic |
| [ADR-011](docs/adr/ADR-011-backend-in-repo.md) | The backend joins this repository as `apps/api`; no npm workspace yet |
| [ADR-012](docs/adr/ADR-012-privileged-surface.md) | Privileged capabilities stay out of the field app; they live in a separate operator surface |
| [ADR-013](docs/adr/ADR-013-identity-provider.md) | Firebase Authentication for field users; tokens prove identity, never privilege (superseded by ADR-054) |
| [ADR-014](docs/adr/ADR-014-retention-policy.md) | 12-month retention for visit, position and media data; scores outlive inputs only without personal data (superseded by ADR-055) |
| [ADR-015](docs/adr/ADR-015-mobile-only-repository.md) | This repository is the mobile app at the root; supersedes ADR-007 and ADR-011 (itself superseded by ADR-052) |
| [ADR-052](docs/adr/ADR-052-the-app-lives-in-the-team-monorepo.md) | The app lives in the team monorepo at `app/`: path-filtered CI, `main` as the only long-lived branch, app docs stay with the app; supersedes ADR-015 |
| [ADR-016](docs/adr/ADR-016-figma-mcp-design-source.md) | Figma is the design source, reached through its remote MCP server (project-scope plugin; no write tools by default) |
| [ADR-017](docs/adr/ADR-017-localization.md) | Finnish and English by the OS language setting, typed catalogues, no in-app picker |
| [ADR-018](docs/adr/ADR-018-measure-layout-in-both-languages.md) | Layout measured in every shipped language by a browser harness in CI (Playwright on the static web export) |
| [ADR-019](docs/adr/ADR-019-measure-at-the-largest-system-text-size.md) | Layout also measured at the largest system text size (200 %), and controls that must grow take a minimum height |
| [ADR-020](docs/adr/ADR-020-record-consent-on-device.md) | Consent is recorded on the device (versioned key, written only on a decision, fail-closed on an unreadable value) and withdrawn on the privacy settings screen; it is sent nowhere |
| [ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md) | The core map is drawn from the design's own geometry with `react-native-svg`, not by a map provider; the words on it are components, and nothing on it is a control yet — **still the map on frames 08 and 09; superseded for screen 06 by ADR-053** |
| [ADR-053](docs/adr/ADR-053-the-discover-map-is-real-geography.md) | Screen 06's map is real geography through a `ZoneSource` port: MapLibre React Native on the device, the same rings drawn as an SVG on the web export (MapLibre has no web target), five yield-score bands with low confidence faded, no basemap or tile host yet, and every gesture off until the recentre control exists |
| [ADR-022](docs/adr/ADR-022-one-app-shell-for-the-core-navigation.md) | One app shell owns the core navigation: it holds the tab routing over the nine screens the design gives the bar to, and an item keeps a quarter of the bar as its minimum so the bar wraps at the largest text size |
| [ADR-023](docs/adr/ADR-023-the-local-gate-runs-the-formatting-check.md) | `npm run verify` runs the formatting check too, and a test keeps the local gate and CI's list of checks equal |
| [ADR-024](docs/adr/ADR-024-saved-zones-on-the-device.md) | The picker's saved zones are a versioned record on the device, written and removed by frame 07's own bookmark, sent nowhere; the plan has no list surface yet because the design gives it none |
| [ADR-025](docs/adr/ADR-025-observe-the-devices-connection.md) | The app reads the device's network state through `expo-network` and draws frame 13's “You're offline” only when the device reports no reachable connection; an unanswered platform is never guessed into a claim |
| [ADR-026](docs/adr/ADR-026-marketplace-screens-as-a-disclosed-demo.md) | The four planned-marketplace frames are built as a disclosed demo outside the app shell: the design's own composition is the data, nothing acts that cannot act, and no payment, transport or listing service is invented |
| [ADR-027](docs/adr/ADR-027-a-stand-in-verification-code.md) | Screen 04 accepts one stand-in code (`000000`) outside production builds, so the flow past it can be walked while the account service is decided and built; a production build accepts nothing and offers no verification |
| [ADR-028](docs/adr/ADR-028-an-authentication-seam-behind-a-port.md) | One session port (`signIn`, `current`, `signOut`) with a stand-in provider behind it — the seam between the screens and the identity provider, so a signed-in app can be built before Firebase is decided |
| [ADR-029](docs/adr/ADR-029-the-session-carries-the-accounts-name.md) | The session carries the account's name, so the account surface can say whose it is and the name screen 03 collects has a purpose; only the password stays behind |
| [ADR-030](docs/adr/ADR-030-the-saved-plan-gets-a-screen.md) | The saved plan gets a screen under the Profile destination — the record in its own order, drawn from the app's own vocabulary because the design never drew it — so frame 14's row counts a surface that really exists |
| [ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) | The real basemap will be OSM-derived vector tiles **the project hosts itself** (Protomaps PMTiles), drawn by MapLibre React Native: no third-party tile host, no new processor, and nothing built until a zone service exists |
| [ADR-032](docs/adr/ADR-032-the-first-backend-slice.md) | The first backend slice is one share record and one access rule: written and tested **here** as the specification the server enforces, accounts are identity-provider subjects and nothing else (no account row, no name, no address), every refusal is one answer on the wire, recipients become recipients by redeeming the sharer's own link, and nothing is deployed or processed |
| [ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md) | **Proposed, no decision yet** — the four decisions ADR-032 left blocking (host and operator, region and DPAs, lawful basis per field, invite mechanics) get one skeleton to be filled with the owner's answers the day they arrive |
| [ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md) | **Recorded in part (2026-10-11)** — §1.1, §1.2, §1.3, §1.6, §1.7 and §2.1 answered and the sign-in screen built from them (one identifier field, then frame 04's code screen, outside the app shell, landing in the app); §1.4, §1.5 and §2.2–§4 still pending |
| [ADR-035](docs/adr/ADR-035-shared-spots-the-frame-and-the-sharing-model.md) | **Proposed, no decision yet** — what a shared spot is, what to draw around it and what it commits us to get one skeleton to be filled with the designer's and owner's answers the day they arrive |
| [ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md) | **Proposed, no decision yet** — what a zone service must return (§1, this repository's reading to confirm or correct) and the calls about polygons, curation, ground truth and hosting (§2) get one skeleton to be filled with the owner's answers the day they arrive |
| [ADR-037](docs/adr/ADR-037-what-a-share-points-at-if-the-sharer-names-the-place.md) | **Proposed, no decision yet** — the branch of “what a shared spot is” where the sharer names the place gets its follow-up prepared in advance: the grant's record carries the name and the read rule does not change, activated or withdrawn by §1.2's answer |
| [ADR-038](docs/adr/ADR-038-a-session-may-carry-no-name.md) | A session may carry no name: the field is `string \| null`, an absent credential name means a returning account rather than a blank one, and a screen names such an account by its identifier instead of inventing a person |
| [ADR-039](docs/adr/ADR-039-frame-14s-two-remaining-rows-get-their-screens.md) | Frame 14's two remaining rows get the screens behind them — an account surface that states the session's own facts and a device notice that answers the four questions per stored record — and neither invents terms, a notice or a control no service can carry |
| [ADR-040](docs/adr/ADR-040-the-copy-the-app-owes-is-a-document.md) | The copy the app owes its users is one versioned JSON document (`picky.personal-data.v1`, the app's own field names, `incomplete` when a read failed), taken from an app-drawn screen and handed to the platform's own share sheet: the app picks no destination, uploads nothing, stores nothing new and creates no processor |
| [ADR-041](docs/adr/ADR-041-a-session-that-can-run-out-says-so.md) | A session that can run out says so while it is running out: the account surface reads the clock once a second, shows the time left through the session's own pure rules, states the end and offers the way back in — and nothing is extended or refreshed silently |
| [ADR-042](docs/adr/ADR-042-frame-13s-region-is-the-designs-sample.md) | Frame 13's downloaded region, tiles, forecast, storage meter, two actions and last-sync line are drawn as the design's own sample, labelled on the screen and kept in one `DEMO_*` module; the queue above them stays the picker's own record |
| [ADR-043](docs/adr/ADR-043-three-waiting-frame-parts-get-their-answers.md) | Three parts of the frames that were waiting on a decision: frame 11's two period chips become a real choice filtering the visit history (the screen opens on “All visits”, the period and its count are stated, and a visit the period leaves out is counted rather than hidden), screen 03's terms link opens the device notice, and frame 12's alert preferences are drawn as the design's own sample — its switch a figure, its rows readings, no chevron on a row that opens nothing, and “View Zone 18” still absent |
| [ADR-047](docs/adr/ADR-047-the-consent-says-what-the-app-does.md) | The consent says what the app does, and the background half goes to the owner: the copy on screen 05, frame 14's switch, the notice's row and screen 09's note state visit tracking while the app is open, the stored field is renamed `visitTracking` under a v2 key (amending ADR-020's field name, not its decision) and a record from the old shape is refused and cleared rather than migrated — with the background-permission decision, its five slots and what each answer changes in code, recorded as the owner's | Accepted in part (2026-10-12); §2 answered “no” by ADR-056 (2026-10-23) |
| [ADR-046](docs/adr/ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md) | The tracker gets its hook and the zone list stays out of the app: `useVisitPresence` wires fix → containment → samples → visits with every rule still a pure function of its own, a fix is folded where it arrives (so no state is written in an effect and a repeated fix makes no second visit), the device gate stays the only gate, the visit id is the app's own UUID — and the scripted zone list the owner asked for lives in tests, because a scripted list in the app would be invented geography |
| [ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md) | A position behind a port, read only with the picker's consent and only in the foreground, kept nowhere and logged nowhere: `expo-location` behind `PositionSource`, `granted`/`denied`/`unavailable` with anything that is not a yes never read as one, a guard that fails if a background-permission switch appears in `app.json`, and a pure rule that closes the zone left before opening the zone entered — while the frames' recentre control stays absent with the corrected reason: the drawing carries no geography, so it waits on the real basemap beside a position source |
| [ADR-044](docs/adr/ADR-044-the-partial-frames-remaining-parts.md) | The partial frames' remaining parts: frame 07's “See all 11” opens an app-drawn screen that states the design's sample week and lists the reports this phone holds for the zone (the queue's own zone identity read through one function, another zone's report never printed under this zone's name, the missing report service named, a failed read stated) with the frame's label kept and the accessible name saying where it leads — and the five parts that need a position source, a map that moves, a zone source, a listings service or a payment provider stay absent, recorded with what has to exist first |
| [ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md) | The verification copy claims no delivery: the seven strings that said a code was sent — screen 04's heading, supporting line and phone note, the sign-in screen's supporting line and its action, the account surface's reach line and the device notice's account record — say what the step is for and name the destination the code belongs to, with the frame's own words recorded as the branch that earns them (email, SMS, or nothing), the resend row drawn only where a caller can send a code, and the claims guard's family empty and asserted empty | Accepted (2026-10-12) |
| [ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) | Screen 04's phone states and the words that follow them — which screen a phone sign-up and a phone sign-in see, the title, the change action, the foot card and the destination as printed when the code travels to a number, and the resend wait behind them — in one place to be recorded the day the design owner's and owner's answers arrive | **Recorded in part (2026-10-13)** — every slot holds this repository's **assumed** answer, built at the owner's instruction: two keys per language, the branch passed into the screen, the shared identifier rule moved to `src/utils/identifier.ts`, a harness entry reached by walking screen 03's phone path, and a walk that carries a number into the state — with the departure from the frame recorded; the design owner's and owner's own answers are still owed and supersede any of them, slot by slot |
| [ADR-050](docs/adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md) | Screen 05's continue action says what the press does: “Continue to the map” / “Jatka kartalle” in place of the frame's settings step, no settings surface built for it to open, and the frame's own words kept as the label for the journey that really does lead to one | Accepted (2026-10-13) |
| [ADR-051](docs/adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md) | The team's MVP plan is the app's target: one FastAPI backend behind a generated OpenAPI client, TanStack Query over a Drizzle/SQLite cache with an outbox and a sync engine, MapLibre with real zone geometry and offline packs, and the plan's visit state machine — while the Figma frames still decide what a screen looks like and nothing built is deleted by adopting it | **Proposed (2026-10-22)**: direction adopted on the owner's instruction; the identity provider, the drawn map's retirement, the two meanings of *yield score* and the MVP's screen list are the owner's answers before the first build step |
| [ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md) | The account belongs to the team's API and Firebase issues the credential: one account row keyed by the provider subject (locale, consent, the session's name), email + password at Firebase with no password, hash or reset token in our database, ID tokens verified by the API, `/auth/login` a token exchange if the name is kept, registration idempotent and recoverable across the two systems, phone deferred, deletion spanning both | Accepted (2026-10-23; supersedes ADR-013) |
| [ADR-055](docs/adr/ADR-055-retention-and-processors.md) | Retention and processors: 12 months for visits, segments, centroids, reports and media; aggregates without personal data may outlive them; backups 30 days; crash reports 90 days in Sentry's EU region; server logs 30 days; EU-only processors; lawful basis per purpose; server-side export, delete and restriction owed before a beta | Accepted (2026-10-23; supersedes ADR-014; answers ADR-010 decision 4 and ADR-047 §2.4–2.5) |
| [ADR-056](docs/adr/ADR-056-background-capture-is-out-of-scope.md) | Background capture is out of scope for v1: no iOS “Always”, no Android background location, no foreground service and no background task; the permission guard is the enforcement, the frames' promise stays a recorded departure, foreground detection is unchanged, and the plan's background task is deferred to a future ADR rather than dropped | Accepted (2026-10-23; supersedes ADR-047 §2) |
| [ADR-057](docs/adr/ADR-057-screen-06-reads-one-zone-source.md) | Screen 06 reads one zone source: the screen asks the port once and hands the same answer to the map, card and list; the field filters by zone name and the single-select species chips choose the score layer; the card and rows are readings, and the frame's walk distance and card-to-zone-screen link are dropped until screen 07 reads the source | Accepted (2026-10-23; amends ADR-053; extended by ADR-058, which links the card again) |
| [ADR-058](docs/adr/ADR-058-screen-07-reads-the-zone-source.md) | Screen 07 reads the zone source: the card hands over its zone and score layer and links again; the name, species, score, confidence and ripeness come from the port, the demo week leaves the yield card, and the outlook, report, walk and report list stay the design's sample behind a sentence saying so — with an unknown id stated rather than filled from the demo, and the no-id path kept for the saved plan until it reads the source | Accepted (2026-10-24; extends ADR-057) |
| [ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md) | Email + password replaces the code screen: screen 03 is one email-only form keeping the frame's composition, screen 04 and its route, domain, countdown, code field and `000000` stand-in are deleted, `/sign-in` is re-cut to email + password, and the standing session port accepts any non-empty password outside production (verifying nothing) while a production build accepts none — the password is never stored | Accepted (2026-10-24; retires ADR-027, extends ADR-054/028/034, amends ADR-054 decision 8, supersedes ADR-049 and the screen-04 half of ADR-048) |
| [ADR-060](docs/adr/ADR-060-the-saved-plan-reads-the-zone-source.md) | The saved plan reads the zone source: the record's identifiers resolve against the same `ZoneSource` answer frame 06 and screen 07 read (for the pilot berry, since the record stores a place and not a layer), so a saved zone shows its name and opens its details again; the record's order and its unknown ids survive, an identifier the source does not answer to is named and claims no role, there is no fallback to `DEMO_ZONES`, both reads must finish before an id is called unknown, and screen 07's no-id demo is the bare URL's alone | Accepted (2026-10-24; supersedes ADR-030 decisions 3 and 6 and ADR-058 decision 6's saved-plan half; amended by ADR-061) |
| [ADR-061](docs/adr/ADR-061-the-saved-zone-remembers-its-berry.md) | The saved zone remembers its berry: the bookmark writes the score layer screen 07 is reading, the record keeps it as an additive optional field under `picky.saved-zones.v1` (a pre-widening plan shows the pilot layer rather than an invented one), the plan asks the source once per saved berry and resolves each row from its own answer, a pending berry hides the rows and a failed one is stated while answered layers list, and the row and the details it opens use the saved berry together | Accepted (2026-10-24; extends ADR-060 decision 4 and ADR-024, amends ADR-024 decision 1's per-zone shape) |
| [ADR-062](docs/adr/ADR-062-password-reset-belongs-to-the-provider.md) | Password reset asks the provider, and the app keeps no token: `/sign-in` gains “Forgot password?”, an app-drawn request screen keeps the sign-in framing, `SessionPort.requestPasswordReset` is the one new operation, the provider sends the email and hosts the new-password page, the stand-in accepts outside production and says no email was sent, no string claims a delivery or reveals an account, and a production build cannot request a link | Accepted (2026-10-24; answers ADR-034 §1.5, amends ADR-059 decision 4, extends ADR-028 and ADR-048) |
| [ADR-063](docs/adr/ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md) | The foreground watch has a budget: high accuracy, a 50 m distance filter, and a 60 s time ceiling on Android (iOS filters by distance alone), foreground only — chosen for kilometre-scale zone boundaries against a 5-minute dwell, with the battery cost, the sub-50 m movement it can miss and the platform asymmetry recorded, and no ticker or background capture added | Accepted (2026-10-24; answers ADR-045 decision 8's foreground half, ADR-047 §2.3 and PROJECT open question 21; extends ADR-046 and ADR-056) |

## Deployment

**Test builds only. No store listing, no hosting and no backend environment.**

EAS is configured as of 2026-10-21: the project is `@salmanprottoy/picky-mobile-app`
(`9f7a759d-dde7-423f-b7bf-b9f021e6c036`, linked in `app.json`), `eas.json` carries the three
profiles, and `android.package` is `fi.picky.app` (open question 4; the iOS bundle identifier
is still unset, so an iOS build needs that decision first).

| Profile | What it makes | Use |
| ------- | ------------- | --- |
| `development` | APK with the dev client, internal distribution | A development build on a phone, connecting to `npm start` |
| `preview` | **APK, internal distribution**, `EXPO_PUBLIC_APP_ENV=preview` | The demo build shared with testers: download link, sideload, no dev server |
| `production` | AAB (Play Store), `EXPO_PUBLIC_APP_ENV=production` | Not ready: the production gate is deliberate (ADR-027) |

The first demo APK was built from this tree on 2026-10-21, **before** the SDK 57 patch bump below; a fresh
`npm run build:android:demo` produces the artifact that matches the current lockfile
([build page](https://expo.dev/accounts/salmanprottoy/projects/picky-mobile-app/builds/80d8b8a2-d15a-4dd1-8989-b8dc6411ed95),
`fi.picky.app`, version 0.1.0, version code 1, v2-signed, arm64-v8a/armeabi-v7a/x86/x86_64):
<https://expo.dev/artifacts/eas/h4rx_uaBL3CG66dmkbrwqT-BrxmvJ727r7-sQSNJNh8.apk>.

The link keeps the name EAS gave the artifact. `npm run apk` downloads the newest finished Android
build as `Picky-<version>-<version code>-<profile>.apk` — the name to hand to a tester — and builds
nothing itself.

`npm run build:android:demo` starts the `preview` build and prints its download link. A demo
build must **not** use the `production` profile: there, the stand-in accepts no credential and
screens 03 and `/sign-in` draw their actions disabled, so nobody can create an account or get in.
That is the point of the gate, not a defect (ADR-054 §8, ADR-059).

Built locally, `npx expo export --platform android` produces the Hermes bundle (checked
2026-10-21); a native build on this machine is not possible without a JDK and the Android SDK,
which is why the APK comes from EAS. Nothing has been installed on a physical device from this
repository yet: the artifact was checked by inspection (manifest package, permissions, the
shipped bundle's copy), not by running it. A `production` build has no account service and draws
both account actions disabled, so a walk through onboarding needs a preview/development build
(ADR-059).

## Open questions

These block or shape feature work and need an owner decision:

1. ~~What exactly is a "zone", a "visit", a "yield score" and a "trust score"~~ —
   **resolved** on 2026-10-08 (see "Domain model decisions"). The visit policy's
   numbers were settled with it — decision 16 records the owner-agreed defaults
   (5-minute dwell, 30-minute grace, one local day), tuned server-side — and what
   remains open from that session is the clock that decides the calendar day
   (question 10).
2. ~~Managed identity provider~~ — **resolved and superseded**: Firebase Authentication, then the
   account moved to the team's API with Firebase issuing the credential on 2026-10-23
   ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md), superseding
   [ADR-013](docs/adr/ADR-013-identity-provider.md)). Phone sign-in is deferred for v1, not
   answered for every field user. Still open: Firebase project ownership/billing, and the MFA
   policy for moderators (an operator-surface decision that must exist before privileged access
   ships).
3. **Where the backend lives — answered by the monorepo.** The app is `app/` in
   `picky-berry-assistant/`, and the API is its sibling `../backend/` (ADR-052); what remains
   open is only deployment — which host, who operates it, and how its secrets are managed, all
   the team's (`../deploy/`, `../docs/architecture.md`). [ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)
   fixes the first slice's *shape* and leaves this question exactly where it is: the host under
   evaluation is a managed SQL database in an EU region behind a small TypeScript API, and
   choosing it is this question's answer, not a repository decision. Asked of the owner,
   with the slice's other blockers, in
   [to-questionnaire-backend.md](to-questionnaire-backend.md).
4. ~~Android package name~~ — **resolved** 2026-10-21: `fi.picky.app`. **Still open: the iOS
   bundle identifier**, which an iOS build needs before it can be made.
5. ~~Data retention duration~~ — **resolved**: 12 months, deleted or de-identified
   (ADR-014). Still open: backup lifetime and the deletion path for backups, and
   which internal operator roles may read position-derived fields at all. The first
   slice's own deletion case — rows naming an account deleted at the provider — is
   asked as §3.4 in [to-questionnaire-backend.md](to-questionnaire-backend.md); the
   backup path and the operator-roles half have no question in the four documents.
6. ~~Marketplace/rewards payments~~ — **resolved**: no real money in v1 (PROJECT.md
   decision 14). Still open: what a non-monetary reward can actually be exchanged
   for, given it must not become a currency by accident.
7. Offline conflict policy: the v1 *scope* is decided (capture only), but not what
   happens when a queued visit or feedback is rejected by the server after the user
   has already seen it accepted locally, nor what the user is shown.
8. ~~Berry ontology~~ — **resolved**: research-only for v1 (decision 18).
9. **Zone overlap** (new, found while designing containment): zones are curated
   polygons, but nothing yet says what happens when a point is inside two of them.
   The assumption is no longer buried in the implementation: containment decides *which
   zones contain the point* and takes the *choice* as a rule the caller supplies
   (`ZoneResolution` in `src/features/visits/domain/zone-containment.ts`), the
   server's order being the named default — the behaviour to date, not a requirement.
   The cases for a curated unit below a zone are written
   (`zone-containment.test.ts`), so either answer lands as one rule rather than a
   rewrite of the geometry. Asked, with the rest of the geometry model (nesting, boundary
   margins, whether anything curated exists below a zone, what a zone is authoritative about), in
   [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) §2.4–§2.5 — the
   *shared*-spot half of “nesting” is asked once, and there:
   [to-questionnaire-community-map.md](to-questionnaire-community-map.md) §1.2.
10. **Which clock decides the calendar-day span** (new, from decision 16): the device's
    local timezone, a fixed business timezone, or UTC. The tracker takes the day
    function as a parameter, so the decision can be made without changing the logic.
11. **Screen 03's consent control departs from the frame, and the design has no error
    state.** The frame draws the consent box ticked; the app ships it unchecked,
    because a pre-ticked box is not a valid affirmative action (and would be invalid
    consent under the GDPR). The frame also shows only a neutral hint for the
    password rule, so an incomplete form disables the action without explaining why.
    Since 2026-10-24 screens 03 and `/sign-in` each draw one `danger` line under the action for a
    refused credential or a session the app could not keep, because a silent press is not an
    answer (ADR-059). Open: does the owner accept the unchecked default, and which error
    treatment should the design provide for a field that has been visited but not satisfied?
12. **Where a submitted account goes — resolved (2026-10-23).** The owner decided the account
    belongs to the team's API and Firebase issues the credential
    ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md)), and the client was re-cut to
    that credential on 2026-10-24
    ([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)): screen 03 hands
    `{ email, password, name }` to the session port, the flow continues to screen 05, and
    `/sign-in` hands `{ email, password }` to the same port. There is **still no account service
    call** — the port is a stand-in until `POST /auth/register` exists (known issue 24) — and the
    register call's locale and consent are still owed to the API. The original ask, including
    whether the app talks to Firebase directly or through our backend, is
    [to-questionnaire-sign-in.md](to-questionnaire-sign-in.md) §1.2 and §4; it is no longer open.
13. **The Finnish wording needs a native review.** The design file is English only, so
    every Finnish string in `src/services/i18n/locales/fi.ts` was written by an agent,
    and no test can judge a translation. Open: who reviews it, and whether a
    professional translator should review the consented-to legal wording (the consent
    sentence and the terms link) before release. Also open: **when Swedish arrives**
    (the owner said later), and whether the design should account for longer languages.
    Screen 01's third promise tag was measured wrapping to two lines at 390 px and is
    now worded shorter so the frame's single-line row holds. The pattern is no longer
    left to a reviewer's eye: every built screen is measured in both languages in CI
    ([ADR-018](docs/adr/ADR-018-measure-layout-in-both-languages.md)), so a translation
    that wraps where the frame draws one line, or clips, fails the build — what remains
    open is the wording itself, not whether it fits. The same measurement now runs at the
    largest system text size, where a control that cannot grow past its fixed height is the
    defect ([ADR-019](docs/adr/ADR-019-measure-at-the-largest-system-text-size.md)).
14. **Localized app metadata.** The display name, the store listing and any permission
    prompt are not localized yet (ADR-017). The first real case is the location
    permission on screen 05, where the iOS usage description must be written in both
    languages in `app.json`.
15. **Lawful basis per purpose, and the privacy notice.** Open: the lawful basis the
    owner claims for each purpose (account — its identifier and **the name screen 03 collects**,
    which the session now carries so the settings screen can say whose they are (ADR-029) —
    position, feedback, media, **the connection between two accounts that sharing
    creates**, analytics when it arrives), who signs off the privacy notice, and whether a DPIA screening is
    needed before GPS capture ships — systematic location monitoring is a likely
    high-risk case (SECURITY.md §16). The engineering side is ready for the decision;
    the decision itself is not ours to make. For the first slice's own tables it is asked
    field by field in    [to-questionnaire-backend.md](to-questionnaire-backend.md).
    **Answered in part (2026-10-23)**: the lawful basis per purpose is recorded in
    [ADR-055](docs/adr/ADR-055-retention-and-processors.md) decision 9 (contract for the account,
    consent for tracking, legitimate interest for anti-fraud and security, with the balancing test
    in the privacy record). Still the owner's: who signs off the privacy notice, and whether a
    DPIA screening is needed before GPS capture ships.
16. **Storage region, processors and DPAs.** Firebase Authentication is decided
    (ADR-013) but its region, the backend's hosting region, the processor list and the
    data-processing agreements are not. Until they are, no feature may add a processor
    or move data outside the EEA (AGENTS.md §11.1). **The basemap's tile host is
    already decided to be our own storage** ([ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)),
    which is why that decision adds no processor; if volume ever makes a hosted tile
    provider the right trade, its region and DPA land here before any code does. The first backend
    slice's database and API would be a new processor: [ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)
    names the candidate under evaluation and adopts nothing, and the slice's own contract states
    that an EU region is a requirement rather than an implementation detail. The **polygon store**
    lands here too if it is not the tile host [ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)
    already decided to be our own storage — asked as
    [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) §2.9. The first slice's
    own region, processors and DPAs are asked in
    [to-questionnaire-backend.md](to-questionnaire-backend.md).
    **Answered in part (2026-10-23)**: processors are EU-only and named in
    [ADR-055](docs/adr/ADR-055-retention-and-processors.md) decision 8 — Google (Firebase), Sentry
    (Frankfurt) and the API host ADR-033 chooses, each with a DPA. Still open: that host's name,
    its region confirmation and the DPAs themselves, which follow ADR-033 rather than this ADR.
17. **How the data-subject rights are honoured, and by what.** Access and export,
    rectification, erasure including the backup path, restriction and objection
    (SECURITY.md §16). **Access and export exist for everything on the device** since
    2026-10-11: the notice names every record the phone holds and the copy hands them over as one
    document ([ADR-040](docs/adr/ADR-040-the-copy-the-app-owes-is-a-document.md)), with erasure by
    sign-out and rectification by each record's own control. What remains is everything the
    (unwritten) backend would have to do — deletion of rows naming an account, restriction, the
    backup path — which must exist before a beta stores real personal data and shapes the
    API contract rather than being bolted on. The first slice's own deletion case —
    rows naming an account deleted at the provider — is asked as §3.4 in
    [to-questionnaire-backend.md](to-questionnaire-backend.md); the other rights have
    no question in the four documents yet.
    **Answered in part (2026-10-23)**: the server owes `POST /me/export`, `DELETE /me` (spanning
    provider and our rows, with the backup path stated), rectification and restriction before a
    beta holds real data — [ADR-055](docs/adr/ADR-055-retention-and-processors.md) decision 10.
    The device-side export already exists. Still open: restricting processing needs a column and
    an answer, and the endpoints do not exist until the API does.
18. **Age policy and special-category data.** Open: the minimum age, how it is
    asserted, and whether any planned feature could touch health or biometric data. No
    field today carries either, and none may be added without an owner decision.
19. **Whether the European Accessibility Act binds this app, and the accessibility
    statement.** The EAA covers a listed set of products and services — the planned
    marketplace would sit under e-commerce, a berry-mapping tool may not sit under any.
    Open: the owner's legal reading, and (if it applies) publishing the accessibility
    information the directive requires. The project targets WCAG 2.2 AA with 2.1 AA as
    its floor either way.
20. **Screen 04's resend wait, and what a phone journey's verification screen says — retired
    (2026-10-24).** The screen was deleted with the email + password re-cut
    ([ADR-059](docs/adr/ADR-059-email-password-replaces-the-code-screen.md)): there is no code, no
    resend row and no phone journey, so every slot this question held — the wait's length, a
    failed resend, the title and change action for a number, the foot card's branch — has nothing
    left to decide. Phone sign-in is deferred (ADR-054 §5), and its verification story would need a
    new screen and a new answer if it returns. The ask and the assumed answers it received are kept
    as history in [to-questionnaire-verification.md](to-questionnaire-verification.md) and
    [ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md).
21. **Location: the lawful basis, the permission and the background declaration.** The
    owner decided (2026-10-09) that screen 05 presents and reports the choice instead of
    asking the operating system, so the app now collects an explicit in-app consent for
    **background** visit tracking and requests nothing. ~~What records the consent and where,
    and how it is withdrawn later~~ — **resolved** (2026-10-09): a versioned record on the
    device, written only when the user decides, and withdrawn on the privacy settings screen
    the row's sentence promises ([ADR-020](docs/adr/ADR-020-record-consent-on-device.md)).
    Still open, and all of it before position is captured: the lawful basis (open question
    15), the iOS “Always” usage string and Android background-location declaration, the
    permission prompt's copy in both languages (open question 14), and **where the consent
    becomes demonstrable to anyone but the device it was given on** — it is sent nowhere
    today, and whether the server needs to know it (and how that survives a reinstall) is
    part of the lawful-basis decision. Also open: the frame draws the consent ticked, and
    this app ships it unchecked; the owner has not been asked to confirm that departure    the way screen 03's is asked about (open question 11).
    **Answered in part (2026-10-12)**: the app asks the platform for the **foreground** permission
    only — no “Always”, no Android background location and no foreground service — and reads nothing
    until the picker's own consent record says yes ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)).
    **Answered in part again (2026-10-12, the copy):** the screens stopped promising what the
    permission list forbids — the consent row, the benefit above it, frame 14's switch, the notice's
    row and screen 09's note say visit tracking “while the app is open”, and the stored field is
    `visitTracking` under a v2 key ([ADR-047](docs/adr/ADR-047-the-consent-says-what-the-app-does.md) §1).
    **Still the owner's, and now written as slots rather than a sentence:** whether Picky ever
    captures in the background, and if so the iOS “Always” string and Android background-location
    declaration with their store justifications, the watch's cadence (then unanswered — the app
    asked only for `Accuracy.High`), the lawful basis and whether anything derived from a fix may
    ever be kept —
    ADR-047 §2, all five, each naming what an answer changes in code. The frame's consent row also
    still ships unchecked against the design's ticked row, and the owner has not been asked to
    confirm that departure the way screen 03's is asked about (open question 11).
    **Resolved (2026-10-23)**: the owner answered the slots — **no background capture in v1**
    ([ADR-056](docs/adr/ADR-056-background-capture-is-out-of-scope.md)), with the lawful basis and
    what may be kept recorded in [ADR-055](docs/adr/ADR-055-retention-and-processors.md). No
    permission is asked, the guard test is the enforcement, the frames' promise stays a recorded
    departure, and revisiting it after the demo needs a new ADR.
    **Answered (2026-10-24, the foreground budget):** the watch asks for `Accuracy.High`, a fix at
    most once a minute and only after 50 m of movement, foreground only; the battery-versus-boundary
    trade-off and the Android-only time ceiling are recorded in
    [ADR-063](docs/adr/ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md). No ticker was
    added, and the background branch stays closed by ADR-056. The **measurement** that would turn
    the budget from a ceiling into a figure now has an instrument and a record: `/field-test`
    (development builds only; the route redirects in production) records fixes, gaps and the
    phone's own battery for a watch run and a control, and
    [docs/field-test.md](docs/field-test.md) carries the protocol and a result sheet that is still
    empty — no phone has run it yet. What remains here is the notice and the design's ticked row.

22. **The core navigation's shape — what is answered, and what is still the owner's.** The design
draws the same tab bar on frames 06–14 (Discover, Visits, Alerts, Profile) but says nothing about
how it behaves. Three parts of that were open, and two are settled by what exists: the
destinations are not placeholders (all four are built screens), and a push from onboarding keeps the bar
(screen 05's action leads into the shell). **Built 2026-10-10 as an assumption, since the owner
was not asked**: one shell over the nine screens, one stack, switching a destination navigating
rather than pushing (ADR-022) — recorded here because AGENTS.md §8 asks a decision this size to be
an owner's. **Still open, and one click to change**: whether the four destinations stay one stack
or each keeps its own history. Related and just as blocking for screen 06's own controls: nothing
returns a zone, a species or a yield score, so its search field, its species chips and its card's
numbers are the design's demo — open is where zones come from, who may report on them and what a
score means once the server owns it (decisions 9 and 10). The filter itself is real and needs no
service to be useful: it narrows the app's own demo zones by a place, a zone or a species, and
the day a zone source exists it narrows that instead.

23. **The report queue's remaining open parts: portability, and the lawful basis it sits under.**
Since 2026-10-09 the app queues the picker's report on the device
(`src/services/report-queue.ts`), because the owner chose that over leaving frame 10's save action
unbuilt. The **list half is answered**: frame 13's sync centre (`src/app/downloads.tsx`) and
frame 11's visit history (`src/app/visits.tsx`) both read the queue back, with each report's own
values, so the user can see everything the app keeps about a visit on the device that holds it. Two
things were owed: an **export or portability path** (a copy the user can take somewhere else —
the screens show the record, they do not yet hand it over; a “share the queued report” action or a
file export would answer it), and the **lawful basis** (open question 15), which has to be recorded
before a release that stores any picker's data at all. The **portability path was answered on
2026-10-11**: the notice's own row opens a screen where the copy is taken and the app hands it to
the **platform's own share sheet** — one versioned document holding the consent, the plan, the
queued reports and the account, with `incomplete: true` when a read failed
([ADR-040](docs/adr/ADR-040-the-copy-the-app-owes-is-a-document.md)). The app picks no destination
and uploads nothing, so no processor and no lawful basis are created by it; what is still owed is
the basis for the records themselves (open question 15).

Since 2026-10-10 the app keeps a second record of its own: the picker's **saved zones**, written by
frame 07's bookmark and removed by the same control (ADR-024). Of the two things that were owed for
it, the **export path** is answered by the same copy (the document carries the plan as its own
key), and the **lawful basis** is still open question 15. The third — a **surface** — was answered
on 2026-10-10: frame
14's “Saved spots” row now opens the plan in one list, drawn from the app's own vocabulary because
the design never drew that screen ([ADR-030](docs/adr/ADR-030-the-saved-plan-gets-a-screen.md),
known issue 28). Open, and the owner's call: whether an app-drawn list is the right answer (or a
frame should be drawn for it), and where an exported copy would go.

24. **How a picker reaches the marketplace demo, and what it would take to make it real.**
    The four frames are built (ADR-026) and nothing links to them: the design draws no entry
    point, and the app may not invent one (known issue 22). Open: whether the marketplace stays
    reachable by route only until it is real, gains an entry point the owner chooses (and what
    that entry says — a label promising a live marketplace would be the wrong claim), or is
    removed again. Related, and all of it before any part of it can act: the **listings service
    and seller accounts** (who may list, with what identity and what personal data), the **chat
    transport** (messages are personal data, and a seller's data needs its own lawful basis), the
    **payment provider** with its region, DPA and escrow semantics (open questions 3, 6, 16), and
    whether **Buyer** becomes a real role — CONTEXT.md records it as *not a v1 role*, and the
    frames' own “Buyer mode · Preview” is the design's word, not a role the app has.

25. **How long a session lasts, where it is kept, and on what basis.** The seam exists
    (ADR-028) and answers all three questions with a stand-in: `SESSION_LIFETIME_MS` is one hour
    (the length the decided provider's own ID token uses — not a product decision), the session
    lives in memory and is gone at the next reload, and the record holds the address or number the
    account is named by **and the name the sign-up collected** (ADR-029), whose **lawful basis is
    the same open question 15** as every other field the app keeps (AGENTS.md §11 asks each stored
    field for four answers; the module gives them).

    Answered on 2026-10-10, as this repository's assumption rather than the owner's decision:
    the frame's “Sign out” control signs out for real — it drops the session and deletes the
    device's records (the consent, the queued reports and the plan) and lands the user on the
    app's front door, with a failure stated rather than claimed (known issue 29).

    Open, and needed before a real sign-in ships: how long a session lasts and what refreshes it
    (the provider's ID/refresh pair, held through the port —
    [ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md)), whether it
    survives a reload at all and through what (ADR-006's secure adapter, which lands with the
    first real token), what signs a user out besides the control on screen 14 (an expiry, a
    revoked account, a reinstall?), and — the part the control's own meaning turns on — whether a
    signed-out user should keep the device-side records the app already holds (consent on screen
    05, the queued reports, the plan) rather than losing them with the account. Asked as
    §3.1–§3.2 in [to-questionnaire-sign-in.md](to-questionnaire-sign-in.md), with what happens to a
    walk in progress as §2.3.

26. **Shared spots with invited people: the sharing model's open parts.** The owner asked for this
    on 2026-10-10 and chose exactly what frame 14 already describes — spots, shared with people you
    invite, never a position (see “Recorded requirement” above). What is open is the shape, and it
    is asked of the design owner and the project owner in
    [to-questionnaire-community-map.md](to-questionnaire-community-map.md): **what a *shared* spot
    is** (the design's word against this app's one geographic thing, a **Zone** — which is also what
    CONTEXT.md leaves unsettled, while the app's own copy already calls the saved plan “Saved
    spots”; the two candidate answers are a name the sharer types onto the grant ADR-032 specifies,
    or the zone the service already names — **not** whether a curated unit exists below a zone,
    which is [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) §2.4; the branch
    where the sharer types the name has its follow-up already prepared in
    [ADR-037](docs/adr/ADR-037-what-a-share-points-at-if-the-sharer-names-the-place.md) — the
    grant's field and the read rule's non-change, activated or withdrawn by the answer), **where
    the control lives** (frame 14's default-visibility block that is deliberately
    not drawn today, frame 07's own screen, or both), **what the invite list is** (there is no
    contacts list, profile page or notification in the app today), and **what a viewer is shown**
    (the zone's own card, the sharer's name, how long ago it was picked). The owner still has to
    decide whether the frame's third state, **“Public: visible on the community map”**, ships at
    all, whether a shared spot **expires** (ADR-014's 12 months applies to anything stored
    server-side), and how a spot is **un-shared** — revoking has to be as easy as sharing
    (AGENTS.md §11.1). All of it is gated on three things that do not exist: the **zone service**
    (known issues 12 and 14), a **server** — sharing means sending another person's view of your
    spot somewhere, which brings a processor, a region, a DPA and a lawful basis with it
    (questions 3, 15 and 16), and would be the first thing this app ever sends — and a **design
    frame**. Until the frame exists no **copy** is written and no product code is added; what does
    exist, since 2026-10-10, is the throwaway prototype of three readings
    (`npm run prototype:community-map`, “Recorded requirement” §4), whose only wording is the
    designer's paper to react to. What also exists is the **access rule** the server must enforce
    ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)): a rule, not a feature — no screen, no
    copy, nothing sent, and nothing stored (known issue 31).
27. **Where the tracker's scripted zone list may live.** The owner asked on 2026-10-12 for the hook that
    turns position fixes into zone presence, “with a scripted zone list standing in for the service
    until it exists”. The chain is built and proven end to end
    (`features/visits/hooks/use-visit-presence.ts`,
    [ADR-046](docs/adr/ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)), and the hook
    takes the list as an **argument** — so what the zone service returns
    ([ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md), still Proposed) is the only
    thing that changes on the day it answers. This repository read “a scripted zone list standing in
    for the service” as a **test fixture** and ships no zone list at all, because a list of
    latitude/longitude polygons inside the app is *invented geography*: it claims a place is a curated
    zone, which is what ADR-021 and the demo-disclosure rule keep off surfaces the picker reads as
    true. **Open, and asked rather than assumed:** whether the owner wants the tracker to *run in the
    app* before the service exists — which means a disclosed demo list (the mechanism
    [ADR-042](docs/adr/ADR-042-frame-13s-region-is-the-designs-sample.md) already uses for the
    downloaded region, class D in [demo-and-stand-ins.md](docs/demo-and-stand-ins.md)) plus a screen
    that asks for a fix — or whether it stays a fixture until real rings arrive (known issue 14).
    Both are small; the difference is whether the app shows a picker a zone that only this repository
    made up.
28. **Identity: Firebase, or the team plan's own accounts?** The team's plan has the app register and
    sign in against its FastAPI (`POST /auth/register`, `/auth/login`, email + password, with a
    consent screen and the language on register), while this repository decided Firebase
    Authentication ([ADR-013](docs/adr/ADR-013-identity-provider.md)) and holds **no password**
    (CONTEXT.md, *Credential*). Both cannot be the answer. The plan's choice brings a credential this
    app has never stored, a reset story, and its own lawful basis and retention; Firebase keeps the
    provider that ADR-013 chose, and would need its ID tokens accepted by the team's API. Asked, not
    assumed ([ADR-051](docs/adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md) §4): which
    provider, and if the team's own, whether Firebase is dropped entirely or kept for phone
    verification.
    **Resolved (2026-10-23)**: the account belongs to the team's API and Firebase issues the
    credential — email + password at the provider, one account row in the API keyed by the provider
    subject, no password or hash in our database, `/auth/login` a token exchange if the plan keeps
    the name, phone deferred ([ADR-054](docs/adr/ADR-054-the-account-belongs-to-the-api.md)).
29. **Which of the built screens the MVP keeps — the map half is answered.**
    [ADR-051](docs/adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md) makes the plan's
    **MapLibre** map the target and its first deliverable is “MapLibre map with test zones”; on
    2026-10-22 screen 06 became exactly that ([ADR-053](docs/adr/ADR-053-the-discover-map-is-real-geography.md)),
    so the map retires the drawing on the home screen before the 17 Dec demo while frames 08–09 keep
    it. Still open:
    because the plan lists **eight** screens against this app's **23 routes**, which of the built
    screens the MVP keeps (marketplace, route to zone, saved spots, the device notice, the copy
    screen). The same question owns the **two meanings of *yield score***: the plan's zone-level
    0–100 forecast (now **Zone yield score** in CONTEXT.md) and this repository's per-visit estimate.
    The plan's app shows the first; screens 07 and 10 currently use the second's words.

## References

- [CONTEXT.md](CONTEXT.md) — the domain glossary (terms in use, and the ones not
  yet settled)
- [docs/plans/team-mvp-plan.md](docs/plans/team-mvp-plan.md) — the team's MVP plan as it concerns
  the app: what it says, what was read of it, and where it differs from what is built
- [docs/design-source.md](docs/design-source.md) — the Figma design inventory and how to
  extract values from it
- [docs/demo-and-stand-ins.md](docs/demo-and-stand-ins.md) — every value the app shows or
  keeps that is not its own observation, classified (the design's sample, a stand-in for a
  missing service, real data) and gated
- [docs/copy-claims-audit.md](docs/copy-claims-audit.md) — every shipped string that claims
  something the app cannot currently do, and where each claim is recorded or fixed (guarded by
  `src/config/__tests__/copy-claims.test.ts`)
- [docs/control-claims-audit.md](docs/control-claims-audit.md) — every control the app ships that
  claims an action it cannot perform, and where each one is recorded or drawn as a reading
  (guarded by `src/config/__tests__/control-claims.test.ts`)
- [README.md](README.md) — how to run the project
- [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md),
  [TESTING.md](TESTING.md), [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md),
  [CONTRIBUTING.md](CONTRIBUTING.md)
- [/AGENTS.md](/AGENTS.md) — Expo/React Native specifics
