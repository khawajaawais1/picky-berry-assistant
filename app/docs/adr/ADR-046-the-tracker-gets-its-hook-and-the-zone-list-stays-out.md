# ADR-046 — The tracker gets its hook, and the zone list stays out of the app

- **Status:** Accepted (2026-10-12)
- **Deciders:** the project owner asked for the hook that turns position fixes into zone presence and
  drives the visit tracker, “with a scripted zone list standing in for the service until it exists”
  (2026-10-12); this repository decided where that scripted list may live, and built the chain.
- **Related:** [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) (the position seam this
  hook reads), [ADR-036](ADR-036-the-zone-service-what-it-must-return.md) (**Proposed** — the zone
  service whose payload is the list), [ADR-005](ADR-005-offline-first.md) (the client-generated
  idempotency key a visit carries), [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) (why
  invented geography is not drawn), and `docs/demo-and-stand-ins.md` (classes B and E), PROJECT.md
  known issue 14.

## Context

The chain the frames assume was in pieces that had never been joined: `findContainingZone` (pure
containment), `presenceSamplesFor` (a containment answer becomes the tracker's samples, ADR-045),
`applyPresence` (samples become visits and events), and a position seam that can read a real fix
(ADR-045). What was missing was the wiring, and one input: **a zone list**.

Nothing returns zones (known issue 14, ADR-036 unanswered), so the owner's ask included a scripted
list to stand in for the service. That is the one part of the ask with a real decision in it: a
scripted list of latitude/longitude polygons in a shipped app is *invented geography* — a claim that
a place is a curated zone — which is the thing ADR-021 and the demo-disclosure rule exist to keep off
surfaces the picker reads as true. A fixture in a test claims nothing about anywhere.

## Decision

**The whole chain is built and tested end to end; the scripted zone list is a fixture, and the app
ships no zone list at all.**

1. **`features/visits/hooks/use-visit-presence.ts` is the wiring**: a fix in, and out the other side
   the zone it fell in (`findContainingZone`), the entry that has not yet earned the dwell
   (`candidate`), the `visits` the tracker made, and the `events` in the order it decided them. It
   applies no rule of its own: every one is a pure function with its own tests, and this hook reads
   no clock and no device.
2. **The hook takes the zone list as an argument**, so the payload the zone service returns is the
   only thing that changes on the day it exists (ADR-036). It ships **no list of its own** — not a
   demo one, not a dev-gated one — and its tests drive it with fixtures (two squares of about 200 m,
   which is the scale a zone is).
3. **The device gate stays the only gate.** The hook does not read position itself: it consumes
   `use-device-position` (consent record, platform permission, foreground only — ADR-045) and reports
   that hook's `status` alongside the tracker's state, so a screen can say *why* nothing is tracked
   instead of drawing an empty list that claims the picker visited nothing.
4. **A fix is folded where it arrives, not in an effect.** `use-device-position` gained an optional
   `onFix` subscription for exactly this: the tracker's accumulator lives in a ref, each fix is folded
   in the event that delivered it, and only the parts a screen renders are pushed into React state —
   and only when the fold changed something, which is what makes a repeated fix produce no second
   visit and no second render. The subscriber is held in a ref, so a consumer passing a new callback
   every render cannot restart the watch (a repeated permission prompt the user never asked for).
5. **A visit's id is the app's own UUID** (`expo-crypto`'s `randomUUID`, ADR-005's idempotency key),
   injectable so tests are deterministic. It is installed with `npx expo install` and used nowhere
   else.
6. **The hook has no caller in a screen, and that is stated rather than hidden**: nothing draws a
   live visit, and drawing one is a design or an owner decision rather than something to invent. The
   chain is proven where proof costs nothing — in tests, without a device, a zone service or a clock.

## Alternatives considered

- **Ship a scripted zone list behind the development gate, with a prototype reading on frame 09's
  screen.** Rejected for now: there is no design question to answer (unlike the community-map
  readings, class E), and what it would show is invented geography dressed as a zone. When the owner
  wants to *see* the tracker work, the honest place is a fixture-driven test or the day the zone
  service answers — not a screen that looks live.
- **Write a zone-source port in `src/services/` now.** Rejected: it would fix an interface before the
  owner's answers to ADR-036 arrive, and nothing consumes it. The seam that exists is the *argument*
  the hook takes, which is the shape the service's payload already has to satisfy.
- **Hold the tracker's state in React state and fold each fix in an effect that watches the returned
  fix.** Rejected: it is a state write driven by a state change (the cascade the linter and React both
  warn about), and it would fold a fix after a render rather than when it arrived.
- **Mint the visit id by hand** (a timestamp and a counter). Rejected: ADR-005's key is what the server
  dedupes on, and a real UUID is what the SDK provides.
- **Finalise expired visits on a timer inside this hook.** Not built: a visit finalises on the next
  sample, and a consumer that wants time-driven finalisation (`finalizeExpired`) supplies its own
  tick — adding a ticker here would be a cadence decision nobody has made (ADR-045's class D4).

## Consequences

- **The chain is proven end to end** — arrive, stand, walk out, come back inside the grace window,
  walk into another zone, a repeated fix, a refusal, no consent — in nine tests that need no device:
  `features/visits/hooks/__tests__/use-visit-presence.test.tsx`.
- **The app still tracks nothing in the field**, for exactly two recorded reasons: no zone list (known
  issue 14) and no screen that asks (this record). What changed is that neither is a code problem any
  more: the service's payload and a screen's call are the two remaining steps.
- **`expo-crypto` is now a dependency**, used for visit ids only.
- **The events are kept for the life of the screen**, and a consumer that acts on them must consume
  them; nothing prunes them yet, which a screen's own design would decide.
