# ADR-045 — A position behind a port, read only with the picker's consent, and nothing kept

- **Status:** Accepted (2026-10-12)
- **Deciders:** the project owner asked for real position capture (2026-10-12) and answered the two
  questions this repository put to them: build the capture seam now rather than the real basemap
  first, and ask for the **foreground permission only**.
- **Related:** [ADR-020](ADR-020-record-consent-on-device.md) (the consent record that gates it),
  [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) (the map is a drawing),
  [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) (the real basemap, deliberately not
  built), [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the port pattern this follows),
  [ADR-014](ADR-014-retention-policy.md) (retention, which applies to records the app keeps),
  ADR-010 (per-segment centroids, never a movement trace) and [ADR-044](ADR-044-the-partial-frames-remaining-parts.md)
  (what the frames still draw), PROJECT.md known issues 12, 14 and 30, and SECURITY.md §11.

## Context

The owner asked for the position capture the design assumes — frames 06 and 09 draw a recentre
control, screen 05 asks for location consent, and the visit domain has been built and uncalled since
2026-10-08 waiting for input. Reading the code first turned up two facts that change what is
possible, and both are now on the record:

1. **The map has no geography.** `zone-map-geometry.ts` says of itself that every path is “in the map
   frame's own coordinate space (342×300)”, extracted from the design. There is no latitude or
   longitude anywhere on the drawing, so a real fix has no honest place on it — which means the
   recentre control waits on **the real basemap** (ADR-031), not merely on a position source and a
   map that can pan (PROJECT.md, known issue 12).
2. **Containment has no rings to test.** `findContainingZone` takes latitude/longitude polygons, and
   nothing returns a zone yet (known issue 14). A real fix therefore cannot be turned into “inside
   zone 14” in the field today, whatever the app does with position.

What *is* buildable, honestly, is the seam itself: the app can read where the device is, behind the
picker's own consent and the platform's foreground permission, and it can have the rule that joins a
fix to the visit domain. That is what the owner asked for once these two facts were in front of
them, with the record corrected rather than the control faked.

## Decision

**Position is read through a port, only while a screen is asking, only with the picker's consent,
and nothing about it is kept.**

1. **The seam is a port** (`src/services/location/`): `requestAvailability()` and `watch()`, with
   `expo-location` behind it and nothing else in the app touching the platform. The platform's answers
   are translated into the app's own three — `granted`, `denied`, `unavailable` — and **anything that
   is not a yes is not a yes**: the platform declining to decide reads as `unavailable`. A platform
   that will not answer at all rejects, because a failure is not a refusal.
2. **The permission is the foreground one.** `requestForegroundPermissionsAsync` and the foreground
   watch; the background task API is never used. Android's `ACCESS_BACKGROUND_LOCATION`, iOS's
   “Always”, the Android foreground service and their store declarations are **not** asked for and
   their config switches are asserted absent by a guard test (`src/config/__tests__/location-permissions.test.ts`),
   because a permission is a one-word edit away from existing.
3. **The picker's consent record is the gate** (`src/services/privacy-consent.ts`, ADR-020). No
   record, a record that says no, and a record the device would not hand over all mean the same
   thing: nothing is read. An unreadable record is unanswered, never agreement.
4. **A watch runs only while a screen is asking for it, and only when consent says yes.** Mounting
   `use-device-position` is the ask; leaving the screen stops the watch; a watch that fails while
   running drops the fix it held, because a fix from a dead watch is no longer evidence of anything.
   **No watch runs in the app today** — nothing consumes a fix while the map has no geography and no
   zone service returns rings — so the app reads nothing at all, which is the least it can collect.
5. **Nothing is stored, sent or logged.** A `PositionFix` lives in memory for as long as the screen
   that asked is open; there is no trail, no session store and no log line (ADR-010's shape,
   SECURITY.md §11). What ADR-014's 12 months govern is records the app will one day keep, and today
   it keeps none.
6. **The join to the visit domain is a pure rule** (`features/visits/domain/position-presence.ts`):
   a containment answer in, the tracker's samples out, with **what was left closed before what was
   entered is opened** — the order the lifecycle's one-open-visit-per-zone model depends on. It reads
   no clock: the instant it stamps is the observation's own.
7. **Nothing draws a position, and the frames' recentre control stays absent** — now with the right
   reason on the record: it waits on a map that carries geography (ADR-031) beside a position source,
   not on a pannable drawing. The map's own marker keeps saying it is the design's composition
   (ADR-021) rather than “you are here”.
8. **Background tracking is an open owner question, not an assumption.** The consent screen's copy
   promises timing a visit “while the app is in the background”; honouring it needs the platform's
   “always”/background permission, an Android foreground service and a store declaration each, and
   none of that is decided (PROJECT.md, open questions). Likewise undecided and recorded: the
   watch's cadence (the app asks for `Accuracy.High` — see the consequences — and nothing about how
   often or how far apart) and whether anything derived from a fix may ever be persisted.

## Alternatives considered

- **Build the real basemap first.** Rejected for now, by the owner's choice: it is the larger piece
  (tile hosting, licensing, projection — known issue 30) and the position seam is needed on either
  path, so building it first buys nothing and delays the honest half.
- **Draw a marker for the device on the design's drawing.** Rejected: the drawing has no geographic
  coordinates, so any placement would be invented geography — the thing ADR-021 and the
  demo-disclosure rule exist to prevent.
- **Read position without the app's own consent record, on the platform permission alone.**
  Rejected: consent must be an affirmative action the app can show (ADR-020, AGENTS.md §11), and the
  platform's permission is not the app's record of what the user agreed to.
- **Ask for background permission now, to match the consent copy.** Rejected: it is the heaviest
  permission on both platforms, it needs a store declaration and a purpose a reviewer accepts, and
  nothing consumes a fix yet. What the app asks for and what its copy promises must be brought into
  line deliberately — an owner decision, recorded.
- **Start a watch at app start so capture “exists”.** Rejected: it would collect position for
  nothing, which AGENTS.md §11.1's least-collection rule forbids. The seam is real without a watch
  running.
- **Keep a short trail in memory to smooth containment.** Rejected for now: nothing consumes a fix
  yet, and ADR-010's shape is derived answers rather than traces. If containment ever needs a window,
  that is a decision of its own, with the retention question attached.

## Consequences

- The app has a **real position seam**: `src/services/location/` (port + `expo-location` adapter),
  `src/hooks/use-device-position.ts` (the consent and permission gate), and
  `features/visits/domain/position-presence.ts` (the join to the visit lifecycle), all tested without
  a device — including the guard that no background location permission is configured.
- **A native module is now a dependency** (`expo-location`, SDK-compatible version through
  `npx expo install`), configured in `app.json` with the app's own foreground usage string. It ships
  in Expo Go, and the app's own copy is English: the platform's usage strings are not localised in
  this project yet, which is recorded rather than implied.
- **The app reads nothing today, and that is stated rather than hidden.** No screen calls the hook,
  because there is nothing that can use a fix yet: the map cannot place one and the visits domain has
  no rings to test. When the zone service or the basemap arrives, the consumers are one hook call
  away.
- **The frames' recentre control and the design's promise of a background-tracked visit are the two
  visible things still owed**, each with its own missing piece named (a map with geography; a
  background permission decision — answered “no” for v1 by
  [ADR-056](ADR-056-background-capture-is-out-of-scope.md) on 2026-10-23).
- **`Accuracy.High` is the app's own choice** (the platform's default, `Balanced`, is ~100 m, which
  would put a picker in a zone they are not in), awaiting confirmation with the cadence question —
  recorded in `docs/demo-and-stand-ins.md` as class D rather than presented as a requirement.
