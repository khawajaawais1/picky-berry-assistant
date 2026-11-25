# ADR-072 — The berry chips are one multi-select score layer

- **Status:** Accepted (2026-11-25)
- **Deciders:** Project owner, asking for the berry chips to follow multi-select best practice.
- **Supersedes:** ADR-057's single-select clause ("the single-select species chips choose the score
  layer"). ADR-057's one-source rule, the name filter and the card/list reading remain.
- **Extends:** ADR-036 (a zone carries a score per berry), ADR-053/070 (the map's score bands),
  ADR-061 (a saved zone remembers its berry).

## Context

ADR-057 made the species chips a **single-select** layer: one berry at a time, because a zone's
score belongs to one species. The screen opened with no chip pressed and pressing a chip replaced
the layer. That reading is correct about the data and awkward as a filter: a picker interested in
both lingonberry and bilberry had to look at one map, then the other, and compare rings from
memory. The chips are a filter, and the design's own chip rows (frame 11's periods, frame 12's
species) are multi-select in intent.

The zone source answers one berry at a time (`GET /zones?species=…`), so a multi-select needs a
rule for what one ring means when several answers scored it. The stub scores every zone for every
berry; a live service may score only the species it was asked about (ADR-061's note), so the merge
must not assume a complete score map.

## Decision

1. **Every berry is selected when the screen opens.** All four chips are lit, which is the
   unfiltered answer and the widest map. The chips narrow it; they do not choose a single layer.
2. **One ring per zone, at its best selected score.** The screen reads every selected berry
   through `useZoneAnswers`, then `mergeZoneAnswers` keeps one copy of each zone, carrying the
   highest score among the selected berries with that score's confidence and ripeness. A zone two
   berries score is drawn once, not twice.
3. **The berry that produced the score is kept per zone.** The card, the list and the zone details
   the card opens name the berry whose figures they print, so a merged answer cannot relabel a
   score with the wrong berry.
4. **The freshness claim is the oldest copy's.** Merging two answers keeps the older `updatedAt`,
   and a copy with no timestamp makes the claim unsupportable rather than invisible — the same
   all-or-nothing rule `oldestUpdatedAt` applies to one answer.
5. **The last lit chip cannot be turned off.** An empty selection has no score layer to draw, and
   the screen would have to invent one. The rule lives in the screen's toggle, not in the shared
   chips: frame 12's alert preferences may legitimately hold no species.
6. **The chips are a checkbox group.** Each chip exposes `role="checkbox"`, `aria-checked` and
   `accessibilityState.checked`; the row is a named group. The previous pressed-button state is
   retired.

## Alternatives considered

- **Keep single-select and add a "all berries" chip.** It makes the common case one press away but
  adds a fifth control the frame does not draw, and still cannot answer "lingonberry *or*
  bilberry" without a combined score.
- **Union without scoring (draw a zone if any selected berry scored it).** The ring would have no
  score to colour, so the map would either invent one or lose its bands.
- **Average the selected scores.** A zone ripe for one berry and poor for another is not "average";
  the picker's question is where either chosen berry is worth visiting.
- **Compute the merge in the query layer.** It would cache a derived answer per selection
  combination; the merge is pure and cheap, and keeping it out of the cache keeps each berry's
  answer reusable by the saved plan (ADR-061).

## Consequences

- The map, card and list show the widest useful answer first and narrow on each press.
- Turning a chip off or on re-uses the cached answer for that berry; it is not a new network read.
- The merged zone's `scores` map is the copy that produced its top score. Consumers that need
  another berry's figures read that berry's own answer (zone details does), not the merged zone.
- A zone scored only by the berries the service answered still appears; a berry the source has no
  answer for contributes nothing rather than a zero.
