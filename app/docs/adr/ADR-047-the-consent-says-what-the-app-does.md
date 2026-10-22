# ADR-047 — The consent says what the app does, and the background half goes to the owner

- **Status:** **Accepted in part (2026-10-12).** §1 is decided and built; §2 is the project owner's
  decision and is still `> _pending_`, so the ADR becomes `Accepted` when §2 is answered or
  explicitly deferred.
- **Deciders:** the project owner (2026-10-12) asked for the consent screen's promise to be
  reconciled with what the app does — say clearly that capture is foreground-only, and put the
  background-permission decision to them. §1 is this repository's answer; §2 is theirs.
- **Related:** [ADR-020](ADR-020-record-consent-on-device.md) (the record §1 renames a field of, and
  does not re-decide), [ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md) (foreground
  only, which is what the copy now says), [ADR-014](ADR-014-retention-policy.md) (12 months, which
  applies to records the app keeps), [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)
  (nothing is built by it yet), PROJECT.md open questions 15 and 21, SECURITY.md §11 and §16.

## Context

Frame 05's consent row reads “I consent to background visit tracking”, and the benefit above it
promises that timing continues “even with the screen locked”. Frame 14's switch repeats the words.

The app does not do that, and since 2026-10-12 it is not close to doing it: position is read in the
**foreground only**, under the platform's “while the app is open” permission, with no “Always”
string, no Android background location and no foreground service — and a guard fails the build if any
of those appear in `app.json` ([ADR-045](ADR-045-a-position-behind-a-port-and-nothing-kept.md)).

That left the app making a promise it cannot keep, in the one place where the promise *is* the
product: a consent screen. A consent is only valid while it is **specific and informed** (GDPR
Art. 4(11), 7; AGENTS.md §11.1), and a purpose the app states but does not serve is a purpose the
picker cannot check. It is also the mismatch this repository has a rule about in the other
direction — nothing in the app may claim more than it does (SECURITY.md §11, DEFINITION_OF_DONE.md).

Two things were therefore open: the copy, and the decision behind the copy. The second is not this
repository's to take: background capture needs platform permissions, store declarations, a battery
budget and a lawful basis, and the owner has not been asked (PROJECT.md open questions 15 and 21).

## Decision

### §1 — The copy states what the app does (decided and built, 2026-10-12)

1. **The consent is for visit tracking while the app is open.** Five strings in both catalogues say
   so: screen 05's consent row and the benefit above it, frame 14's switch label, the notice's row
   for the consent record, and screen 09's arrival note (whose second sentence promised the
   background). The frame's own promise is **withdrawn from the copy**, recorded as screen 05's
   third deliberate departure ([docs/design-source.md](../design-source.md), PROJECT.md).
2. **The stored field says what was agreed to.** `PrivacyConsent`'s boolean is now `visitTracking`
   and the record lives under `picky.privacy-consent.v2`. A stored field named for a promise the app
   no longer makes is a claim the code cannot keep, and the field is what every later reader
   believes. This **amends ADR-020's field name and key without changing what ADR-020 decided** —
   a record on the device, written only when the user decides, withdrawn on the screen the sentence
   promises.
3. **A record from the previous shape is not migrated.** `readPrivacyConsent` refuses it (its shape
   is the old one, and the app will not guess what someone agreed to under a promise it has
   withdrawn) and clears it away, because a record nothing can show or withdraw answers none of the
   four questions AGENTS.md §11 asks. The safe direction is to ask again: the app does not read it
   as consent, and no position is read until a fresh decision is stored.

### §2 — The background half is the owner's decision (pending)

Each slot below names what an answer changes. Nothing here is built, and nothing here defaults.

**2.1 · Does Picky ever capture in the background at all?** `> _pending_` — the branch that decides
every other slot. Yes moves most of the list below into scope; no closes it and means the frames'
promise is answered by *removing* it from the design, not by building it.
*Changes in code:* a second consent purpose (or a stated non-feature), the copy in both languages,
and the frames' own rows — the switch on frame 14, the benefit on screen 05.

**2.2 · If yes: which platform permissions and declarations ship?** `> _pending_` — the iOS
“Always” usage string (`NSLocationAlwaysAndWhenInUseUsageDescription`), the location background
mode, Android's `ACCESS_BACKGROUND_LOCATION` and a foreground service with its own notification,
each with a store declaration and, in the EU, a justification Apple and Google review.
*Changes in code:* `app.json`'s plugin switches and the guard that currently fails if any of them
appears; a second consent control; the notice's record list.

**2.3 · If yes: the watch's cadence and accuracy.** `> _pending_` — how often a fix is read, how far
between fixes, and what the battery may cost. The app asks for `Accuracy.High` today and nothing
else, and that choice is recorded as its own (docs/demo-and-stand-ins.md, class D4).
*Changes in code:* the watch options in `src/services/location/expo-source.ts`, the tracker's
policy, and the demo inventory's D4 row.

**2.4 · The lawful basis for reading a position.** `> _pending_` — consent, or something else, for
which purpose, for how long, and what the privacy notice says (PROJECT.md open question 15; the
notice is owed before any release that reads a position at all).
*Changes in code:* the notice and the consent's own wording; nothing in the read path.

**2.5 · What may be kept, and for how long.** `> _pending_` — whether a visit derived from a fix is
stored, where, and against ADR-014's 12 months; today the app keeps nothing, and the seam's own
answer is that a fix is replaced by the next one.
*Changes in code:* the visit tracker's persistence (none exists), and the notice's record list.

**2.6 · Where this decision is asked.** `> _pending_` — no questionnaire asks it yet: the four
documents sent on 2026-10-11 (sign-in, community map, zone service, backend) are closed at 58 slots,
and this ADR is where the background half waits. If the owner wants it inside a send, the slot moves
to a fifth document the reconciliation in
[questionnaire-reconciliation.test.ts](../../src/config/__tests__/questionnaire-reconciliation.test.ts)
then holds.

## Alternatives considered

- **Keep the frame's copy and build the promise later.** Rejected: it makes the app's only
  privacy-critical screen a claim about a feature that does not exist, which is exactly what the
  demo-disclosure rule exists to prevent — and a consent to an unavailable purpose is not the
  consent the user thinks they gave (AGENTS.md §11.1).
- **Ask for the background permission now, so the copy becomes true.** Rejected: it spends a
  permission, two store declarations and a lawful basis on a decision the owner has not taken, and
  there is nothing to capture for yet (no zone list, known issue 14).
- **Change the copy and keep the field named `backgroundTracking`.** Rejected: the code would then
  claim more than the app does in the vocabulary every later reader trusts, and the field name is
  what the record's own four answers are written about.
- **Migrate the old record into `visitTracking`.** Rejected: the old consent was given under the
  frames' promise, and carrying it forward would be the app deciding, on the user's behalf, that the
  two are the same thing. Asking again costs one press and cannot be wrong.
- **Draw the background decision as a greyed-out control on screen 05.** Rejected: an inert control
  that describes a feature is the same promise in a weaker voice, and a control that cannot act may
  claim no role (AGENTS.md §11.2).

## Consequences

- **The app stops promising what it cannot do**: the copy on screen 05, frame 14's switch, the
  notice's row and screen 09's note all state the foreground limit, in both shipped languages.
- **The frames' copy is departed from in three places now** on screen 05 (unchecked row, no OS
  permission asked there, foreground-only wording) and in two on frame 14 (switch label, plus the
  “Default spot visibility” block that is still not drawn) — each recorded in PROJECT.md and
  `docs/design-source.md`, because the design remains the source and a departure is a departure.
- **A device holding the previous record is asked again** the next time a consent screen is opened,
  and the old value is cleared rather than left behind. Nothing shipped, so this is a developer
  device's state rather than a user's (PROJECT.md, known issues).
- **The background half is now a decision with its consequences written down**, which is what the
  owner asked for: answering §2.1 “yes” turns §2.2–§2.5 into work with a known shape, and “no” means
  the frames lose a line rather than the app gaining a permission.
- **The app still tracks nothing**: no watch runs, no screen asks for a fix, and the tracker has no
  zone list (ADR-046). This ADR changes what the app *says*, which is the part it could get right
  today.
