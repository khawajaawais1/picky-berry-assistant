# ADR-049 — Screen 04's phone states and the words that follow them — the answers, recorded in one place

- **Status:** **Recorded in part — every slot holds this repository's assumed answer, not the
  owner's.** On 2026-10-13 the project owner asked for screen 04 to be built with the copy following
  the identifier, assuming the cheapest answer to each slot of
  [to-questionnaire-verification.md](../../to-questionnaire-verification.md), and for the departure to
  be recorded. Every slot below is therefore filled, and every one is **marked as assumed** where it
  is filled: the design owner's and the owner's own answers are still owed and supersede any of them.
  The ADR becomes `Accepted` when §1–§4 hold real answers or explicit deferrals.
- **Date:** 2026-10-12 (skeleton); 2026-10-13 (the assumed answers, built).
- **Deciders:** the Figma design owner (§1, §2 and §3 — a frame and the frame's own words) and the
  project owner (§4, and §2's journey call) — covering PROJECT.md **open question 20** in the half
  that is a screen and its copy. This repository writes the slots and records the answers; for the
  assumed round it also *wrote* them, at the owner's instruction, which is why each carries that
  marker rather than reading as a decision someone made.
- **Related:** [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) (the branch sentences,
  already recorded — not reopened here), [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md)
  (the sign-in reading that sends a returning user to this screen), [ADR-027](ADR-027-a-stand-in-verification-code.md)
  (the stand-in code), [ADR-018](ADR-018-measure-layout-in-both-languages.md) and
  [ADR-019](ADR-019-measure-at-the-largest-system-text-size.md) (the harness that measures the copy),
  [docs/design-source.md](../design-source.md) §“Screen 04, as extracted”, [docs/copy-claims-audit.md](../copy-claims-audit.md).

## Context

One frame, two identifiers, two journeys, one state drawn. Screen 04 (`5:22840`) is built, measured and
in the layout harness; the design file draws its **email** state only, and three of its strings name
email outright — the title “Verify your email”, the action “Change email address”, and the card at the
foot, “Signed up by phone instead? The same six-digit step confirms a phone number.”

Into that screen arrive four readers:

- a **phone sign-up** — screen 03's Phone chip, its number typed, then this screen, where the number
  stands where an address would and the title still says email;
- an **email sign-up** — the state the frame draws;
- a **phone sign-in** — the sign-in screen draws one field for either identifier (ADR-034 §1.2:
  *either one, in one field*), so a returning user who typed a number lands on the sign-up's screen,
  eyebrow and all;
- an **email sign-in** — the same, with an address.

Nothing breaks today, and nothing caught it either. The copy audit of 2026-10-12 cleared claims about
a **message being sent** (ADR-048) rather than claims about **which identifier the account has**, so
“Verify your email” on a phone journey was a gap no guard covered — which is why §7 called for a family
if an answer needed one, and why the family was added **before** any answer arrived (2026-10-13,
[docs/copy-claims-audit.md](../copy-claims-audit.md) row 14): the claim ships, so the guard could not
wait for the wording. That same day the owner asked for the screen to be built with the copy following
the identifier, assuming the cheapest answer to each slot below — so the context above describes what
this document was written to answer, and the slots now hold **assumed** answers with the departure
recorded rather than the frame's words left in place.

What this document deliberately does **not** reopen: the sentences each delivery branch turns back into
(ADR-048 §2, key by key: “Check your phone.” and “…the code we texted to {destination}…” on the SMS
branch) and the resend row's absence while no caller can send a code (ADR-048 §4). Nor does it re-ask
what identifies a returning user (A1.2, answered) or which states the sign-in screen must draw (A1.4,
still open and owned by that document).

**This skeleton exists before the answers for the same reason
[ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) does:** an answer that arrives as a
reply has to become a recorded decision the same day, without re-deriving which string, screen, harness
entry or open question it changes. That work is enumerated once, below.

Two things this file is not. It is **not a decision**: nothing is chosen here, and reading a filled slot
as a recommendation would be wrong — the design owner's and the owner's words are the decision,
transcribed. And it is **not a rewrite of ADR-048**: that record stands, and an answer that contradicts
it is superseded in a new ADR with ADR-048's status block updated, never by editing its decision text
(the [ADR rules](README.md)).

## How this skeleton is filled in

1. **Answer to slot.** Paste the answer at its `> _pending_`, verbatim, with the date. Partial and
   per-question answers stay partial: a deferred slot stays `pending` rather than being guessed. An
   answer that fits no slot is recorded under *Anything else* below and becomes a constraint on the
   decision. The section numbers are the questionnaire's own; the
   [response sheet](../../to-questionnaires-response-sheet.md) prefixes them with this part's letter
   (`E`), so §3.1 arrives as `E3.1`.
   **One exception, and it is on the record (2026-10-13):** the owner asked for screen 04 to be built
   with its copy following the identifier *before* any answer arrived, so each slot was filled with
   this repository's **assumed** answer. Those are marked `Assumed … — the repository's answer, not
   the owner's` at the slot itself, they are what the code ships, and a real answer **replaces** the
   text rather than sitting beside it. Nothing above changed: an assumption is not an answer, so no
   slot is `pending`-by-decree and none is a decision the owner made.
2. **A copy answer is a catalogue edit in both languages.** Each of §3's answers replaces a key in
   `src/services/i18n/locales/en.ts` **and** `fi.ts` (`onboarding.verification.title`,
   `onboarding.verification.changeEmail`, `onboarding.verification.phoneNote.title` /
   `.body`, `onboarding.verification.supporting`), with the layout harness's line counts for screen 04
   updated in the same change (`e2e/layout.spec.ts`, ADR-018/019) — Finnish runs longer than English,
   and a title that grows by a word is a measurement, not a detail.
3. **A branch answer is a prop, not a conditional inside the screen.** Which state the screen is in is
   a fact about the journey and the destination, and today it is available where the route already
   reads it (`peekVerificationRequest()`'s `destination` and `purpose`); the screen stays a component
   that renders what it is told (AGENTS.md §3). If §3's answers split the copy, the decision is
   *which* fact picks the branch — the identifier's shape, the journey, or the transport that answered
   — and that fact has to be passed in rather than derived from a string inside the component.
4. **The rule that tells the two identifiers apart already exists, in the wrong feature.** It decided
   which of the frame's two words an account row uses, and a phone state here needs the same answer.
   Onboarding may not import a sibling feature's internal file (AGENTS.md §3), so an answer that needs
   the rule on this screen decides where it lives: a shared home both features use, or answered where
   it already is and passed in. Recorded here because it is the cost of the answer, not a detail of it.
   **Paid on 2026-10-13 (assumed round):** the rule is `identifierKind` in
   `src/utils/identifier.ts`, the shared pure helpers, and the account row reads it from there — so
   the answer to *where it lives* is the first of the two options, and one rule now answers for both.
5. **A new screen or a new state is measured before it ships.** If §1 answers “a screen of its own”,
   it is app-drawn, which means the design file gains a frame or the screen is recorded as one the
   design never drew (the way the sign-in screen and the saved-plan screen are) — and either way it
   enters the harness's screen list with its own copy and line counts, and its unit test states what
   it renders in both languages (the pattern of every app-drawn screen).
   **Done in the assumed round, in the shape that answer needs:** the phone state is a second entry
   (`04b`) whose `open` walks screen 03's phone path, because the destination lives in the process and
   cannot be seeded into a URL — and the walk in `e2e/accessibility.spec.ts` carries a number from
   screen 03 into the state and reads its accessibility tree. The harness change is the general one:
   a screen entry may now be reached by a journey (`Screen.open`).
6. **The wait's half is one constant and one contract.** §4's answers land on
   `RESEND_COOLDOWN_SECONDS` (`src/features/onboarding/domain/verification.ts`, with the comment that
   says the number is ours and needs this confirmation), on `useCountdown`'s reset, and on the
   `onResend` contract the route supplies — a restart-on-confirmed-send answer needs the caller to
   hand back a result, which is an interface change rather than a number.
7. **PROJECT.md.** Update open question 20 (the whole of it, including the phone sign-in half found on
   2026-10-12), any open question a §3 answer touches, and this ADR's row in
   [docs/adr/README.md](README.md) and PROJECT.md's decision table as its sections fill. If an answer
   creates a claim family the copy audit does not yet scan — an identifier claim, as opposed to
   ADR-048's delivery family — it is added there with its keys on the ledger *and* its planted
   original, or recorded as a named gap.
      **One line of an accepted ADR is amended by this, and it is said here rather than
   silently:** ADR-048 §3's “the screen title stays as it is” held while the title was printed
   whatever the destination was; §3.1 below now draws it only for an address. The string ADR-048 kept
   is untouched — what changed is when it is drawn — and ADR-048's status block records the
   amendment, because an accepted ADR's decision is never rewritten to fit a later one
   ([ADR rules](README.md)).
   **Half of that is done ahead of any answer, on 2026-10-13**, because the family ships rather than
   waits: `identifier-is-an-address` in `src/config/__tests__/copy-claims.test.ts`, with
   `onboarding.verification.title` and `onboarding.verification.changeEmail` on the ledger and both
   languages plus a rewording of each shape planted. [docs/copy-claims-audit.md](../copy-claims-audit.md)
   row 14 is its index, and names the two directions that stay gaps. So the sentence in *Context*
   above — that “Verify your email” on a phone journey is “a gap no guard covers” — was true until
   that day; the family covers it now, and the copy that made the claim is fixed at the slots above
   (the frame's title is drawn only where it is true), which turns row 14 from *recorded and open*
   into *fixed* while leaving the owner's answer owed.

## Decision

### 1. Which screen a phone sign-up sees — questionnaire §1 (design owner)

**1.1 Which screen does a phone sign-up see — frame 04, or a screen the design has not drawn?** The
three shapes are one screen whose copy follows the destination, frame 04 kept as drawn with the
departure recorded, or a phone verification screen of its own. The answer decides how many screens
exist to measure, translate and keep in step, and — for the third shape — whether the design file has
to contain it before anything is built.

> **Assumed 2026-10-13 — the repository's answer, not the design owner's.** **One screen whose copy
> follows the destination.** Frame 04 stays the screen, and the two strings that name the account's
> identifier — the title and the action back to the field — take the words of whichever identifier
> the destination is, with the frame's foot card drawn on the email journey only (§3). One screen to
> draw, measure and keep in two languages; the copy change is what the answer costs, and §3 says
> which strings. Rejected above: a second screen needs a frame the design file does not have.

**1.2 What does the design file give us to build that screen from?** A second frame beside `5:22840`, a
text layer or a note in the file, or nothing yet and the state left open. What we may not do is compose
the phone state ourselves (AGENTS.md §8) — so “nothing yet” is a real answer, and it is recorded as the
phone state still unanswered rather than as a licence to improvise.

> **Assumed 2026-10-13 — the repository's answer, and the one with a cost to state.** **Nothing yet:**
> the file draws the email state only. So the two strings this state needs are the app's own, written
> as the assumed answer and recorded as a **departure from the frame**
> ([docs/design-source.md](../design-source.md) “Screen 04”), and the frame keeps its authority over
> everything the state it draws contains. The frame's 36 px `mail-check` glyph is deliberately left
> alone on both states: choosing another one is a drawing rather than a wording, and there is no
> phone frame to take it from. That is the one part of this state the assumption does not touch.

### 2. Which screen a phone sign-in sees — questionnaire §2 (owner and design owner)

**2.1 Does a returning user who typed a number arrive on the screen a sign-up walks?** Today they do,
because signing in is *one screen plus frame 04* (ADR-034) — an outcome decided for the journey, not
for a phone identifier. The answers on the table: one screen for both journeys, a sign-in version of
the screen, or the same screen with the difference recorded and nothing drawn. The third needs a
sentence in PROJECT.md saying the returning user reads sign-up words on purpose.

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **One screen for both journeys**,
> which is today's behaviour made deliberate: a returning user who typed a number walks screen 04
> with the number's own title and change action, because §2.3 makes the **identifier** the fact the
> copy follows. A sign-in version of the screen would be a second set of strings to translate and
> measure for a sentence that is already true of both.

**2.2 Must anything on the screen say which journey the picker is on?** The same screen is step four of
five for someone creating an account and the last step for someone signing in (ADR-034 §2.1), and its
eyebrow (“ONBOARDING · 04 / 05”) and eyebrow-only status are the app's, not the frame's. If the answer
is yes, that is a string per journey and one more measurement; if no, the difference between the two
readers stays invisible, which is today's behaviour.

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **No.** Nothing on the screen says
> which journey the picker is on: the eyebrow is app-side and steps-agnostic (it says 04 / 05 for both,
> as it does today), and the words that differ are about the destination, not the journey. The step
> count in that eyebrow is already the app's own and is not re-asked here.

**2.3 Do the two sign-in branches — a number and an address — differ from each other on this screen?**
This is the answer that says what §3's branch hangs on: the **journey** (a returning user sees one
state whatever they typed) or the **identifier** (a number and an address see different words). It is
asked because the two are independent, and picking one by accident is the defect this document exists
to prevent.

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **The identifier.** An address and
> a number see different words, which is what makes §2.1's single screen honest for both journeys and
> both identifiers at once. Implementation follows: the fact is read where the flow already holds it
> (the destination the route is about to hand the screen) and **passed to the screen as a prop**, not
> derived from the string inside the component — so an answer that later moves the branch to the
> journey or to the transport that answered changes a caller and not a component.

### 3. What the copy says when the code travels by SMS — questionnaire §3 (design owner)

The frame's own words, and the only part of this skeleton whose answers are pure wording. ADR-048 §2
already records the branch **sentences** (the heading and the supporting line) and is not reopened.

**3.1 What does the screen's title say when the destination is a number?** “Verify your email” is the
frame's title, printed whatever was typed. The answers: a title per identifier, one title that fits
both, or the frame's title kept with the reason recorded. A per-identifier title is a new key
(`onboarding.verification.title` growing a sibling), a neutral title is a change to a measured string,
and keeping the frame's words leaves the one claim on the screen that is simply wrong for a phone
journey — which is worth recording explicitly if that is the answer.

> **Assumed 2026-10-13 — the repository's answer, not the design owner's.** **A title per identifier.**
> A new key `onboarding.verification.titlePhone` (“Verify your number” / “Vahvista puhelinnumerosi”)
> is drawn when the destination is a number; `onboarding.verification.title` keeps the frame's own
> words and is now drawn **only** when it is an address, so the frame's title is no longer printed
> over a number. The frame's string is untouched, which is why this shape was chosen over one title
> that fits both: that would edit a measured frame string to say something the frame does not say.

**3.2 What does the action back to the identifier say when the destination is a number?**
`onboarding.verification.changeEmail` is the frame's wording and the picker's only way back to the
field they filled. A phone version, one wording for both, or the frame's words with the reason
recorded; the answer also decides whether the route's `onChangeDestination` keeps meaning “back to the
form” for both journeys, which is what it does today.

> **Assumed 2026-10-13 — the repository's answer, not the design owner's.** **A phone version:**
> `onboarding.verification.changePhone` (“Change phone number” / “Vaihda puhelinnumero”), drawn for a
> number, with the frame's `changeEmail` drawn only for an address. The route's `onChangeDestination`
> keeps meaning “back to the field” for both journeys — it is one destination the picker has already
> filled, and the words it is labelled with are the only thing this answer changes.

**3.3 Does the card at the foot stay on a phone journey, change hands, or go?**
`onboarding.verification.phoneNote.*` is the frame's only mention of the phone path, and a phone
sign-up is the one reader it was not written for. “Email journey only” is a branch on the same fact as
§3.1 (so the two answers should agree on what the branch is), “both” is today's behaviour recorded, and
“go” removes a card and its two keys from both catalogues.

> **Assumed 2026-10-13 — the repository's answer, not the design owner's.** **Email journey only**,
> which is the same fact §3.1 branches on: the card asks whether the reader signed up by phone
> *instead*, and on a phone journey it would ask the picker about themselves. Nothing new is written —
> the two keys keep their words and are drawn on the email state; “go” was rejected because the card
> is the frame's only mention of the phone path, and an email picker is exactly the reader it was
> written for.

**3.4 How is the destination printed when it is a number — as typed, or masked?** The supporting line
names the destination, and ADR-048 §2 records that as the thing it may not lose. Masking is the app's
own rule rather than the frame's, so it needs the owner's word; an answer of “masked” is a pure
function over the identifier (testable in `domain/`, no I/O) applied where the line is rendered, and a
note in the privacy documentation saying why a number is treated differently from an address.

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **As typed**, which is what the
> screen does today and what the frame draws for an address: the line exists so the picker can see
> which account the code belongs to, and it is on the screen the picker is looking at, never logged
> and never sent anywhere (no transport exists). Masking needs a rule that treats a number differently
> from an address, and no decision has been made that would justify one.

### 4. The wait behind a resend — questionnaire §4 (owner)

**4.1 How long does the resend wait run, and who decides it?** `RESEND_COOLDOWN_SECONDS` is 60 by this
repository's choice, the frame's own `00:28` fits inside it, and a service that sends its own codes
usually paces them — so the answer is either a number we keep, a number the service reports, or the
row's absence recorded as the whole of it while no transport exists (ADR-048 §4). A service-reported
wait changes where the constant lives: the screen would render a value the caller supplies rather than
one it holds.

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **The row's absence is the whole
> of it while no transport exists** (ADR-048 §4, already decided and untouched here): neither the
> action nor the wait is drawn, so the 60 seconds paces nothing a user can reach. The constant stays
> where a service that reports its own window can replace it.

**4.2 What does a failed resend do to the wait?** Today the wait restarts the moment the action is
used, which cannot tell a send on its way from a send that failed. Restart-on-confirmed-send is an
interface change (`onResend` returning a result the screen can read); ending the wait on failure is a
behaviour with a security cost to state, because a resend with no wait is a way to make the service
send on demand (SECURITY.md §3), and `docs/demo-and-stand-ins.md` and the screen's test both pin
whichever answer arrives.

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **Nothing yet: the question is
> deferred with the row it belongs to.** A failed resend cannot happen while no caller can send one,
> and both answers are interface changes to a row that is not drawn. The screen's existing behaviour —
> restart on use — stays written down as what returns with the row, and the security cost of the
> alternative stays recorded with it.

### Anything else — questionnaire §E-else

> **Assumed 2026-10-13 — the repository's answer, not the owner's.** **One thing to add, because the
> assumption met it:** the 36 px symbol tile is the frame's `mail-check` glyph on **both** states. A
> number's journey shows the mail glyph beside “Verify your number”, which is the same kind of
> mismatch the copy answers just fixed, and swapping it is a drawing the design file does not contain
> — so it is recorded here rather than invented, and §1.2's answer above says the same thing from the
> other side.

## What no answer can change

Recorded so that an answer arriving under time pressure cannot be transcribed into something the code
or the owner's own decision already contradicts:

- **No string claims a message the app sent** (ADR-048). An answer here may name the destination and the
  step; it may not put a send, an inbox or a code on its way into the copy, in either language, until a
  transport exists.
- **The destination stays named.** The supporting line exists so the picker can see which account the
  code belongs to, which no other line on the screen carries; a §3.4 answer may mask it and may not
  remove it.
- **Whether a code is acceptable is not this screen's question.** The screen collects the code and hands
  it to the session port (ADR-027, ARCHITECTURE.md §3.2); no copy answer and no branch here turns a
  client check into an authorisation.
- **Nothing sends until a service, a region, a processor, a DPA and a lawful basis exist**
  (SECURITY.md §17; PROJECT.md questions 3, 15 and 16, recorded in ADR-033) — and an SMS transport adds
  a message to a number the picker typed, which is personal data leaving the device with its own basis.
- **The consent control's shape is not reopened.** ADR-020/ADR-047's on-device consent and its wording
  are settled; a phone journey changes nothing about screen 05.
- **The frame's expiry note stays** (“The code expires in 10 minutes. Don't share it with anyone.”):
  ADR-048 §3 records it as the rule of the code being entered, and no answer here is about that.

## Alternatives considered

Nothing is chosen by this ADR, so the alternatives are the ones the answers are chosen *against*.
Record here, per area, the option that was passed over and the reason given — a rejected alternative
with a reason is what makes a later reversal cheap to argue:

- **A screen of its own for a phone journey** (§1.1) and **a sign-in version of this one** (§2.1) were
  both passed over for the same reason: each needs words nobody has written or a frame nobody has
  drawn, and would double the strings to translate and measure for a screen whose shared sentences are
  already true of both identifiers. The assumed round's whole cost is two keys per language.
- **One title and one change action for both identifiers** (§3.1, §3.2) was passed over because it
  either edits the frame's own measured string or stops the line saying *which* account the code
  belongs to — the one fact that line carries, and the reason the frame names a destination at all.
- **Bringing the resend row back without a transport** (§4.1, §4.2) was passed over because asking for
  another code *is* that row's whole meaning (ADR-048 §4): it would be a control that cannot act, and
  the wait it paces would be the claim rather than a rule.

## Consequences

- **2026-10-13 — the assumed answers are built.** Two keys per language
  (`onboarding.verification.titlePhone`, `onboarding.verification.changePhone`); the branch itself in
  the screen, which is handed `destinationKind` rather than deriving it (§2.3); the frame's foot card
  drawn on the email journey only (§3.3); §4's cost paid, because two features now need the rule that
  tells the identifiers apart — `identifierKind` lives in `src/utils/identifier.ts`, the shared pure
  helpers, and the account row that needed it first reads it from there
  ([ARCHITECTURE.md](../../ARCHITECTURE.md) §2); a second entry in the layout harness, reached by
  walking screen 03's phone path, so the new strings are measured in both languages at both text
  sizes (`04b`); a walk in the built app that carries a number from screen 03 into the state and reads
  its accessibility tree; and the copy audit's family turned from *recorded and open* to *fixed*,
  because the frame's title is now drawn only where it is true.
- **What the assumption does not touch:** the 36 px `mail-check` glyph on both states (§E-else), the
  design file's authority over the state it draws, and the audit's second named gap — a number named
  where the account may hold an address, which no shipped string does and no guard scans.
- **The owner's answer supersedes the assumed one, slot by slot.** The wording each slot now carries
  is this repository's reading, not a decision anyone made: an answer that differs replaces it at that
  slot (and a difference that changes a *screen* rather than a string is a new ADR, per the
  [ADR rules](README.md)).
- **Whatever the answers turn out to be:** the delivery claim stays closed, the destination stays
  named, and the resend row still does not ship before a caller can send a code.
- **An answered §1 and §2 unblock a copy change, not a service.** This is the difference between this
  skeleton and ADR-033's: the wait for a real transport is unaffected, so a full set of answers makes
  screen 04 honest for a phone identifier *today* and leaves the send itself where it was.
- **The assumed answer's trade, stated as a trade.** “Frame 04 as drawn, one state” was the cheapest
  option in string count and the only one that edits nothing — and it leaves the title and the way back
  to the field naming an address the account does not have, which is the claim row 14 was added for. The
  assumed round bought the honest state for **two keys per language**, a branch in one component, a
  second harness entry and a walk; a phone screen of its own would have cost a frame the design file
  does not contain. That trade is still the owner's to confirm or reverse, which is why the
  questionnaire lists the options as real ones rather than straw men.
- **An assumed answer is not an answer.** §1–§4 are filled here so the screen could be built, and
  every slot says so in the same words: this repository wrote it, the design owner and the owner still
  owe it, and a real answer replaces it. What an assumption cannot do is close the question — PROJECT.md
  open question 20 stays open, and the questionnaire still asks it.
- **ADR-048's branch sentences are the day-one edit.** When a transport exists, the heading and the
  supporting line change from ADR-048 §2 whether or not §3 here is answered; §3 is what surrounds them.

## Related

- [to-questionnaire-verification.md](../../to-questionnaire-verification.md) — the ask this ADR records
- [to-questionnaires-response-sheet.md](../../to-questionnaires-response-sheet.md) — the same questions
  as `E1.1`–`E4.2`, and the one artifact that can carry every answer back at once
- [ADR-048](ADR-048-the-verification-copy-claims-no-delivery.md) — the branch sentences and the resend
  row's absence, which this skeleton assumes rather than reopens; its §3 title sentence is the one line
  this record's §3.1 amends, and its status block says so
- [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md) — the reading that sends a
  returning user to this screen, and §1.4/§1.5's still-open states
- ADR-027 (the stand-in code), ADR-018/ADR-019 (the measurements), ADR-020/ADR-047 (the consent, whose
  copy stays as it is)
- PROJECT.md — open question 20, and known issues 24 and 27 (the stand-in's disclosure and the
  account row's “verified” claim, neither of which this record decides)
- [docs/design-source.md](../design-source.md) — screen 04 as extracted, and the six deviations it
  now records: ADR-048's five, and the phone state this record's assumed answers wrote
- The other skeletons: [ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) (the first
  backend slice), [ADR-035](ADR-035-shared-spots-the-frame-and-the-sharing-model.md) (shared spots),
  [ADR-036](ADR-036-the-zone-service-what-it-must-return.md) (the zone service)
