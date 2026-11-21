# ADR-066 — The visit tracker is mounted over the zone service, and posts finished visits

- **Status:** Accepted (2026-11-21)
- **Date:** 2026-11-21
- **Deciders:** Project owner, on 2026-11-21, answering the API integration plan's gap 6 ("mount
  the visit tracker so visits actually post?") with yes.
- **Supersedes:** [ADR-046](ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)
  decisions 2 and 6: the hook still ships no zone list of its own, but it now has a caller, and the
  zones come from the zone service.
- **Related:** [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) (position behind a
  port, nothing kept), [ADR-056](ADR-056-background-capture-is-out-of-scope.md) (foreground only),
  [ADR-063](ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md) (no ticker),
  [ADR-065](ADR-065-the-api-issues-the-credential.md) (the team API).

## Context

ADR-046 built the tracker end to end and gave it no caller, because nothing returned real zone
rings and a scripted list would have been invented geography. The team API now serves the pilot
area's zones (`GET /zones`) and takes finished visits (`POST /visits`, idempotent on `client_id`).
The submission path was built and tested with nothing feeding it.

## Decision

1. **The app shell mounts the tracker** (`AppVisitTracking` in `src/app/(app)/_layout.tsx`). It
   runs while the shell is open and draws nothing.
2. **The gates are unchanged.** Position is read only under the picker's consent record and the
   platform's foreground permission (ADR-045). There is no background capture (ADR-056).
3. **The zones are the zone service's**: the same answer the map reads, as tracker polygons.
4. **A visit finalizes on the next fix after its grace window.** There is no ticker (ADR-063). The
   fix is the time evidence, so `useVisitPresence` calls `finalizeExpired` at each fix's instant.
5. **Each finalized visit is posted once** through `useVisitSync`. Only the visit's start, end,
   zone and id leave the device. No fix is stored, logged or sent.
6. **A build with no visits service mounts nothing.** The layout harness's stub build watches no
   position for a service it cannot post to.

## Alternatives considered

1. **Keep the tracker unmounted.** Rejected by the owner: the visits API would never receive a visit.
2. **A timer that finalizes visits.** Rejected: ADR-063 rules out a ticker, and a fix already carries
   the time.

## Consequences

- With consent given and permission granted, the app watches position whenever the shell is open,
  not only on one screen. The watch's cadence and battery budget are ADR-063's.
- A visit the picker walks out of finalizes on the next fix or the next return to the foreground,
  whichever comes first.
- **Amended 2026-11-21:** finished visits are kept in a durable outbox
  (`services/visit-outbox.ts`, `picky.visit-outbox.v1`) until the server answers them, flushed on
  launch, after each visit and on returning to the foreground. The notice lists it, the user's copy
  carries it (export format v2), and signing out deletes it. Returning to the foreground also
  finalizes any visit whose grace window passed with no fix, on iOS and Android alike. A visit that
  is still open when the process ends is not kept: it holds a live presence, not a finished visit.
