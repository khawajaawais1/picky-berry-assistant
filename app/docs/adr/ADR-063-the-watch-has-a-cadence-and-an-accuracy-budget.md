# ADR-063 — The foreground watch has a cadence and an accuracy budget

- **Status:** Accepted (2026-10-24)
- **Deciders:** The project owner, on 2026-10-24, asking for the watch's cadence and accuracy
  budget to be decided and implemented, with the trade-off documented. ADR-045 decision 8 left
  this half of the question open; ADR-056 closed the background half “no”.
- **Answers:** The cadence half of [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md)
  decision 8 and its consequence that `Accuracy.High` was “awaiting confirmation with the cadence
  question”; §2.3 of [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) (the foreground
  budget, now that §2 is answered “no” by ADR-056); and PROJECT.md open question 21's cadence
  slot.
- **Extends:** [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) (the port and the
  foreground-only watch), [ADR-046](ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)
  (a fix is folded where it arrives; no ticker in the tracker) and
  [ADR-056](ADR-056-background-capture-is-out-of-scope.md) (no background capture in v1).
- **Related:** [ADR-010](ADR-010-position-retention.md) (no raw sample kept), ADR-055 (retention),
  `src/services/location/expo-source.ts` (the budget), and `docs/demo-and-stand-ins.md` (class D).

## Context

The position seam exists, but nothing decided how often it should read. ADR-045 chose
`Accuracy.High` because `Balanced` (roughly 100 m) can place a picker in the wrong patch of forest,
and recorded the cadence as an owner decision rather than burying a number in the adapter. The
adapter therefore asked for `{ accuracy: Location.Accuracy.High }` and let each platform apply its
own default interval — on Android, `High` means a 2-second interval and a 50 m distance filter;
iOS applies its own distance filter. No screen calls the watch yet, so no battery has been spent
in the field: the choice is a budget to implement before a caller arrives, not a measurement.

The tracker's shape constrains the answer. A visit opens on a fix inside a zone, stays open while
the picker remains there, and closes when a later fix places them outside
([ADR-046](ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)). It does not need a
fix every second: it needs enough fixes to notice a boundary crossing, and the visits policy's
5-minute dwell sets the scale. The zones the pilot uses are kilometre-scale, and the app is
foreground-only, so the question is how to bound a walk without either missing a zone or turning
a berry-picking walk into a radio drain.

## Decision

**The foreground watch asks for high accuracy, a 50 m distance filter, and a 60 s time ceiling on
Android — foreground only.**

1. **`Accuracy.High`, not `Balanced` or `Highest`.** `Balanced`'s ~100 m uncertainty is a tenth of
   a kilometre-scale zone's width and is widest exactly at the edge, where the containment answer
   matters most. `Highest` costs more battery for an accuracy the visit does not use: a visit is
   “inside this patch”, not “this row”. The existing choice is confirmed rather than reopened.
2. **`distanceInterval` = 50 m.** This is the resolution at which a moved position is worth
   re-answering containment. It is also the platform's own `High` distance filter, so it does not
   increase the number of fixes over the current default; the change is the ceiling below.
3. **`timeInterval` = 60 000 ms on Android.** This caps a moving walk at one fix a minute, where
   `High`'s default interval is two seconds. Both values are **limits**: a picker who stands still
   gets no new fix, because the 50 m filter still applies, and that is acceptable — the tracker
   holds the open visit until evidence of an exit arrives, and no ticker closes it.
4. **The budget is platform-asymmetric, deliberately.** Expo's `timeInterval` is Android-only;
   iOS applies `distanceInterval` alone. A walking iPhone therefore reports roughly every 50 m
   (about every 36 s at walking pace) while a walking Android phone is additionally capped at one
   report a minute. The app does not add a timer to equalise them: that would be the ticker
   ADR-046 kept out of the tracker, and would spend battery to make a stationary phone noisier.
5. **Foreground only, and no new permission.** The budget changes the options passed to the
   foreground watch. It does not add a background task, an “Always” permission, a foreground
   service or a store declaration; ADR-056's guard stays the enforcement. The app still reads
   nothing until a screen mounts the hook and the picker's consent record says yes.
6. **The budget is one named constant, asserted by a test.** `POSITION_WATCH_BUDGET` in
   `src/services/location/expo-source.ts` holds the three values, and
   `src/services/location/__tests__/expo-source.test.ts` asserts the options the adapter hands the
   platform. A later field measurement can change one file and its test; it cannot be a quiet
   tweak.
7. **Nothing about storage changes.** No raw fix is kept, sent or logged (ADR-010, ADR-045,
   SECURITY.md §11). The budget does not make a fix into a record, and it does not change what the
   visit tracker may persist.

## Alternatives considered

- **`Accuracy.Balanced` with a tighter distance interval.** Rejected: precision, not frequency, is
  the constraint at a zone boundary; 100 m of uncertainty cannot be fixed by asking more often.
- **`Accuracy.Highest`.** Rejected: the extra battery buys metres the visit model does not read,
  and would make the foreground watch cost more than the feature is worth.
- **25 m distance with no time ceiling.** Rejected: roughly twice the fixes for marginal boundary
  gain, and a cyclist or a fast walker would wake the radio more often than the visit needs.
- **100–200 m distance with a 2–5 minute interval.** Rejected: fewer wakeups, but a picker can
  cross a small zone or a boundary and be sampled on the far side, and a five-minute dwell leaves
  too few samples to tell arrival from transit.
- **A timer or poller to guarantee periodic fixes.** Rejected: it would keep the GPS warm while
  the picker stands still, and it duplicates evidence the tracker does not need. It is also the
  cadence decision ADR-046 refused to smuggle into the hook.
- **Background capture with a lower duty cycle.** Rejected by ADR-056: it is a different
  permission and a different product promise, not a battery setting.

## Consequences

- **The trade-off is explicit.** The app spends more battery than `Balanced` and less than the
  platform's `High` default while moving; in exchange it can tell which kilometre-scale zone a
  picker is in, within roughly a minute of movement on Android and roughly 50 m on iOS. The budget
  is a ceiling, not a measurement: no field battery figure exists yet, and one should be taken
  before beta. The instrument for taking it is `src/features/field-test/` (route `/field-test`,
  development builds only — a production build redirects away), and the protocol, the values under
  test and the empty result sheet are [the field test's own page](field-test.md).
- **Entry and exit near a boundary can be delayed.** A picker who crosses into a zone and then
  moves less than 50 m may not be seen inside it until their next movement; one who leaves and
  stops just outside may keep the visit open until then. A picker who simply stands still gets no
  further fixes. The tracker keeps the last known zone rather than inventing one, and the next
  movement supplies the evidence. This is the cost of not polling, and it is accepted for a visit
  feature whose smallest unit is a 5-minute stay.
- **Android and iOS will not report at the same rate.** The asymmetry is recorded rather than
  hidden; a field test that needs equal cadence must first decide whether to add a timer, which
  would be a new ADR.
- **The first caller inherits a tested budget.** `useVisitPresence` already folds a fix where it
  arrives and requires no change; when a screen mounts it, the watch is already bounded. The
  budget remains dormant until then, so this record does not claim field tracking.
- **The open question narrows.** PROJECT.md question 21's cadence item is answered. Its other
  items are not this record's: the lawful basis and what may be kept were answered by
  [ADR-055](ADR-055-retention-and-processors.md). What remains is the notice before any release
  that reads a position (question 15) and the design's ticked consent row.

## Related

- [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) — the port, the foreground
  permission, the consent gate and “nothing kept”.
- [ADR-046](ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md) — the tracker and
  its deliberate lack of a ticker.
- [ADR-047](ADR-047-the-consent-says-what-the-app-does.md) §2.3 — the slot this answers.
- [ADR-056](ADR-056-background-capture-is-out-of-scope.md) — why the budget is foreground-only.
- [ADR-055](ADR-055-retention-and-processors.md) — what may be kept once a fix becomes a visit.
