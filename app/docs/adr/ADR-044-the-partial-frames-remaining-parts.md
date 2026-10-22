# ADR-044 — The partial frames' remaining parts: frame 07's report list gets a screen, and five parts stay recorded with what they need first

- **Status:** Accepted (2026-10-12)
- **Deciders:** the project owner asked for the partial frames to be finished (2026-10-12, “do the
  other screens”), and chose “finish the partial frames — real where the phone already holds the
  data, and recorded where a service or your decision is still missing”; this repository decided,
  part by part, which of the six is which, built the one the phone's own record can answer, and
  recorded the rest with what has to exist first.
- **Related:** [ADR-043](ADR-043-three-waiting-frame-parts-get-their-answers.md) (the three parts
  answered the day before, and the rule that a link lands somewhere real when somewhere exists),
  [ADR-030](ADR-030-the-saved-plan-gets-a-screen.md), [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md)
  and [ADR-040](ADR-040-the-copy-the-app-owes-is-a-document.md) (the app-drawn screens the design
  never drew), [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) (the map is a drawing,
  not a map view), [ADR-005](ADR-005-offline-first.md) (there is no transport), and
  `docs/demo-and-stand-ins.md` (which classifies every one of these).

## Context

Six frames still draw a part the app does not: **06** and **09**'s recentre control
(`5:22983`, `5:23221`), **07**'s “See all 11” (`5:23076`), **12**'s “View Zone 18”, **15**'s sliders
glyph and its three filter chips, and **18**'s “Confirm berries received” and “Open dispute”. Each
was left out for a reason that is already recorded, and the owner has now asked for the frames to
be finished.

They are not one kind of gap, which is what decides them:

1. **Frame 07's link names a list.** “See all 11” is the zone's reports for the week, and the
   design's eleven are its own sample week (`DEMO_ZONE_DETAILS.reportsThisWeek`, the same number
   the yield card prints). There is no report stream — nothing returns another picker's report, and
   a score is derived server-side from evidence this app never sees. **But the phone holds
   reports**: the ones the picker saved themselves, in the device's queue
   (`src/services/report-queue.ts`). This is the one part of the six the phone's own record can
   answer.
2. **Frames 06 and 09's recentre control needs a position.** The control's whole meaning is
   “centre the map on my position”. The app reads no position (`expo-location` is not installed and
   no permission is asked for, ADR-025's rule for the connection holds here too), and its map is
   the design's fixed drawing (ADR-021) that does not pan, zoom or follow.
3. **Frame 12's “View Zone 18” needs a zone.** The alert names Zone 18 at Laajavuori, 1.8 km north;
   the app's demo composition is the design's own three zones (`DEMO_ZONES`: Z14, Z09, Z21) and has
   no Zone 18. A screen for it would either need a zone source or a zone invented for it.
4. **Frame 15's filters need listing metadata.** The frame's three chips are “All berries”,
   “Pickup” and “Within 10 km”, and the app holds two demo listings: every filter leaves both, and
   two of the three would have to claim metadata the app does not have (which listings offer
   pickup; how far the one in the picker's own town is) to pretend otherwise.
5. **Frame 18's two actions need a payment provider.** One releases a payment and one freezes it.

## Decision

**The one part the phone's own record can answer is built; the five that need a service, a
permission or a zone source stay recorded, each with what has to exist first.**

1. **Frame 07's “See all 11” opens an app-drawn screen** (`/zone-reports`,
   `features/discover/components/zone-reports-screen.tsx`) — **the design never drew it**. Its rule
   module is `features/discover/domain/zone-reports.ts`:
   - the frame's own **eleven** are stated as the design's sample week, read from the zone's own
     figures (`DEMO_ZONE_DETAILS.reportsThisWeek`) so the card above and this line cannot disagree;
   - beneath it, the reports **this phone holds for that zone**, newest first, with the count and
     the reports' own lines (the day, the length, the rating the picker gave on the design's 1–5
     scale, the harvest they typed). The queue's own identity for a zone (`Z14`) is read through
     one function, so a saved report lands on the zone the frame prints (`14`) and **another zone's
     report is never printed under this zone's name**;
   - the frame's eleven include other pickers' reports, and **the screen says the service that
     would return them does not exist** rather than standing the sample in for the phone's record;
   - a store that could not be read is a line saying so, never an empty list the picker did not
     write.
2. **The link is a control only where there is a list to open**, and its visible label stays the
   frame's own “See all 11”: the route supplies the destination, and the **accessible name** says
   where the press leads (“… · opens the reports saved on this phone”), because the frame's count
   and the phone's own list are not the same thing — the rule frame 16's contact action follows.
   Without a destination the row is the design's words and claims no role, as before.
3. **The screen carries the disclosure its zone needs.** The zone and the week it is about are the
   design's composition, so the header carries the same `· SEASON DEMO` frame 06's map and frame
   11's season screen carry, and the demo-disclosure guard classifies it.
4. **The five recorded parts stay absent, not inert.** The ADR-042/043 treatment draws a frame's
   block as the design's own sample *inside a block the screen labels as such* (frame 13's region,
   frame 12's preferences card). These five are not that: they are a control on a live surface — a
   map, an alert, a search field, an order — where a drawing that looks operable and is not is the
   thing AGENTS.md §11.2 forbids. Each stays out, with the reason on the record:
   - **06, 09 — the recentre control**: needs the picker's own position **and** a map that can move;
   - **12 — “View Zone 18”**: needs a zone source, or a zone the design never drew;
   - **15 — the filter chips and the sliders glyph**: need a listings service with the metadata a
     filter would act on; until then the chips stay the frame's own states and claim no role;
   - **18 — the two payment actions**: need a provider; their strings stay out of the catalogue,
     and the screen keeps the frame's own test-mode disclosures.

## Alternatives considered

- **Draw all five inert.** Rejected: it would put five controls on four screens that look operable
  and do nothing (a map button, an alert action, a filter sheet and two payment actions), which is
  worse for a user than their absence and against the rule above. The sample blocks that *are*
  drawn inert (frames 12 and 13) sit inside a block the screen itself introduces as the design's
  sample, where the disclosure is in front of the drawing.
- **Make the map pan so the recentre control can act.** Rejected: panning is an interaction the
  design does not draw, and with no position source the control would recentre a drawing on a demo
  dot — an addition that solves nothing (AGENTS.md §2.2).
- **Add a demo Zone 18, or fill the eleven with sample rows.** Rejected: inventing a zone or
  another picker's report is inventing product data, which the demo-disclosure rule exists to stop.
- **Reword the frame's “See all 11” into the app's own count.** Rejected for now: the link's count
  is the frame's own and its block is disclosed as the season demo; the *destination* is where the
  difference between the design's week and the phone's record is stated, which is what every
  app-drawn screen here does. If the sample count ever confuses a reader, the link's label is the
  place to change it.

## Consequences

- The app has **one more app-drawn screen**, measured by the layout harness in both languages and
  at the largest text size, classified by the demo-disclosure guard, walked by the browser suite
  (the link is a real control on the built page), and inventoried in `docs/design-source.md` (whose
  guard fails when a route has no row).
- **Frame 07's row is no longer a label**: a picker can press it and see exactly what this phone
  holds for the zone, including the case where it holds nothing.
- **Five parts stay unbuilt, and the record now names what each one needs first** (design-source's
  status rows, `docs/demo-and-stand-ins.md` §7, and PROJECT.md's known issues). They are not
  waiting on a decision this repository can make for the owner: a position source, a zone service,
  a listings service and a payment provider are the terms.
- The frame's own week and the phone's record are now **two different things on one screen, said
  separately** — the pattern the season screen already follows for its summary and its history.
