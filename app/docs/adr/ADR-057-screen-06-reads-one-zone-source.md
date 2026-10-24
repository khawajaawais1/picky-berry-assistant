# ADR-057 — Screen 06's card and list read the zone source, and the sample leaves the screen

- **Status:** Accepted (2026-10-23)
- **Date:** 2026-10-23
- **Deciders:** Project owner, instructing that the Discover card, list and filters move onto
  the same `ZoneSource` so the screen shows one dataset.
- **Amends:** [ADR-053](ADR-053-the-discover-map-is-real-geography.md) — its note that the card
  and list still read `DEMO_ZONES` is superseded; the map, its bands and its port are unchanged.
  [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) is already superseded for screen 06.

## Context

ADR-053 put the pilot's 50 zones behind a `ZoneSource` for the map only. The card, the list and
the two controls still read `DEMO_ZONES` — three invented zones from the design's sample — which
left screen 06 showing two datasets at once: a search that narrowed three rows while the map drew
50 rings, and a card about zone 14 beside a map that had no zone 14. PROJECT.md known issue 14
recorded it rather than hiding it.

The data the screen now receives is per-species: every stub zone carries a score, confidence and
ripeness for all four berries, and `ZoneSource.list({ species })` answers for one of them. The
design's sample zones carry instead a picking *state* (`unpicked`, `recentlyPicked`, `ripening`)
and a walking distance — neither of which the payload has.

## Decision

1. **One answer, three views.** `DiscoverScreen` calls `useZones` **once** and passes that answer
   to the map, the card and the list. The map is presentational now; it asks nothing of its own.
2. **The field filters by name; the chips choose the score layer.** `filterZones` matches a
   zone's own `name` (case-insensitive substring), which is what the map paints. The species
   chips are **single-select** on this screen: pressing one asks the source for that berry's
   score, pressing it again returns to the pilot berry. A zone has one score per species, so
   “lingonberry and bilberry at once” has no number the card could honestly print.
3. **The card reads the first zone the search left.** It shows the zone's name and the chosen
   berry, its score, its confidence and its ripeness, under the caption “Pilot area · test
   data”. The frame's walking distance and report age are **dropped**, because nothing supplies
   them, and a distance invented here would claim a route the app cannot draw.
4. **The card and the rows are readings, not controls.** Screen 07 still describes the design's
   demo zone, so opening it from a source zone would show another zone's numbers. The design's
   chevron and the “Open zone … details” label are therefore gone from screen 06 until zone
   details read the same source; the plan remains reachable from the settings row, and the zone
   screen by its URL.
5. **The list rows are a source-specific component** (`ZoneSourceRow`), not `ZoneRow`: the saved
   plan's rows still draw the design's sample zones and their picking state (ADR-030), which the
   source does not return.
6. **The demo card survives only in the prototype.** `DesignZoneCard` keeps the frame's demo
   composition for the community-map prototype; no built screen draws it.
7. **Four ripeness words are new copy** (`discover.ripeness.*`) because the payload has four
   states and the details screen only ever named two.

## Alternatives considered

1. **Keep the card as the demo composition beside a live map.** The screen would keep its
   distance and report age, and keep showing a zone the map does not draw. Rejected: that is the
   two-dataset defect this change exists to remove.
2. **Multi-select species chips over per-species scores.** Rejected: two lit chips with one
   printed score is a card that cannot say which berry it is reading, and the frame itself lights
   one chip.
3. **Map a source zone onto `DEMO_ZONE_DETAILS` when the names look alike.** Rejected: “Laajavuori
   1” and the demo's zone 14 are not the same record, and showing one zone's numbers under
   another's name is the failure the details screen already guards against.
4. **Keep the card pressable, opening the details screen with the source zone's id.** Rejected for
   now: screen 07 would render its demo figures for an id it does not know. It becomes right when
   that screen reads the source too.

## Consequences

- **Known issue 14 closes**: screen 06 shows one dataset from one answer, and the map's count line
  counts exactly what the list would show.
- **Screen 06 loses two things the design drew** — the walk distance and the card's link to screen
  07 — both recorded in `docs/design-source.md` and PROJECT.md. The rest of the frame's structure
  is intact.
- **The map's zoom follows the search**: a query that leaves one zone fits that ring. That is the
  intended reading of “the map draws what the list shows”.
- **The saved plan and screen 07 still read `DEMO_ZONES`**; they are the only surfaces left with
  the design's sample, and that is now a single remaining step rather than half this screen.
- **The species chip row is single-select here while the component still supports several**, so
  the report screen's use, if it returns, is unaffected.

## Related

- ADR-053 (the map and the port), ADR-036 (the zone service's payload), ADR-030 (the saved plan),
  ADR-021 (the drawing, now only frames 08–09), ADR-002 (the feature's public API)
- PROJECT.md known issue 14 (closed by this), `docs/design-source.md` screen 06
