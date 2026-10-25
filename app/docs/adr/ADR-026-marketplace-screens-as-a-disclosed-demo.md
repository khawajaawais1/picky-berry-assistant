# ADR-026 — The planned marketplace ships as a disclosed demo, outside the app shell

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Project owner (asked to finish the frames' remaining screens; the rules below are this repository's)

## Context

The design file holds four more frames than the app had screens — 15 · Planned marketplace · Browse
(`5:23780`), 16 · Listing detail (`5:23832`), 17 · Seller chat (`5:23883`) and 18 · Checkout and
order status (`5:23935`) — and every one of them labels itself: “Planned extra” in the chip each
frame opens with, “OUTSIDE CORE” in each eyebrow. PROJECT.md recorded them as *design ahead of
scope* (assumption 2, 2026-10-08), together with the owner's decision that v1 carries **no real
money** (decision 14) and CONTEXT.md's note that **Buyer** is not a v1 role.

What the frames need in order to be real does not exist anywhere in the app: a listings service, a
seller account, a chat transport and a payment provider (the frame's own escrow sentence says
“Planned provider escrow…”). The app has no backend at all (open questions 3 and 6), and a screen
that took a payment or sent a message would be claiming a capability nobody has built.

Two things were nonetheless true. Every other frame in v1 scope has a built screen behind a route,
so the marketplace was the one remaining block of the design that no one could look at in the app;
and the frames are, as drawings, **complete enough to be honest**: they carry their own disclosures,
their own sample composition and their own words about what is planned.

## Decision

1. **The four frames are built as four screens**, in a `marketplace` feature with a public entry
   point like every other feature (ADR-002), rendered by `/marketplace`, `/marketplace-listing`,
   `/marketplace-chat` and `/marketplace-order`.
2. **They stay outside the app shell.** The frames draw no core navigation, and the app draws none
   on them: they are not one of the four destinations, and no destination is marked current
   (ADR-022 unchanged). Nothing in the shell links to them yet, and that gap is PROJECT.md's to
   record, not this feature's to paper over with an invented entry point.
3. **The design's own composition is the data, and it is labelled as such.** The two listings, their
   seller, the harvested day, the thread and the order are `DEMO_LISTINGS`, `DEMO_THREAD` and
   `DEMO_ORDER` in the feature's `domain/` — pure values with no I/O, like every other piece of
   domain in this app (ARCHITECTURE.md). Each screen carries the frame's disclosure rows
   (“Planned extra”, “Buyer mode · Preview”, “Provider test mode”), so nothing in them can be
   mistaken for live data.
4. **Nothing acts that cannot act.** The frame's filter chips, its alert-style switch-free rows, its
   composer and the order's “Confirm berries received” and “Open dispute” are **not drawn as
   controls**: there is no filter to apply, no message to send and no payment to release or freeze,
   and a pressable that changes nothing claims no role (AGENTS.md §11.2). What *is* drawn as an
   action is what really leads somewhere: the browse list's search narrows the app's own two
   listings and says how many are left, the card with a screen behind it opens frame 16, frame 16's
   two actions open frames 17 and 18, and frame 17's summary opens frame 18.
5. **Money is a number in the domain and a string only in one place.** Prices and totals are whole
   cents (`domain/money.ts`), and the only function that turns them into text takes the locale, so
   Finnish writes “8 €/kg” where English writes “€8/kg” (ADR-017/018).
6. **A control's label and its name are separate when the design's box is narrow.** Frame 16 draws
   its contact action 165 px wide with 104 px of label inside (“Contact Matti”); the app prints the
   seller's whole name, which wraps there. The label is therefore the design's own word alone
   (“Contact” / “Ota yhteyttä”) and the seller's name goes in the action's **accessible name**,
   which has no 104 px to fit into — `AppButton` gained an `accessibilityLabel` override for it,
   defaulting to the visible label as before.
7. **The screens are measured like every other screen.** They are in the layout harness's manifest
   for both languages at the design's text size and at 200 % (ADR-018/019), and in the browser
   journey spec, which walks browse → listing → thread → order on the built export.

## Alternatives considered

- **Draw nothing, as before.** The status quo, and defensible: the capability is planned, not v1.
  Rejected once the owner asked for the remaining screens: the frames exist, their parts are
  separable, and what they need in order to *act* is exactly what the app says it does not have.
- **Build a real marketplace slice** — one listing service, one seller, a real provider. Rejected:
  it needs a backend (open questions 3, 6), a payment provider with a DPA (AGENTS.md §11.1), a
  lawful basis for seller and buyer personal data, and an owner decision on **Buyer** as a role —
  none of which exist, and none of which an implementation may invent.
- **Draw the frames exactly as drawn, presses and all.** Then four controls would announce
  themselves and do nothing: a filter that cannot filter, a composer that swallows a message, and
  two actions over money nobody holds. Rejected under AGENTS.md §11.2.
- **Put the marketplace behind a fifth destination.** Rejected: the frames draw four, mark none
  current, and say “outside core”; a fifth destination would change the shell for a demo
  (ADR-022), and the way in is the owner's decision.
- **Reach the demo through a debug or developer entry** (a hidden route list). Rejected as the same
  invented entry point with a different label; the honest version is to record the gap.
- **Localize only the screen chrome and leave the sample thread in English.** Rejected: the harness
  measures both languages at both text sizes, and a demo whose Finnish was never fitted to the
  frame's boxes would be the one screen in the app that is not.

## Consequences

- **The app now draws every frame in the design file except screen 02**, which stays design
  exploration only (PROJECT.md assumption 1). The marketplace screens are the frames' own drawing
  and demo composition, not a claim that the capability is built: PROJECT.md keeps **Marketplace**
  as *planned/partial* and records what each screen still needs.
- **Nothing in the marketplace touches personal data.** The listings, the seller and the thread are
  the design's sample values held in code; nothing is read from the device, written to it, logged or
  sent. There is no new processor and no new field to answer the four GDPR questions for — and the
  day a real listing or seller arrives, that changes and the owner decisions above come first.
- **Reachability is an open gap, now recorded rather than assumed.** A user cannot walk to the
  marketplace from any built screen; only its routes reach it. Whether it gets an entry point, and
  from where, is PROJECT.md's open question 24.
- **The Finnish wording of seven new strings was written to fit the frames' boxes** and is covered
  by the same measurement as the rest of the app: two wordings were shortened after the harness
  caught them wrapping (frame 16's delivery line, frame 18's hold message).
- **The composer, the filter chips and the order's provider actions are deliberately absent as
  controls**, and a unit test asserts each absence, so a later change that draws one has to change
  the test and the claim together.
- The marketplace's own atoms and molecules (`MarketChip`, `MarketDisclosure`, the listing card and
  the money formatter) are feature-internal: no shared component imports from `features/marketplace`
  (ARCHITECTURE.md §2), and the disclosure row wraps rather than squeezing what a frame puts beside
  its chip, which is what its 200 % measurement needed.
