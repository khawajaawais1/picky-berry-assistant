# ADR-042 — Frame 13's downloaded region is drawn as the design's own sample, labelled on the screen

- **Status:** Accepted (2026-10-11)
- **Deciders:** the project owner asked for the remaining screens (2026-10-11); this repository drew
  the block, wrote the disclosure that goes with it and keeps the figures in one place.
- **Related:** [ADR-025](ADR-025-observe-the-devices-connection.md) (the status message the device's
  own report makes sayable), [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) (the
  basemap whose tile cache this block would need), [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md)
  (the drawn map that is still the app's), [ADR-005](ADR-005-offline-first-sync.md) (the queue, and
  the absent transport), and the disclosure vocabulary of the other demo screens
  (`docs/demo-and-stand-ins.md`).

## Context

Frame 13 (`5:23530`) draws a sync centre for a phone that already has an offline region: “Laajavuori
region · 12 km² · 86 MB · Downloaded”, the map tiles and the 24 zones they cover, the forecast saved
with them, a storage meter (86 of 500 MB), two actions (“Retry sync”, “Manage downloaded regions”) and
a last-sync line. The app has none of it — no tile cache, no forecast download, no storage
measurement — and cannot: the basemap is deliberately not built (ADR-031), and known issue 30 records
what has to be true first (zone geometry, a tile host, and a spiked answer for offline regions).

The screen was therefore built without that half: the queue, the frame's own status message (which the
device's network report makes sayable, ADR-025) and nothing else. The reasoning was the one this
repository uses everywhere — **a figure nothing measures must not be printed, and a control that
cannot act must not claim a role** — and it left the frame's own download story undrawn, recorded as
such in known issue 21 and in `docs/design-source.md`'s status table.

Two things then met. First, the same tension had already been resolved the other way five times:
frames 07, 08, 09, 10 and 12 draw the design's own composition, and the answer there was not to omit
it but to **draw it with the screen saying so** — which is what the demo-disclosure guard now enforces
for every screen. Second, omission had a cost of its own: a picker on a screen titled “Ready beyond
the signal” met a page with one card on it and no account of where the rest of the frame went, while
the frame's own rows are exactly what tells them this product intends offline downloads at all.

What is at stake is a claim, not decoration. A phone that has downloaded nothing must not read as a
phone holding 86 MB of maps, and the frame's own “Downloaded”, “Cached” and “Last successful sync ·
28 Aug at 08:12” are all statements about a device.

## Decision

**The frame's downloaded region, its tiles and forecast, its storage meter, its two actions and its
last-sync line are drawn as the design's own sample, and the screen says so on itself.**

1. **The figures live in one named place**: `features/offline/domain/downloads.ts`
   (`DEMO_DOWNLOADS`, `DEMO_REGION_SIZE_MB`, `demoStorageShare()`), with the frame's own numbers and
   their node ids. The `DEMO_` name is what makes the classification below automatic, and keeping
   them in the domain rather than in the component is what lets one test assert that two figures
   describing one region agree: the region's weight *is* the storage it occupies (86 MB of 500), and
   the meter's fill is computed from those two figures, so the bar cannot disagree with the line above
   it (86/500 of the frame's 342 px is the frame's own 59 px).
2. **The screen discloses it in two places, both of them the app's words rather than the design's**:
   the header's eyebrow carries the same `· SEASON DEMO` (“· KAUSIDEMO”) the map and the season screen
   carry, and a sentence printed **above** the block says the region, the storage figures and the two
   actions below it are the design's own sample and that this phone has downloaded nothing and nothing
   syncs yet. The sentence comes first so the figures cannot be read before the qualifier.
3. **The two actions are drawings, not controls.** They are views with the frame's own words and no
   press handler, no `button` role and no accessible name: there is no transport to retry over and no
   region store to manage, so a role here would promise both. The same rule drops the chevron the
   frame draws on the two rows inside the card — a row that will never open anything may not draw the
   sign that says it will (AGENTS.md §11.2).
4. **The queue stays the picker's own.** Everything the screen states about this device — what is
   waiting to sync, each report's own visit, its rating and its harvest — is unchanged and remains the
   reason the screen exists; it is drawn above the sample and is not part of it.
5. **The classification is enforced, not remembered.** Frame 13's screen moves from the
   sample-free list to the demo list in the guard test
   (`src/features/discover/components/__tests__/demo-disclosure.test.tsx`), which reads every screen on
   disk and renders each demo one in both languages: dropping the disclosure fails the suite, in
   Finnish as well as in English.
6. **It changes nothing about what exists.** No tile cache, no forecast download, no storage
   measurement and no transport are added by this; the block is a drawing of the design's story, and
   ADR-031 plus known issue 30 still hold what has to be true before any of it is real. When it
   becomes real, the `DEMO_` module is deleted and the screen reads the region it actually holds.

## Alternatives considered

- **Leave the block out** (the status quo). The safest of the three, and the one that leaves the frame
  permanently half-drawn: the design names the capability the product is aiming at, and omission was
  never the app's answer for the other five frames that draw the design's own composition. What the
  absolute rule protected against — a sample read as a measurement — is what the disclosure now
  prevents.
- **Draw the figures with no disclosure.** Rejected outright: it is the defect the guard exists for
  (finding F2 in `docs/demo-and-stand-ins.md`), and here it would be worse than a stale season — the
  screen would claim the phone holds maps and forecasts it has never downloaded.
- **Draw the two actions as real, disabled buttons.** A disabled control promises that it will become
  enabled; these never will until a service exists, and a screen reader would offer them as actions.
- **Make the block real now** (host the tiles, measure storage, download a forecast). Not this
  decision's to make: it needs ADR-031's tile host, zone geometry (known issue 14) and a spike on
  MapLibre's offline behaviour, and it would put the first network dependency in a screen whose whole
  point today is that nothing is sent.
- **Keep the figures in the component.** It would work and it would make the guard's automatic
  classification impossible, and two figures describing one region would live in two places.

## Consequences

- Frame 13 is complete as a drawing: every part of the frame is on the screen, and the parts the app
  cannot be true about are named as the design's sample on the screen itself, in both languages.
- Known issue 21's list of unbuilt parts becomes a list of *sample* parts, and known issue 30 stays the
  record of what makes them real. No honesty was traded away for completeness: the disclosure is
  asserted by the guard and by the screen's own tests.
- The demo vocabulary is unchanged — two phrases, checked in both languages — so a reader who has
  learnt what “SEASON DEMO” means on the map meets the same word here.
- A test asserts the sample's internal consistency (the region's size against the storage line, the
  meter's share, the moments being instants the language can format), so a later edit cannot leave the
  frame's own story disagreeing with itself.
- Costs: one domain module with the design's figures, one disclosure sentence and an eyebrow change in
  both catalogues, and the block's height in the layout harness in both languages at both text sizes.

## References

- `src/features/offline/components/offline-sync-screen.tsx`,
  `src/features/offline/domain/downloads.ts` and their tests; the frame's nodes `5:23544` (status
  message), `5:23549`–`5:23562` (the region card), `5:23572` (storage), `5:23587`/`5:23590` (actions).
- `src/features/discover/components/__tests__/demo-disclosure.test.tsx` (the classification and the
  per-language disclosure assertions); `docs/demo-and-stand-ins.md` (finding F2).
- PROJECT.md known issues 21 and 30, requirement 12; ADR-031.
