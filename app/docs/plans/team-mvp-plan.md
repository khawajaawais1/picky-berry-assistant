# The team's MVP plan, as it concerns the mobile app

**Status: recorded; the team repository's own documents are the authority.** This file transcribes
what the project team's two planning documents ask of the app, and compares that with what the app
builds today. The monorepo now documents the same architecture in
[`../../../docs/architecture.md`](../../../docs/architecture.md) and
[`../../../CONTEXT.md`](../../../CONTEXT.md); where this recording and those differ, they win —
the zone area below is one such correction (**≈ 0.57 km²** at 62° N, not 0.74). Every conflict
goes to the owner (PROJECT.md, open questions 28–29); nothing here changes an accepted ADR on its
own authority.

- Recorded: 2026-10-22.
- Source documents, both by “Team Picky · TIES4570 CSDP”, dated 22 Oct 2026, shared as Claude
  artifacts:
  1. **Berry Picker Assistant – MVP Architecture & Tech Stack** —
     <https://claude.ai/artifact/EnkBHuaL7DENBFutQMPEqw>
  2. **Feature 6.2 Deep Dive – Live Site Map with Yield Score & Confidence** —
     <https://claude.ai/artifact/5crUR5hVSYNFmu1GrDujp7>
- **What was read** (this session): document 1 — title, §1 scope/constraints/principles,
  §2 system overview (its diagram did not render), the §3 stack table from *media storage* down,
  **§4 Mobile app (React Native) in full**, the opening of §5 (backend folder layout), §6.2–§6.5
  and §17 (ownership, risks, open decisions); document 2 — §1 (what is being built, the six user
  stories and acceptance criteria A1–A8).
- **What was not read**: document 1 — everything above §3's captured rows, §5 after the folder
  layout, §7–§16 (accounts and roles, visits, feedback, trust, yield model, ontology, ingest,
  analytics, media, deployment); document 2 — §2 onwards (dependency map, dependency checklist,
  data model, scoring, API, screens, stack). Those are **not** summarised here and must not be
  inferred from the parts that are. Paste or save them into this folder and they get appended.

## 1. What the plan is building

> We build the MVP as a **React Native (Expo) app** talking to one **FastAPI modular monolith**
> backed by **PostgreSQL + PostGIS**, with the ontology, YOLO and yield models running inside that
> same backend. Everything fits on one small EU-hosted VM and is ready for the final demo on
> 17 Dec 2026.

Nine core features are in scope: accounts and roles; live site map with yield score (0–100) and
confidence; GPS visit detection (arrive / pick / leave); feedback (rating + photo); validation and
trust weighting; yield prediction; reasoning and explainable push alerts; analytics (median stay
time, trends); offline mode and privacy.

Constraints the design answers to, as the document states them:

| Constraint | What it means for the design |
| --- | --- |
| Course rule: simplest and cheapest | One backend image, free tiers, no Kubernetes, no microservices |
| Budget ≈ €485/yr | Weather, maps and push must be free; cloud ≈ €360/yr |
| 7 students, 8 weeks (21 Oct – 17 Dec) | Clear module boundaries so each owner works without blocking others |
| No berry season before the demo | Testable with WildBe images, historical weather and simulated GPS |
| WildBe is CC BY-NC 4.0 | Non-commercial use only; cite the paper; own images before any paid launch |
| Location data is personal data (GDPR) | Privacy by default; **raw GPS tracks stay on the phone** |

Architecture principles: **modular monolith**; **Postgres does the heavy lifting**; **offline-first
app** (every write carries a client-generated UUID so retries are safe); **explainable by design**
(every score and alert stores *why*); **contract-first API** (FastAPI generates OpenAPI, the app's
TypeScript client is generated from it so the two never drift).

## 2. What the plan says about the app (its §4, the owner's part)

The document assigns the app to **Salman (Prottoy)**: “React Native app (section 4)”, first
deliverable on 3 Nov — “Expo skeleton, MapLibre map with test zones”. Screens come from Sabih's
Figma. The app is **offline-first: it reads from its local SQLite cache, writes to a local outbox,
and a sync engine talks to the API whenever the network is up.**

### 2.1 Folder layout

```
app/
  app/                       # expo-router screens (file-based)
    (auth)/login.tsx, register.tsx
    (tabs)/map.tsx, visits.tsx, alerts.tsx, profile.tsx
    zone/[id].tsx, visit/[id]/feedback.tsx
  src/
    api/                     # generated OpenAPI client + TanStack Query hooks
    db/                      # Drizzle schema, migrations, outbox
    sync/                    # sync engine (push outbox, pull deltas)
    location/                # background task, geofences, visit state machine
    map/                     # MapLibre setup, offline pack manager, layers
    features/                # map, visits, feedback, alerts, profile
    store/                   # Zustand stores (UI, settings)
    i18n/                    # fi + en strings
```

### 2.2 Core screens (MVP)

| Screen | What it shows / does | Main API calls |
| --- | --- | --- |
| Login / register | Email + password, consent screen, language | `POST /auth/register`, `/auth/login` |
| Map (home) | Zones coloured by yield score, species filter, confidence shading, “near me” list | `GET /zones?bbox=&species=` |
| Zone detail | Score, confidence, ripeness, last reports, “why this score” explanation | `GET /zones/{id}`, `/zones/{id}/explanation` |
| Active visit | Timer, zone, “I'm picking” toggle, end visit | Local only, synced later |
| Feedback | 1–5 rating per species, amount estimate, optional photo | `POST /visits/{id}/feedback`, presigned upload |
| Alerts | Inbox of push alerts with their reason | `GET /alerts` |
| My stats | My visits, median stay time, zones visited | `GET /me/analytics` |
| Profile & privacy | Sharing level, background location on/off, download offline area, export / delete my data | `PATCH /me/privacy`, `POST /me/export`, `DELETE /me` |

### 2.3 Visit state machine (on device)

1. **Idle** → the phone registers geofences for the **20 nearest zones** (iOS caps an app at 20
   regions; the set is refreshed every **2 km** moved).
2. **Entered** on geofence entry → start a dwell timer.
3. **Visiting** after **10 min** inside (filters people driving through). Optionally the user taps
   “Start visit” to skip the wait.
4. **Left** on geofence exit + **5 min** outside → the visit ends; a local notification asks for
   feedback.
5. **Synced** when the outbox uploads the visit (zone id, start, end, duration). **The raw GPS
   track never leaves the phone.**

The thresholds (10 min, 5 min, 2 km) are configuration values tuned in user tests.

### 2.4 Offline mode

- **Map**: the user downloads an **offline area** (MapLibre offline pack, default 30 km around home,
  ≈ 50–150 MB). Zone polygons and the latest scores are stored in SQLite with the pack.
- **Writes**: visits, feedback and photos go to an **outbox** table with a client UUID; the sync
  engine retries with backoff; the server treats the UUID as an idempotency key.
- **Reads**: the TanStack Query cache is persisted to storage; the map shows the cached score with a
  **“last updated”** label.
- **Conflicts**: none by design — users only create their own records; server-computed scores always
  win.

Permissions flow: ask for “while using” location first, explain the benefit, and only then ask for
background location. The app still works (manual visit start) if the user says no.

## 3. The map feature's own document (document 2, §1)

The map is the home screen and is built first (sprints 1–2, 21 Oct – 17 Nov). A picker sees, on a
map of the forests around them, how good each zone is for a chosen berry right now: a **yield score
0–100**, a **confidence level** (high / medium / low), a **ripeness stage**, and a plain-words
reason.

User stories, as written:

1. see coloured zones around the location within 3 seconds of opening the app;
2. choose a berry (**bilberry, lingonberry, cloudberry, crowberry**) and the colours change to it;
3. tap a zone and see its score, confidence, ripeness, when it was updated, and why;
4. see a **“Near me” list of the best 10 zones** within the radius, sorted by score and distance;
5. in the forest without signal, still see the last scores downloaded, with a “last updated” label;
6. tell at a glance when a score is a guess (low confidence) and when it is backed by reports.

Acceptance criteria (their A1–A8): zones load for the visible area in < 3 s on 4G with
`GET /zones` < 300 ms (p95) for a 20 × 20 km view; every forest zone has a score for every species
even with zero reports; colour is **5 score bands**, low confidence is faded/hatched, and the legend
is always visible; the zone sheet shows score, confidence, ripeness, updated time and ≥ 2
plain-words reasons; a species switch re-colours the map in < 1 s with no full reload; after one
online session the map, zones and last scores show in airplane mode; scores refresh daily at 07:00
and within 5 min of a new trusted report; it works on iOS 16+ and Android 10+.

“Not in this feature: visit detection, feedback forms and push alerts — this feature only reads the
reports they create.”

## 4. Zones, scores and confidence (document 1, §6.2–§6.5)

- **Zones are H3 hexagons at resolution 8** (the plan says ≈ 0.74 km²; at the pilot's 62° N the
  cell is ≈ 0.57 km² — the team brief's figure, and the one to use) clipped to forest land in the pilot
  area around **Jyväskylä**; the PostGIS polygon is stored for map drawing and point-in-zone tests.
- `GET /zones?bbox=…&species=bilberry` returns GeoJSON with `score`, `confidence`, `ripeness`,
  `updated_at`.
- The app **colours zones by score (5 bands)** and **fades them when confidence is low**.
- **Score fusion**: `S_zone = α · S_reports + (1 − α) · S_model` with
  `α = N_eff / (N_eff + k)`, `k = 3`; `S_reports` is a trust-and-recency-weighted mean of ratings
  (`w_i = T_u(i) · e^(−Δt_i/τ)`, `τ = 4 days`), and `N_eff = Σ w_i`. **Confidence** is High when
  `N_eff ≥ 3` and the model's 10–90 % band is narrower than 25 points; Low when `N_eff < 0.5` and the
  band is wider than 50; Medium otherwise. The “why this score” panel lists the top inputs.
- **GPS visit detection**: detection runs on the phone; the server receives only
  `{client_id, zone_id, started_at, ended_at, manual}` and checks zone existence, a 5 min – 10 h
  duration, no overlapping visit, not in the future. Rejected visits are stored with
  `status = rejected` and a reason.
- **Feedback**: per-species rating 1–5, optional amount in litres, optional photo(s). Upload asks for
  a presigned URL, goes straight to object storage, then tells the API to run YOLO. Feedback without
  a visit is allowed but gets half weight.
- **Trust**: `T = (agree + 1) / (agree + disagree + 2)` in [0, 1]; new users start at 0.5. Fraud
  checks: visit-backed reports count once per zone per day; more than 10 reports a day are flagged;
  a report more than 50 km from the user's last visit is flagged.

## 5. Stack rows that touch the app

| Area | The plan's choice |
| --- | --- |
| Map | MapLibre, offline packs, self-hosted style/tiles |
| API client | generated from FastAPI's OpenAPI; TanStack Query hooks |
| Local data | Drizzle schema and migrations over SQLite; an outbox table |
| Client state | Zustand stores (UI, settings) |
| Media | presigned upload straight to S3-compatible storage |
| App binaries | EAS Build (CI: GitHub Actions → image → SSH deploy) |
| Quality | ESLint + Prettier + Jest + React Native Testing Library for the app; **Maestro** for mobile E2E |
| Monitoring | Sentry free tier (app + backend) |
| Languages | fi + en strings in `src/i18n/` |

## 6. Where this repository stands today

| Plan item | This repository today | What closing the gap needs |
| --- | --- | --- |
| Map from MapLibre with real zone geometry | **Drawn map**: the design's own geometry with `react-native-svg`, the design's demo zones, no pan/zoom, no device position ([ADR-021](../adr/ADR-021-draw-the-map-from-the-designs-geometry.md)); the real basemap is already planned as self-hosted tiles + MapLibre ([ADR-031](../adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)) | MapLibre + a tile source; `GET /zones`; zone geometry that carries geography (the drawn map's coordinates are the frame's) |
| API client + TanStack Query | No network client at all; screens read the design's demo values or this device's own records (`services/report-queue.ts`, `services/saved-zones.ts`) | The generated client, a base URL in `src/config/env.ts`, and the first endpoint that returns real data |
| Drizzle/SQLite cache, outbox, sync engine | A queue of reports on the device (AsyncStorage) written by screen 10, read by screens 11 and 13; nothing is sent | The local database, the outbox table and the sync engine |
| Routes `(tabs)/map|visits|alerts|profile`, `(auth)/login|register`, `zone/[id]`, `visit/[id]/feedback` | `(app)/discover|visits|alerts|privacy-settings` plus pushed screens `zone-details`, `zone-reports`, `route-to-zone`, `active-visit`, `post-visit-feedback`, `downloads`, `saved-spots`, `account-security`, `terms-privacy`, `your-data`; sign-in and sign-up sit outside the shell | A rename/move of the route tree, or a recording that the design's names are the app's own |
| Four species (bilberry, lingonberry, cloudberry, crowberry) | Three (`lingonberry`, `bilberry`, `cloudberry`) | A fourth species in the domain list, the catalogue and any screen that names them |
| Zone score 0–100 per species, 5 colour bands, confidence shading, “why this score”, “near me” top 10 | A zone card shows the design's `78 / 100 yield`, “High confidence”, the ripening chip and a report age; the legend names three picking states; scores are the design's sample | Real zone scores, the five bands and their tokens, the confidence rule, the reason list, the ranking |
| Visits: geofences, dwell 10 min, grace 5 min, background task, local notification, outbox payload | Pure visit rules (`features/visits`: dwell, grace, presence segments) driven by a foreground position port ([ADR-045](../adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)); no geofencing, no background task, no server | `expo-task-manager` + geofencing, background location permission (ADR-047 §2 is still the owner's decision), and the visit endpoint |
| Accounts: email + password on FastAPI | Firebase Authentication ([ADR-013](../adr/ADR-013-identity-provider.md)) behind a stand-in session port; screens 03/04 collect an identifier and a code | A decision — two identity providers cannot both be the answer (open question 28) |
| Alerts inbox from `GET /alerts`, FCM push with a reason | Frame 12's alert, forecast and preferences as the design's sample | A push transport and the alerts endpoint |
| My stats from `GET /me/analytics` | Frame 11's season summary and chart are the design's sample; the visit history lists this device's own reports | The analytics endpoint |
| Profile & privacy: sharing level, background location, offline area, export/delete | Frame 14's rows: saved spots, visit tracking while the app is open, offline centre, account & security, language, terms & privacy, sign out; export through the device's share sheet ([ADR-040](../adr/ADR-040-the-copy-the-app-owes-is-a-document.md)) | The three endpoints and the decisions behind them (sharing level is the unsettled shared-spot model), plus the offline pack manager |
| Maestro mobile E2E | Playwright harness on the web export ([ADR-018](../adr/ADR-018-measure-layout-in-both-languages.md), [ADR-019](../adr/ADR-019-measure-at-the-largest-system-text-size.md)) | A device/emulator harness |
| Sentry on app and backend | Nothing | The SDK, a DSN in `config/env.ts`, and a processor decision (GDPR, AGENTS.md §11) |
| fi + en strings | Finnish + English typed catalogues ([ADR-017](../adr/ADR-017-localization.md)) | Nothing — this is the one row where the two already agree |

## 7. What the plan keeps, and what it changes

**Keeps**: React Native + Expo as the app's framework, now at `app/` in the monorepo
([ADR-001](../adr/ADR-001-mobile-framework.md), [ADR-052](../adr/ADR-052-the-app-lives-in-the-team-monorepo.md));
feature modules with a public API
([ADR-002](../adr/ADR-002-feature-based-modules.md)); tests first with Jest + RNTL
([ADR-004](../adr/ADR-004-tdd-and-test-stack.md)); typed fi/en catalogues
([ADR-017](../adr/ADR-017-localization.md)); offline-first capture with idempotent sync
([ADR-005](../adr/ADR-005-offline-first-sync.md)); positions kept nowhere on the server
([ADR-010](../adr/ADR-010-position-retention.md)) — the plan's “raw GPS track never leaves the phone”
is the same decision stated on the plan's side.

**Changes or contradicts**:

1. **Identity.** The plan signs in against its own FastAPI with email + password; this repository
   picked Firebase ([ADR-013](../adr/ADR-013-identity-provider.md)) and holds no password
   (CONTEXT.md, *Credential*). Both cannot be true.
2. **The map.** The plan renders MapLibre over real H3 geometry; the screens built so far draw the
   design's geometry ([ADR-021](../adr/ADR-021-draw-the-map-from-the-designs-geometry.md)). ADR-031
   already moved the *real* basemap to MapLibre, so this is a question of when the drawn map is
   retired, not of which renderer wins.
3. **A zone's score vs a visit's score.** The plan calls the zone's 0–100 forecast a **yield
   score**; this repository's glossary uses *Yield score* for the per-visit estimate
   ([CONTEXT.md](../../CONTEXT.md), Scoring). Two meanings need one word each.
4. **The screens.** The plan's MVP screen list is smaller than what is built (no marketplace, no
   route screen, no saved spots, no device notice) and carries ones that are not built (zone detail
   from an API, feedback addressed to a visit, my stats). Which of the built screens stay is the
   owner's call.
5. **The design source.** The plan's screens come from “Sabih's Figma”; this repository's authority
   for what a screen looks like is the Figma file ([ADR-016](../adr/ADR-016-figma-mcp-design-source.md)).
   Both are satisfied only if the plan's screen list and the Figma frames are the same list.

## 8. What this file does not decide

Nothing. Sequencing, what gets built first, whether the Figma-built screens are retired or kept
beside the plan's, the identity provider and the two score words are the owner's calls, asked as
PROJECT.md's open questions 28 and 29. The ADR written from this recording
([ADR-051](../adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md)) is **Proposed** for that
reason.
