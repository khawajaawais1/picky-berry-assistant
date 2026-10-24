# ADR-058 — Screen 07 reads the zone source, and frame 06's card links again

- **Status:** Accepted (2026-10-24)
- **Date:** 2026-10-24
- **Deciders:** Project owner, instructing that screen 07 read the zone source so screen 06's
  card can open a zone's details again.
- **Extends:** [ADR-057](ADR-057-screen-06-reads-one-zone-source.md), whose decision 4 made the
  card a reading **until** zone details read the same source. That condition is now met. This
  ADR does not rewrite ADR-057: its decisions about screen 06 stand, and the frame's walk
  distance stays off the card.
- **Amended (2026-10-24):** decision 6's saved-plan half is superseded by
  [ADR-060](ADR-060-the-saved-plan-reads-the-zone-source.md). The plan now reads the source and
  opens screen 07 with a zone and berry, so the no-id demo path is a bare URL's alone.

## Context

ADR-057 moved screen 06's card, list and filters onto the `ZoneSource` port and deliberately
removed the card's chevron: screen 07 still drew the design's demo zone 14, so a press on a
source zone's card would have opened another zone's numbers. The ticket that closed that work
recorded the same sentence — the link waits until the screen it opens reads the source too.

Screen 07 already knows how to ask for the port indirectly: `useZones` caches one answer per
berry, and the persisted zone cache restores it across launches. The card knows the zone's id
and the berry whose score it printed; those two values are all the details screen needs to find
the same record in the same answer.

The frame's other figures do not exist in the payload. `Zone` carries a name, a score per
species, a confidence and a ripeness — no weather, no report stream, no walking route, no
picking state and no week of reports. Screen 08 and `/zone-reports` are still the design's
sample.

## Decision

1. **The card hands over its zone and its score layer.** `ZoneCard` gains an optional `onOpen`;
   with it the card is a button labelled “Open zone {name} details”, with the frame's chevron.
   Without it the card is the drawing it was, with no role and no chevron (AGENTS.md §11.2).
   `DiscoverScreen` passes `onOpenZone(zone, species)`, and the route pushes
   `/zone-details?zone=<id>&species=<berry>`.
2. **Screen 07 reads the zone it was told about.** With a `zoneId` it calls `useZones` for the
   handed-over species, finds the zone in that answer, and draws its own name, its scored
   species, its score, confidence and ripeness. The species row is the payload's `scores` in the
   app's order with the read berry first, so the accent chip and the score are about one berry
   (the frame's first-chip accent, over the source's own list).
3. **The design's week leaves the yield card.** “11 reports this week” is the demo week, not the
   source's count; printing it beside a source score would be one number from each dataset. The
   demo path keeps the line. The frame's picking-state chip is not drawn for a source zone either
   — the payload has ripeness, not `unpicked`/`recentlyPicked`/`ripening` — so the card shows the
   four ripeness words the map already uses.
4. **The blocks with no source stay the design's sample, and the screen says so.** The outlook,
   the freshest report, the walk behind “Navigate” and the report list behind “See all” remain
   the demo composition; on a source zone one sentence before them names that boundary
   (`discover.details.sample`), the rule frame 13's demo block follows (ADR-042). They are not
   removed: removing them would delete the frame's outlook and report, and the only route to
   `/zone-reports` and screen 08, for figures the design still supplies.
5. **An unknown zone is a sentence, never another zone's figures.** Loading, a failed read and an
   id the source does not answer to are three distinct states; none falls back to the demo.
6. **A screen with no zone id still draws the design's sample.** The saved plan's rows are the
   design's zones (`saved-spots.ts` reaches `DEMO_ZONES`), and its route opens `/zone-details`
   without params; a bare URL does too. That path keeps the frame's full demo composition and its
   `SEASON DEMO` eyebrow, and is the last demo on this screen. It goes when the plan reads the
   source. **Amended (2026-10-24):** the plan reads the source now
   ([ADR-060](ADR-060-the-saved-plan-reads-the-zone-source.md)); the bare URL is the only caller
   left on this path.
7. **The list rows on screen 06 stay readings.** The frame gives the card the chevron and the
   user asked for the card; a row's destination is the same treatment on another day.

## Alternatives considered

1. **Drop the outlook, freshest report and walk instead of disclosing them.** Rejected: it
   deletes half of frame 07 and the only built entry to `/zone-reports` and screen 08, and
   replaces the design's own sample with a screen that says less. A disclosed sample is the
   repo's established answer where no source exists.
2. **Fall back to the demo zone when an id is not found.** Rejected — the failure ADR-057's
   alternative 3 rejected: one zone's numbers under another zone's name. A saved plan row for
   the design's zone 14 therefore shows the demo only through the no-id path, not through a
   failed lookup.
3. **Remove the no-id demo path and show a “choose a zone” state.** Rejected: the saved plan's
   design-era rows would open a dead end, and the layout harness measures the frame on
   `/zone-details`. The path is disclosed and recorded rather than left dead.
4. **Pass the whole zone through route params.** Rejected: a serialized record in a URL is a
   second copy of the payload that can go stale, and the id-plus-berry pair already lands in the
   same cached answer.

## Consequences

- **The card links again**, and the figures on screen 07 are the ones the card was showing.
- **A saved source zone is a known-issue row in the plan**: the bookmark now writes a real zone
  id, while `saved-spots.ts` still maps only the design's ids. The plan names an id it cannot
  describe until it reads the source. Recorded in PROJECT.md. **Resolved 2026-10-24 by
  [ADR-060](ADR-060-the-saved-plan-reads-the-zone-source.md)**, which moves the plan's resolution
  onto the port and opens the details again.
- **Screen 08 and the report list are still the design's sample**, now reached from a screen that
  may be about a source zone; the sample sentence says so on screen 07, and each destination
  carries its own eyebrow.
- **The demo mode of screen 07 survives for one caller** (the plan's route) and for a bare URL,
  keeping every current test and the browser harness's frame measurement.
- **Two copy keys leave the catalogue** (`discover.details.ripeness.*`): the source's four
  season words and the details screen's two were the same distinction told twice.

## Related

- ADR-057 (screen 06's one source), ADR-053 (the map and the port), ADR-036 (the payload),
  ADR-042 (a demo block said on the screen), ADR-044 (the report list), ADR-030 (the saved plan)
- PROJECT.md known issues 14, 15 and 28
