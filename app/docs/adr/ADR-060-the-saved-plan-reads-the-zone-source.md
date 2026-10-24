# ADR-060 — The saved plan reads the zone source

- **Status:** Accepted (2026-10-24)
- **Date:** 2026-10-24
- **Deciders:** Project owner, instructing that the saved plan read the zone source so saved zones
  show their names and open their details again.
- **Extends:** [ADR-030](ADR-030-the-saved-plan-gets-a-screen.md) (the screen) and
  [ADR-057](ADR-057-screen-06-reads-one-zone-source.md) (the port).
- **Supersedes in part:** ADR-030 decisions 3 and 6 — its row drew `ZoneRow` over `DEMO_ZONES`,
  and its eyebrow said the listed zones were the design's demo ones until a source landed — and
  the saved-plan half of [ADR-058](ADR-058-screen-07-reads-the-zone-source.md) decision 6, which
  kept the plan on the demo path “until it reads the source”. ADR-058's bare-URL path stands.
- **Amended (2026-10-24):** decision 4's future widening was built the same day —
  [ADR-061](ADR-061-the-saved-zone-remembers-its-berry.md) stores the berry a zone was saved
  under, so the plan reads each row from its own layer instead of `PILOT_ZONE_SPECIES`.

## Context

The saved plan is a record of zone identifiers (`services/saved-zones.ts`, ADR-024). Its screen
was built before a zone source existed, so it resolved those identifiers against `DEMO_ZONES`: a
plan holding `Z14` drew the design's zone 14, and a plan holding anything else drew the identifier
alone. ADR-030 recorded that as deliberate — the design's demo composition was the only data the
app had.

Since 2026-10-24 the bookmark on screen 07 writes **source** identities: the screen reads the
`ZoneSource` port, and its zone has a UUID rather than `Z14`. The plan therefore lost both halves
of its promise at once. A zone saved today appeared as a bare UUID with no name, and its row could
not open anything, because the old resolver only found demo ids and the only route it knew was
`/zone-details` with no params. ADR-058's consequences recorded that as known issue 28; ADR-030's
sentence “when a zone source lands, this screen does not change” was written before the source
changed what an identifier means.

## Decision

1. **The plan resolves against the zone source.** `savedSpots(zoneIds, zones)` takes the source's
   current answer and maps each saved identifier to its `Zone`. `SavedSpotsScreen` asks the same
   `useZones` port frame 06 and screen 07 read, for `PILOT_ZONE_SPECIES`, so the plan shares their
   query cache and their persisted answer. A row is `ZoneSourceRow` — the map's own list row —
   not the design's `ZoneRow`.
2. **The record's order and its unknowns survive.** The list stays in the order the record holds
   it, including a repeated identifier written from outside the app. An identifier the source
   does not answer to is named, not dropped, and has no role. There is **no fallback to
   `DEMO_ZONES`**: after a source identity has been saved, silently mapping an old `Z14` to the
   design's zone would put a demo zone's figures under a real record's name.
3. **A resolved row opens that zone's details.** `onOpenZone(zoneId)` is called with the source's
   id, and the route pushes `/zone-details?zone=<id>&species=<berry>` — the same destination
   frame 06's card uses. The row prints `PILOT_ZONE_SPECIES` and the route hands over the same
   berry, so the score the row showed and the score the details screen opens are one layer.
4. **The record still stores a place, not a score layer.** `SavedZone` keeps `{ zoneId, savedAt }`.
   A later record that also keeps the berry a zone was saved under can widen the row and the route
   together; until then both use the map's default berry rather than inventing a layer the record
   never wrote.
5. **The screen waits for both reads and states either failure.** While the record or the source
   is still being read it lists nothing, rather than calling a saved identifier unknown before the
   source has answered. A failed record read is the existing sentence. A failed zone read is said
   in words while the record's identifiers stay listed — the picker's own plan must not disappear
   because a service did.
6. **The demo path on screen 07 is now the bare URL's alone.** `/zone-details` with no params still
   draws the design's sample for a deep link, but the plan no longer reaches it. This is the
   “goes when the plan reads the source” that ADR-058 decision 6 recorded.

## Alternatives considered

1. **Keep the `DEMO_ZONES` fallback beside the source.** It would preserve the appearance of a
   pre-source plan, at the cost of two datasets answering the same record and a saved id opening
   figures from neither. Rejected; an unknown id is the honest row.
2. **Store the species on the saved record.** It would let a plan remember the chip that was lit
   when a zone was saved, which is better fidelity. But it changes the stored personal record for
   a distinction v1 does not collect, and every existing record would carry no species anyway.
   Rejected for now; recorded in decision 4 as the future widening.
3. **Give the saved rows their own component with no score.** It would avoid printing a layer the
   record never stored. Rejected: the row would then differ from the map's row for the same zone,
   and the screen would still have to choose a layer for the details it opens.
4. **Open details without a `species` param.** The route would default to the same pilot berry, so
   the URL would be shorter but the behaviour identical, and the row's printed layer would be
   implicit. Rejected as less explicit for no gain.

## Consequences

- **A zone saved from screen 07 now shows its name and opens its details again**, with the same
  default berry its row prints. Known issue 28's missing-name and dead-row halves are closed; its
  export-path half and the lawful-basis question remain.
- **A pre-source saved identifier now draws as its identifier.** The record still holds it; the
  app no longer stands the design's demo zone in for it. That is a visible change to an old
  development plan, and the row is deliberately still present.
- **The eyebrow loses its disclosure.** `privacy.savedSpots.eyebrow` reads “ACCOUNT / OFFLINE ·
  SAVED SPOTS” in English and “TILI / OFFLINE · TALLENNETUT PAIKAT” in Finnish, because the screen
  no longer draws the design's composition; the demo-disclosure guard now lists the file among the
  sample-free screens.
- **The plan shares the map's cache**, so a pinned zone opens with the map's last answer offline,
  and a failed revalidation keeps the rows rather than blanking them.
- **The layout harness seeds source ids** and measures the source row's title, ripeness and yield
  in both languages; the accessibility journey opens the row and lands on
  `/zone-details?zone=…&species=bilberry`.
- **No stored shape changed at the time**, so `picky.saved-zones.v1` kept its key and every
  existing record was read as before. ADR-061 later added the berry as an optional field under
  the same key; a record without one is still read, under the pilot layer.

## Related

- ADR-024 (the record), ADR-030 (the screen), ADR-053 (the map's source), ADR-057 (one source for
  screen 06), ADR-058 (screen 07 reads it), ADR-036 (the payload)
- PROJECT.md known issue 28, known issue 14; `docs/design-source.md` (screen 14b)
