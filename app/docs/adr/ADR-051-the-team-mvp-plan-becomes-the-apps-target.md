# ADR-051 — The team's MVP plan is the app's target architecture

- **Status:** Proposed (recorded 2026-10-22; it decides the direction, not the sequence, and four
  items below are the owner's answers before anything is built from it)
- **Date:** 2026-10-22
- **Deciders:** Project owner (asked on 2026-10-22 to “check this, it is planned by team members, so
  need to adjust accordingly”, pointing at the team's two planning documents)

## Context

The project is one student team's eight-week MVP (“Team Picky · TIES4570 CSDP”, final demo
17 Dec 2026) with the mobile app assigned to this repository's owner. The team wrote two documents
that describe the app it expects: an MVP architecture and tech stack document, and a deep dive on
the map feature that is built first. Their app-side content is transcribed in
[docs/plans/team-mvp-plan.md](../plans/team-mvp-plan.md), which is the input to this ADR.

This repository has spent its history building the **design's screens** — the Figma frames, screen
by screen, drawn maps and demo values included — with ADRs deciding what each frame may claim. The
plan describes a different app in places: real zone geometry rendered by MapLibre, a generated
OpenAPI client with TanStack Query, a SQLite cache and outbox with a sync engine, email-and-password
accounts on the team's FastAPI, a smaller MVP screen list, and four berry species rather than three.

The question is not whether the plan is good; it is **what this repository treats as authoritative**
when the two disagree, and what has to be decided before the app is rebuilt to match.

## Decision

1. **The team's MVP plan is the target for the app's data, transport and map**, adopted as the
   destination:
   - the app talks to one FastAPI backend generated from an OpenAPI contract, through a generated
     TypeScript client;
   - reads go through TanStack Query with a persisted cache; writes go to a **local outbox** keyed by
     a client-generated UUID and are pushed by a sync engine, pulled as deltas;
   - local state lives in SQLite behind Drizzle;
   - the map is **MapLibre** with real zone geometry and downloadable offline areas;
   - device detection follows the plan's visit state machine (20 nearest geofences, refresh every
     2 km, 10-minute dwell, 5-minute grace, local notification for feedback), and **raw GPS never
     leaves the phone**.
2. **What is accepted here does not override the design source.** Screens still come from the Figma
   file ([ADR-016](ADR-016-figma-mcp-design-source.md)); where the plan's screen list and the frames
   differ, the frames decide what a screen looks like and the plan decides what it is *for*. A screen
   the plan names and no frame draws is app-drawn and recorded as such, exactly as the app's other
   app-drawn screens are.
3. **Nothing is deleted by adopting the plan.** The screens built so far keep working while the
   transport, the local database and the map are built behind them; retiring one is its own
   decision with its own record.
4. **Four items are explicitly the owner's, and are not decided by this ADR** (PROJECT.md open
   questions 28–29): the identity provider (Firebase in
   [ADR-013](ADR-013-identity-provider.md) vs the plan's email-and-password accounts), whether the
   drawn map ([ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md)) is retired now or after
   the demo, the two meanings of *yield score*, and which of the built screens the MVP keeps.
5. **ADR-021 and ADR-031 are not reversed here.** ADR-031 already chose MapLibre over self-hosted
   tiles for the day the map becomes real; this ADR makes that day the plan's, and leaves the drawn
   map standing until the owner says when it goes.

## Alternatives considered

- **Keep building the Figma screens and treat the plan as documentation.** Rejected as a direction:
  the app is one person's deliverable inside a seven-person project whose backend, database and
  scoring are being built to this plan. An app that cannot call the API is not the app the team is
  shipping.
- **Rebuild the app to the plan's layout in one move** (rename the route tree, replace the screens,
  install the whole stack). Rejected: it deletes working, tested surfaces before the API exists, and
  it would break the app's own guarantees (both languages, the accessibility contract, the layout
  harness) in a single unverifiable change.
- **Adopt the plan's stack but keep two sources of screens** (the plan's list and the frames).
  Rejected: two lists of screens is how an app drifts from its design; §2 above keeps one rule.
- **Decide the four owner items here.** Rejected: each changes product behaviour, vendor or data
  protection, and AGENTS.md §5/§8 requires the owner's answer rather than this repository's
  preference.

## Consequences

- **New dependencies, all to be installed with `npx expo install` and, where they carry native code,
  as a development build**: `@maplibre/maplibre-react-native` (not in Expo Go), TanStack Query (+ a
  persistence layer), Drizzle +
  `expo-sqlite`, Zustand, the generated API client. Every one of them is a new native module in the
  demo APK.
- **New personal-data decisions arrive with the code**, and each is a recorded decision before the
  field exists (AGENTS.md §11.1): an account with an email and a password (ADR-054), a foreground
  position read — background capture is out of scope for v1 (ADR-056) — per-species feedback ratings
  and amounts, and photos uploaded to object storage. The plan's own constraint — “raw GPS tracks
  stay on the phone” — is compatible with ADR-010 and is the line to hold.
- **The app's own guarantees still apply to every new screen**: Finnish and English copy from the
  catalogue, the contrast pair asserted, touch targets at 44 px, the largest text size measured, and
  no control that claims an action it cannot perform.
- **The map's 5 colour bands and confidence fade are new tokens** in `src/constants/theme.ts` with
  their contrast pairs asserted, not hard-coded colours.
- **The plan's documents are partly transcribed.** What was not read is listed in the plan file and
  must not be inferred; the sections that are missing may change these consequences when they are
  added.

## Status

**Proposed.** Adopted as the app's target direction by the owner's instruction of 2026-10-22.

**Partially answered (2026-10-23).** The identity item is answered by
[ADR-054](ADR-054-the-account-belongs-to-the-api.md) (the API owns the account, Firebase issues the
credential) and the background-permission item by
[ADR-056](ADR-056-background-capture-is-out-of-scope.md) (foreground only for v1); the drawn map's
retirement is settled for screen 06 by [ADR-053](ADR-053-the-discover-map-is-real-geography.md).
Where the consequences below name `expo-task-manager` and a background location permission, ADR-056
replaces them. Still open: the two meanings of *yield score*, and which of the built screens the
MVP keeps.
