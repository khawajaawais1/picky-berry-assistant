# ADR-035 — Shared spots: the frame, the viewer and what it commits us to — the answers, recorded in one place

- **Status:** **Proposed — a skeleton, not a decision.** Every `> _pending_` below is a slot for an
  answer to [to-questionnaire-community-map.md](../../to-questionnaire-community-map.md). A section
  becomes `Recorded` the day its answers arrive; the ADR is `Accepted` when §1 and §2 are answered or
  explicitly deferred. Nothing is built by it, and no screen, copy or byte moves until they are.
- **Date:** 2026-10-11 (skeleton). Each recorded answer carries the date it arrived.
- **Deciders:** the Figma design owner (questionnaire §1) and the project owner (§2) — covering
  PROJECT.md open question 26, the lawful-basis sentence question 15 owes the connection between two
  accounts, and known issue 31. This repository writes the slots and records the answers; it decides
  none of them, and an unanswered slot keeps the feature unbuilt rather than defaulting.

## Context

What the owner decided on 2026-10-10, and this ADR does not reopen: **a shared spot is a place
someone picked, never a person's position**; sharing is **with people you invite**; and the frame's
third state, “Public: visible on the community map”, is **recorded but not decided as in scope**
(PROJECT.md, “Recorded requirement”). That decision is what keeps the three sentences the app already
ships exactly as they are — screen 05's “Your exact GPS tracks are never shown to other people”,
screen 03's “Your GPS trails are never public”, frame 14's “Visibility applies to spots, not your
route. Exact tracks are never shown to others.” What is missing is what to draw around them.

What exists today: the **access rule** of the first backend slice — who may read a share and who may
redeem the sharer's invite — specified and tested in this repository
(`src/features/sharing/domain/share-access.ts`, 24 cases) and deployed nowhere
([ADR-032](ADR-032-the-first-backend-slice.md), known issue 31). The rule's shape records what is
open: what is shared is a **zone id** until §1.2 answers what a spot is (ADR-032 decision 6), and a
recipient becomes one by redeeming a link the sharer sends themselves — an **assumption** that §2.3
asks the owner directly (ADR-032 decision 5). The design draws the sharing *model* (frame 14's
“Default spot visibility” block) but **no community map, no share control and no invite list**, and
the block is deliberately **not drawn** because its chips promise a model the app does not have.

Three throwaway readings of the community map were built and left running so §1 can be answered by
looking — `npm run prototype:community-map`, each on the screen that reading would give the feature:
other pickers' places as a second layer on frame 06's own map (`/discover?variant=A`), a list under
the zone's own screen (`/zone-details?variant=B`), and one card per place carrying the person who
shared it, where the picker's own places live (`/saved-spots?variant=C`). The prototype's bar
navigates between them; they are paper, not a proposal, and settle nothing.

The geography's half of “what is a spot?” is asked once, in
[to-questionnaire-zone-service.md](../../to-questionnaire-zone-service.md) §2.4, and does not come
back here; a shared spot's visibility inherits that document's §2.6 ceiling (the answer to “may we
publish the boundaries?” is also the ceiling for what may leave the device when something is shared).

**This skeleton exists before the answers for the same reason
[ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) does:** an answer that arrives
as a reply has to become a recorded decision the same day, without re-deriving which frame, field,
test, term or open question it changes. That work is enumerated once, below.

Two things this file is not. It is **not a decision**: nothing is chosen here, and reading a filled
slot as a recommendation would be wrong — the designer's and the owner's words are the decision,
transcribed. And it is **not a rewrite of ADR-032**: the rule, its refusals and its data minimum
stand; an answer that moves one of its assumptions is recorded here and noted in ADR-032's status
block, never by editing its decision text (the [ADR rules](README.md)).

## How this skeleton is filled in

1. **Answer to slot.** Paste the answer at its `> _pending_`, verbatim, with the date. Partial and
   per-question answers stay partial: an answered question and a deferred one are both recorded, and
   a deferred slot stays `pending` rather than being guessed. An answer that fits no slot is recorded
   under *Anything else* below and becomes a constraint on the decision. The section numbers are the
   questionnaire's own; the [response sheet](../../to-questionnaires-response-sheet.md) prefixes them
   with this part's letter (`B`), so §1.2 arrives as `B1.2`.
2. **§1 is a design decision, so the design side moves first.** The answer decides which frame(s) the
   design file gains — and the screen inventory in [docs/design-source.md](../design-source.md) with
   it; the winning reading is built, the losing two are deleted
   (`src/features/discover/components/prototype/community-map-variants.tsx` and
   `src/components/prototype/prototype-switcher.tsx`), and every new screen is measured by the layout
   harness in both languages and at the largest text size (ADR-018/019 — the harness's screen list is
   `SCREENS` in [e2e/layout.spec.ts](../../e2e/layout.spec.ts)). No copy and no product code are
   written before the frame exists (“Recorded requirement” §3).
3. **ADR-032's two assumptions move, if the answers move them.** Decision 6's field — what a share
   points at — is renamed when §1.2 answers what a spot is, with the rename moving through
   `share-access.ts`, [docs/api-contract.md](../api-contract.md) and the tests together. For the
   branch where **the sharer names the place**, that replacement's shape — the record's field and
   the read rule's non-change — is already prepared in
   [ADR-037](ADR-037-what-a-share-points-at-if-the-sharer-names-the-place.md), to be activated or
   withdrawn with the answer. Decision 5's
   invite-by-link mechanism is §2.3's and ADR-033 §4.1's question from two sides; if the owner
   changes it, the replacement is recorded where that answer lands, ADR-032's status block gains the
   supersession line, and the contract's blocking list loses the answered item while
   `share-access.test.ts` gains the new behaviour's cases **first** (the rule is the conformance suite
   the server must satisfy — ADR-032, decision 3).
4. **The term settles in [CONTEXT.md](../../CONTEXT.md).** Today there is no term for what a shared
   spot *is*, and nothing in the code may be called “spot” until this questionnaire is answered; the
   answer is what turns that note into a definition, and the share grant's field takes the word the
   answer chooses.
5. **PROJECT.md.** Update open question 26 (the whole of it), the lawful-basis sentence question 15
   owes the **connection between two accounts** and anything a viewer is told about the sharer, and —
   when §2.1 says the feature is v1 — known issue 31, whose “nothing calls the rule” narrows to
   whatever remains after the frame exists. The “Recorded requirement” entry moves from candidate to
   decided scope, and this ADR's row moves from *Proposed* to *Accepted* in
   [docs/adr/README.md](README.md) and in PROJECT.md's decision table as its sections fill.
6. **What a v1 answer still waits on.** Saying “v1” does not build anything by itself: this is the
   first feature that would make the app **send** anything (SECURITY.md §17), so a server, a region,
   a processor, a DPA and a lawful basis come first — the decisions ADR-033 records — and the app's
   transport is [ADR-005](ADR-005-offline-first-sync.md)'s queue, unbuilt.

## Decision

### 1. What to draw — questionnaire §1 (design owner)

The three readings in one line each, so a recorded answer is readable next to the paper it was chosen
from: **A** is a second layer on frame 06's own map; **B** is a list under the zone's screen; **C**
is one card per place, carrying the person who shared it, where the picker's own places live. “The
header from B with the cards from C” is a perfectly good answer, and each reading's notes name what
it left out (the “Public” state, an invite list, removing a spot someone else shared).

**1.1 Is the community map a frame of its own, or frame 06's map with other people's spots on it?**
It decides whether the map screen grows a second layer or there is a screen to design from scratch —
and the map is currently an illustration of the design's geometry, so either answer changes what that
drawing has to become.

> _pending — questionnaire §1.1_

**1.2 What is a “spot” — the zone itself, or a place inside it that the sharer names?** If the answer
is finer than a zone, the design has to say **who names it**: a name the picker types (a field on
the share, and a new sentence to translate) or a place the operator curates and the app offers.
Nothing in the code may be called “spot” until this lands (CONTEXT.md), and the grant's field is
renamed with it. The branch where the picker types the name has its shape prepared in
[ADR-037](ADR-037-what-a-share-points-at-if-the-sharer-names-the-place.md) — the record's field, and
what does not change in the read rule.

> _pending — questionnaire §1.2_

**1.3 What does a viewer see on a shared spot?** The zone's own card, the sharer's name or initials,
how long ago it was picked, a note the sharer typed, the species — a spot with no words is a pin, a
spot with too much is a report, and anything drawn is copy the app must have.

> _pending — questionnaire §1.3_

**1.4 Where does the sharing control live — frame 07's screen, frame 14's default, or both?** A
per-spot control on the spot is a different thing from a default in settings, and the app should not
draw both unless the design says both are wanted.

> _pending — questionnaire §1.4_

**1.5 Does the design still hold all three states, or two — and what does “Public” draw?** If the
frame keeps all three, the app has to be able to draw a public state honestly (who may see it, what
it claims, how it is turned off); if it ships two, the frame should not draw a third that means
nothing — the reason the block is undrawn today.

> _pending — questionnaire §1.5_

**1.6 What is the invite flow's surface, if any?** “People you invite” implies a list to manage —
who is on it, how they get there, how one is removed, and what an invite looks like to the person
receiving it. The app has no contacts, no profile page and no notifications today.

> _pending — questionnaire §1.6_

**1.7 Which states must the frame draw that the app cannot avoid?** An empty community map, a spot
whose sharer removed it while someone was looking at it, a spot for a zone the viewer's app does not
know, and a failure to load shared spots at all — the states the app may not invent.

> _pending — questionnaire §1.7_

### 2. What it commits us to — questionnaire §2 (owner)

**2.1 Is this v1, or recorded for later?** It is the first feature that needs a server, an account
for the person you share with, and a lawful basis for storing someone else's view of your spot — so
it also decides what has to be built before it (zone service, backend, authentication) and what
waits.

> _pending — questionnaire §2.1_

**2.2 Does a shared spot expire, and can it be taken back?** ADR-014's 12-month rule applies to
anything stored server-side, and revoking has to be as easy as sharing (AGENTS.md §11.1) — say
whether a shared spot ends when the season does, when the sharer removes it, or at a chosen date.

> _pending — questionnaire §2.2_

**2.3 Who can be invited — any account, or only people the user already knows outside the app?** An
invite needs an identifier for the other person; an email address or phone number is personal data
we would process *about someone who has not asked us to*. ADR-032 already assumes the link — a code
the sharer sends themselves, stored hashed and never looked up — and rejected an address lookup for
exactly this reason (decision 5, marked an assumption because this question asks directly). An answer
of “invite by address” supersedes that assumption rather than being built beside it.

> _pending — questionnaire §2.3_

**2.4 What does the viewer know about the sharer — their name, their initials, or nothing?** It
decides what the app stores and shows about a third person, and whether a spot shared with a group is
attributable at all. Anonymity is not a privacy freebie: an anonymous spot still tells the viewer
that someone was there.

> _pending — questionnaire §2.4_

### Anything else — questionnaire §B-else

An answer that names a screen, a promise or a constraint no section above holds.

> _pending — questionnaire §B-else_

## What no answer can change

Recorded so that an answer arriving under time pressure cannot be transcribed into something the
code or the owner's own decision already contradicts:

- **A spot is a place, never a position** — the owner's decision of 2026-10-10, and the reason the
  three shipped sentences stay exactly as they are. No reading, frame or answer turns this feature
  into a live map of people ([ADR-010](ADR-010-position-retention.md) records the position rule
  underneath it).
- **Sharing is with people you invite, and never a lookup of everyone** — the owner's decision.
  Whether the frame's third state, “Public: visible on the community map”, ships at all is §1.5's
  answer and is **not** assumed in either direction.
- **Nothing is built before a frame exists** (“Recorded requirement” §3). A screen, a copy string or
  a component named “spot” that predates the design answer is the thing this rule forbids.
- **The client never enforces the rule.** The app may use the rule's answers to decide what to draw
  and may not treat any of them as a check (ADR-032, decision 3; [SECURITY.md](../../SECURITY.md) §3).
- **Retention is 12 months** ([ADR-014](ADR-014-retention-policy.md)) for anything stored
  server-side, and revoking is as easy as sharing (ADR-032, decision 7).
- **Nothing is sent until a server, region, processor, DPA and lawful basis exist** — this would be
  the first thing the app ever sends (SECURITY.md §17; questions 3, 15 and 16, recorded in ADR-033).

## Alternatives considered

Nothing is chosen by this ADR, so the alternatives are the ones the answers are chosen *against*, and
three of them already exist as running paper (readings A, B and C). Record here, per area, the option
that was passed over and the reason given — a rejected alternative with a reason is what makes a
later reversal cheap to argue:

> _pending — where the community map lives · questionnaire §1.1_

> _pending — what a spot is · questionnaire §1.2_

> _pending — the invite mechanism · questionnaire §2.3_

## Consequences

- **Today:** one file that turns a reply into a record the same day. Nothing else changes — no frame,
  no screen, no copy, nothing sent, nothing stored, and the rule still has no caller but its own
  tests (known issue 31).
- **Whatever the answers are:** the rule's refusals, the data minimum, the 12-month ceiling and the
  “no third party's address” stance stand unless an answer supersedes one of them *as an ADR*, with
  ADR-032's status block updated rather than its decision text.
- **An answered §1 unblocks the build in front of the backend.** ADR-033 records that an answered
  deployment ADR still leaves the sharing UI unbuilt because it waits on a frame; this is the frame
  it waits on. With both answered, the feature's remaining gate is the server itself — the queue's
  transport (ADR-005), unbuilt.
- **The connection is personal data about two people.** A share links two accounts, and the viewer's
  side of it is data about someone who never asked us for anything; that is why §2.3 and §2.4 are
  owner questions and why every field of the grant answers the four questions AGENTS.md §11 asks
  (recorded in [docs/api-contract.md](../api-contract.md)).
- **The cost of an unanswered section is that it gets asked again.** An unrecorded answer is not a
  deferred decision; it is a decision someone has to re-make, and no frame can be drawn in the
  meantime.

## Related

- [to-questionnaire-community-map.md](../../to-questionnaire-community-map.md) — the ask this ADR
  records
- [to-questionnaires-response-sheet.md](../../to-questionnaires-response-sheet.md) — the same
  questions as `B1.1`–`B2.4`, and the one artifact that can carry every answer back at once
- [ADR-032](ADR-032-the-first-backend-slice.md) — the slice and the rule this feature enforces when a
  server exists, whose decisions 5 and 6 the answers may supersede
- [ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) — the deployment decisions that
  gate the first byte this feature would send
- ADR-014 (retention), ADR-010 (positions are never traces), ADR-005 (the unbuilt transport)
- PROJECT.md — open question 26 and the “Recorded requirement” it carries, question 15's
  lawful-basis half, known issue 31
- [CONTEXT.md](../../CONTEXT.md) — the term for what a shared spot is settles here
- The other three skeletons: [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md)
  (signing in), [ADR-036](ADR-036-the-zone-service-what-it-must-return.md) (the zone service)
