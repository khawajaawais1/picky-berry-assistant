# ADR-039 — Frame 14's two remaining rows get the screens behind them, and the screens state only what is true

- **Status:** Accepted (2026-10-11)
- **Deciders:** the project owner asked for the remaining screens (2026-10-11); this repository writes
  the two screens' content, and the copy is reviewable where every app-drawn screen's is.
- **Related:** [ADR-030](ADR-030-the-saved-plan-gets-a-screen.md) (the frame's third app-drawn row),

  [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md) (the sign-in reading whose
  “no password” this screen states as fact), [ADR-038](ADR-038-a-session-may-carry-no-name.md), and
  [ADR-014](ADR-014-retention-policy.md) (what a stored field owes).

## Context

Frame 14 (`5:23613`) draws a group of five rows, each with the frame's chevron: **Background visit
tracking** (`5:23664`), **Offline maps & sync** (`5:23669`), **Account & security** (`5:23675`),
**Language** (`5:23680`) and **Terms & privacy** (`5:23686`). The app built three of them. The
remaining two were deliberately not drawn at all, because a chevron promises a screen and the screens
did not exist: design-source.md's inventory row for frame 14 said so, and
`privacy-settings-screen.tsx` records the rule (AGENTS.md §11.2 — an affordance that cannot act must
not claim a role).

That left frame 14 incomplete in the one direction the design *is* explicit about: it names two
surfaces that the app does not have, and it draws a control beside each. Finishing the frame means
building both, which is the same situation [ADR-030](ADR-030-the-saved-plan-gets-a-screen.md) faced for
the frame's “Saved spots” row: the design draws the way in and leaves the destination to the app.

What makes these two harder than the saved plan is that **both tempt the app into claiming things it
cannot know**. “Account & security” invites password change, recovery, device lists and account
deletion, none of which exist behind a code-based sign-in and no account service. “Terms & privacy”
invites terms of service and a privacy notice, which are the owner's to write, and a lawful basis per
field, which is still open (PROJECT.md open questions 15–16). A screen that draws either as if it were
real would be the app inventing a legal or a security promise.

## Decision

**Both rows are drawn where the frame draws them, and each opens an app-drawn screen that states what
is true today and names what is not there yet.**

1. **`/account-security`** (`features/privacy/components/account-security-screen.tsx`) draws frame 14's
   own account row from the same session — the name when a sign-up collected one, otherwise the
   identifier (ADR-038) — and then the session's own facts: where it is kept (this app's memory, for
   as long as it is open), how long it lasts (an hour, the stand-in's `SESSION_LIFETIME_MS`, which is
   the decided provider's own token length), what ends it (signing out, or the hour running out), and
   what is deliberately absent (no password to change or recover — the chosen reading sends a code —
   no device list, no account deletion, because no account service exists). **Sign out** is offered
   here as well as on the settings screen; it is the same `src/services/sign-out.ts` behind both, and
   what it deletes is stated before the control is drawn.
2. **`/terms-privacy`** (`features/privacy/components/terms-privacy-screen.tsx`) is a notice about
   **the device**: it names each record the phone is holding — the account (the session), the visit
   tracking consent, the saved plan, the queued reports — and answers AGENTS.md §11's four questions
   for each one (who may read it: this phone, and nothing is sent; how it is corrected: each record's
   own control, named; how a copy is had: not built yet, said out loud; how it is deleted: signing
   out). Which records exist is a rule, not a drawing: `features/privacy/domain/held-records.ts`
   exists so that a record the app could not read is never claimed, and a failed read says the list is
   incomplete instead of presenting a subset as the whole.
3. **Neither screen invents the things only someone else can decide.** No password control, no
   recovery flow, no device management, no deletion flow (there is no service to carry them); no terms
   text, no privacy notice, no retention statement of the server's (there is no server). The notice
   says the written notice is still owed and where it will stand, which is the same honesty the
   marketplace screens practise with their disclosure.
4. **Both are ordinary routes in the app shell**, under the Profile destination with the rest of the
   settings surface (ADR-022), measured by the layout harness in both languages and at the largest
   text size, and classified as sample-free by the demo-disclosure guard.

## Alternatives considered

- **Leave the rows undrawn.** The status quo, and the safest — but it leaves frame 14 permanently
  incomplete, and the two things the frame names are exactly the two a EU user has a right to reach:
  what is held and why, and what keeps the account. A design that draws the way in is not satisfied by
  an app that refuses to draw it (the same reasoning as ADR-030).
- **One combined “Account, terms & privacy” screen.** Fewer routes, and it would match no frame: the
  design draws two rows with two stops, and merging them makes the terms unreachable from the account
  surface and vice versa.
- **Draw the rows without destinations (a reading each).** What the app did until now. It is honest
  but it is the *design's* control left unbuilt; with the destinations available, the rows are the
  design's way in and belong wired.
- **Write a short terms and privacy notice here.** Tempting and wrong: terms bind the operator with
  the user, the notice states lawful bases and processors, and neither is the app's to compose in a
  screen. What the app *can* state — the records on this device and their fate — it states in full.

## Consequences

- Frame 14 is complete: all five of its rows are drawn and every one of them opens something real.
- The two screens give the app a place to keep its GDPR answers as the app grows: a new stored field
  adds itself to `held-records.ts` and to the catalogue, and the notice stays true.
- **What is still owed is now visible in the product**, not only in the documentation: the notice's
  last card names the missing written notice, and the account screen names the missing service. The
  first backend slice ([ADR-032](ADR-032-the-first-backend-slice.md)) and the owner's answers
  (open questions 12, 15, 16, 23, 25) close them.
- Neither screen adds a stored field, a processor or a transfer: nothing is written and nothing is
  sent by either, so no new lawful basis is created (AGENTS.md §11).
- The Finnish copy of both screens is app-written and joins the rest of the catalogue in open
  question 13's review.

## References

- Frame 14's rows: `5:23663` (the group), `5:23675`/`5:23677` (Account & security), `5:23686`/`5:23688`
  (Terms & privacy); inventory in [docs/design-source.md](../design-source.md).
- `src/features/privacy/components/account-security-screen.tsx`,
  `terms-privacy-screen.tsx`, `src/features/privacy/domain/held-records.ts`, and their tests;
  `src/app/(app)/account-security.tsx`, `src/app/(app)/terms-privacy.tsx`.
