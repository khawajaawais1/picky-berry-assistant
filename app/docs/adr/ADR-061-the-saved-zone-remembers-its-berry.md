# ADR-061 — The saved zone remembers its berry

- **Status:** Accepted (2026-10-24)
- **Date:** 2026-10-24
- **Deciders:** Project owner, asking that a zone saved on screen 07 keep the berry whose score
  layer was being read, so the saved plan shows and opens that same layer.
- **Extends:** [ADR-060](ADR-060-the-saved-plan-reads-the-zone-source.md) (decision 4 names this
  widening as the next honest step) and [ADR-024](ADR-024-saved-zones-on-the-device.md) (the
  record, its key and its rules).
- **Amends:** ADR-024 decision 1's per-zone shape — `{ zoneId, savedAt }` becomes
  `{ zoneId, speciesId, savedAt }`. The record, its key and its deletion path stand.

## Context

Screen 07 can be read under any berry its zone was scored for: frame 06's card hands over the
chip that was lit, and the screen prints that berry's score, confidence and ripeness (ADR-058).
Frame 07's own bookmark, however, wrote only `{ zoneId, savedAt }` (ADR-024), because the record
was built before a screen could open on more than the pilot berry. ADR-060 moved the plan onto
the zone source and recorded the consequence plainly: the plan had to choose a layer for every
row, and it chose `PILOT_ZONE_SPECIES` rather than inventing one the record never wrote.

That choice made the plan honest but forgetful. A picker who reads a zone on lingonberry, sees
`70` and “Ripe now”, presses the bookmark, then opens “Saved spots” finds the same zone under
bilberry with `53` and “Season over”. One zone, two readings, and the plan's row is the one the
picker did not choose. The zone source now answers per berry by contract
(`GET /zones?species=…`, docs/data-contract.md), so the plan can read the layer the record holds
instead of a default.

## Decision

1. **The bookmark stores the berry it was pressed on.** `SavedZone` gains `speciesId`;
   `saveZone(zoneId, speciesId, savedAt?)` refuses a blank one, and screen 07 passes the layer it
   is reading (`read.layer` — the route's species, or the pilot berry on the demo path). It is the
   same value the screen's accent chip and score are about, so the record cannot disagree with
   what the picker saw.
2. **The widening is additive under the same key.** `picky.saved-zones.v1` is kept. An entry
   written before this ADR parses with `speciesId: null`, and the plan shows it under
   `PILOT_ZONE_SPECIES` — the layer the plan always used for it. A new key would have deleted
   every existing plan to add a field, and the old entry still means exactly what it meant; the
   versioning rule is there for a shape whose old value would be *misread*, not for an optional
   field.
3. **Each saved zone is read from its own berry's answer.** The plan collects the distinct
   berries its record holds (`savedPlanSpecies`) and asks the `ZoneSource` once per berry
   (`useZoneAnswers`), under the same query keys and persisted cache the map uses. `savedSpots`
   resolves a record against **that berry's** list. It cannot be resolved from the map's last
   answer: the port's answer is for the species it was asked about, and a service may score only
   that one (the stub ships all four, but the port does not promise it).
4. **A berry still on the way is not an unknown zone.** The plan hides its rows until every berry
   it needs has answered. A berry that failed is stated (`discover.map.unavailable`) while the
   layers that did answer are listed, and the record's ids stay visible — the picker's own plan
   must not disappear because a service did.
5. **The row and the route use the saved layer together.** The row prints the saved berry's label,
   score band and season; pressing it opens
   `/zone-details?zone=<id>&species=<saved berry>`, the same destination frame 06's card uses, so
   the score read and the score opened are one reading.
6. **The vocabulary is checked where it belongs.** The storage service can only require a
   non-empty string: `Species` is the discover feature's vocabulary and a shared service may not
   import a feature's internals (AGENTS.md §3). The plan's domain validates the stored value with
   `isSpecies` and falls back to the pilot berry for a value the app cannot name, exactly as the
   route does with a query string the app did not build.

## Alternatives considered

1. **Bump the key to `v2` and drop the old plan.** The module's own comment asks a changed shape
   for a new key, and it is the safest reflex. Rejected because the change adds a fact rather
   than changing one: an old entry still describes its zone and its moment, and the app can say
   “no layer was stored” honestly. Deleting a picker's plan to add a field would be the worse
   trade, and the parser is explicit about the missing value.
2. **Keep one pilot query and read `zone.scores[savedSpecies]`.** Less code and no extra request
   against the stub, which carries every species' score. Rejected: the port promises only the
   answer for the requested species, so a real `GET /zones?species=bilberry` may not carry the
   lingonberry score, and the plan would silently fall back to the wrong layer — the defect this
   ADR removes.
3. **Update the saved berry when the bookmark is pressed twice.** The second press removes the
   zone (ADR-024's toggle); making it re-save instead would change a control the picker already
   knows. To change a saved zone's layer, remove it and save it again on the new layer — a
   correction the same control already supports.
4. **Store the berry's label rather than its code.** No: the label is the catalogue's word, and a
   record written in English would be unreadable in Finnish under the app's language rule
   (ADR-017). The stored value is the vocabulary's identifier, as a queued report's is.

## Consequences

- **A saved zone now shows and opens the layer it was saved under.** The plan can mix berries;
  each row is read from its own answer and opens its own layer.
- **A pre-widening plan keeps working, under the pilot layer.** It does not gain a berry it never
  stored; the plan says nothing about a layer it cannot know, and the row is what it always was.
- **The plan may issue up to one request per distinct berry** (four at most), all cached and
  persisted under the keys the map already uses. Opening the plan after the map has read those
  berries costs nothing.
- **The stored record keeps its four answers.** Who may read it, how a copy is taken (the export
  document now carries the berry with the zone), how it is corrected (the bookmark's second
  press), and how it is deleted (`removeSavedZone`/`clearSavedZones`) are unchanged.
- **No new personal data is collected.** The berry is the picker's own reading choice, not a fact
  about a person; the lawful basis owed for the plan remains open question 15.
- **The layout harness seeds source ids with a berry**, and the accessibility journey signs up,
  saves a lingonberry plan and opens `/zone-details?…&species=lingonberry`.

## Related

- ADR-024 (the record), ADR-030 (its screen), ADR-057/058 (the single source and screen 07),
  ADR-060 (the plan reads the source; decision 4 anticipated this widening)
- `docs/data-contract.md` (the per-species answer), PROJECT.md known issue 28
