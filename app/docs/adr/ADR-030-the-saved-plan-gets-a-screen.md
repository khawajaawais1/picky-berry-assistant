# ADR-030 — The saved plan gets a screen the design never drew

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Project owner (asked to finish the frames' remaining parts; the shape below is this repository's)
- **Superseded in part by:** [ADR-060](ADR-060-the-saved-plan-reads-the-zone-source.md) (2026-10-24)
  — decisions 3 and 6 drew the plan from `DEMO_ZONES`, which the source replaced. The screen, its
  route, its order and its unknown-id rule stand.

## Context

Frame 14 (`5:23183`) puts a **“Saved spots”** row in the settings screen, with the feature's own
count (“12 saved locations”) and its own guarantee (“Only visible to you · private by default”,
node `5:23846`). It is the design's collection surface for the picker's plan, and ADR-024 recorded
that no frame was ever drawn behind it: the record could be written and un-written from a zone's
own screen, and a surface that lists the whole plan stayed “an open gap rather than something to
invent here”.

Two things made closing the gap the next honest step rather than a liberty.

- The row the design **does** draw is a promise with a number in it: a picker who reads “12 saved
  locations” and taps it has to reach those twelve. A count with no destination is a dead row, and
  ADR-022's rule — a row that cannot act claims no role — would have forced the row to be inert.
- AGENTS.md §11 asks that every stored field answer four questions. The plan's own documentation
  (ADR-024) answers three fully and the fourth — **how the user gets a copy** — only one zone at a
  time, on that zone's screen. The record's whole content was readable only by remembering it.

## Decision

**The plan gets the smallest honest screen: `/saved-spots`, under the Profile destination.**

1. **Frame 14's row is the only way in.** The route joins the app shell's stack and the profile
   destination exactly as every built screen does (ADR-022); nothing about it is reachable by a
   gesture the design never drew.
2. **The record is listed in the record's own order** — the order it was saved in, which is the
   only order the app has — with the count the frame's row also shows.
3. **A row is the same row frame 06's own list draws** (`ZoneRow`, extracted from `ZoneList`) and
   opens frame 07's screen for that zone. The plan is a way back to the screens, not a second
   vocabulary: the row's name and subtitle are the map's own labels.
4. **A saved identifier the current zone source cannot describe is named rather than dropped**,
   because it is on the user's device and pretending it is not is a lie about their own record.
5. **An empty plan says so and offers frame 06's map**; a failed read is stated rather than
   swallowed (AGENTS.md §2.3).
6. **The words are the app's, and it says so.** The design has no copy for a screen it never drew,
   so the copy lives in the catalogues with the screen's own keys, and the eyebrow carries the
   season-demo disclosure the frames' sample screens already carry (the zones are the design's
   demo ones until a zone source lands).
7. **Where a row cannot act it claims no role**: each row is a pressable named for the zone it
   opens, and the screen's controls are its heading's back action and the empty state's action.

## Alternatives considered

- **No screen.** The gap ADR-024 recorded, and the reason it existed — but the design's own row
  counts the plan, and the record's copy question stays weak.
- **A row with per-zone controls** (remove, reorder, share). Frame 07's own bookmark is the
  record's correction path; a second removal control is an interaction the design never drew, and
  reordering is a feature (and a stored field) nobody asked for.
- **Designing a new frame for the list first.** That is the owner's and the designer's work, not
  the app's. This screen is drawn entirely from the app's own vocabulary — the shell, the heading,
  `ZoneRow`, the empty state — and the design-source inventory records it as app-drawn.

## Consequences

- ADR-024's fourth answer — how a copy is obtained — is a surface now: the plan in one place, in
  the order it was made.
- The screen is measured like every built screen (ADR-018/019): it joins the layout harness with
  its own entry and the copy's own expectations, since there is no frame to take them from.
- The plan and the settings row count **the same record**; a change to one is a change to the
  other, and both are read through `useSavedZones`.
- The source landed on 2026-10-24: [ADR-060](ADR-060-the-saved-plan-reads-the-zone-source.md)
  moves the plan's rows onto it, so the screen no longer draws `DEMO_ZONES`, and the eyebrow's
  season-demo disclosure (decision 6) went with the rows.
