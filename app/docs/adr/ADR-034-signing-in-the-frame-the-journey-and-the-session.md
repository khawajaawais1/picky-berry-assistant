# ADR-034 — Signing in: the frame, the journey and the session — the answers, recorded in one place

- **Status:** **Recorded in part (2026-10-11).** §1.1, §1.2, §1.3, §1.6, §1.7, §2.1 and §1.5 are
  answered and the sign-in screen is built from them; §1.4 and §2.2–§4 are still `> _pending_`, and
  each keeps the thing it decides unbuilt rather than defaulted. The ADR becomes `Accepted` when
  §1–§4 are answered or explicitly deferred. **The credential was re-cut on 2026-10-24**: the screen
  now collects email + password instead of an identifier + code, and lands in the app as before
  ([ADR-059](ADR-059-email-password-replaces-the-code-screen.md)). **§1.5 was answered on
  2026-10-24** ([ADR-062](ADR-062-password-reset-belongs-to-the-provider.md)): v1 has a recovery
  path, the provider owns it, and the sign-in screen now draws the action.
- **Date:** 2026-10-11 (skeleton and first answers). Each recorded answer carries the date it arrived.
- **Deciders:** the Figma design owner (questionnaire §1) and the project owner (§2–§4) — covering
  PROJECT.md open questions 12 and 25, the lawful-basis sentence question 15 owes the session's own
  field, and known issue 29. This repository writes the slots and records the answers; it decides
  none of them, and an unanswered slot keeps the screen unbuilt rather than defaulting.

## Context

The app has no way for an existing user to sign in. Frames 01 and 03 both draw an “Already have an
account? Sign in” link, and both are rendered as labels rather than buttons — `TextAction` claims no
role without a handler, and both routes deliberately pass none because no sign-in screen exists
([src/app/index.tsx](../../src/app/index.tsx), [src/app/create-account.tsx](../../src/app/create-account.tsx),
and the component's own contract).

What exists behind the link is the **session seam**: one port (`signIn`, `current`, `signOut`) with a
stand-in provider behind it ([ADR-028](ADR-028-an-authentication-seam-behind-a-port.md)), an in-memory
store ([ADR-006](ADR-006-secure-credential-storage.md)'s secure-storage adapter is deliberately not
built), a one-hour `SESSION_LIFETIME_MS` taken from the decided provider's own token length rather
than from a product decision ([ADR-013](ADR-013-identity-provider.md)), and one stand-in verification
code accepted outside production builds only ([ADR-027](ADR-027-a-stand-in-verification-code.md)).
Frame 14's sign-out control is built and means more than the frame says — it deletes the device's
consent, queued reports and saved plan as well as the session — and that is the repository's
assumption, not the owner's decision (known issue 29, open question 25).

Three readings of the missing screen were built and left running so §1 can be answered by looking
(`npm run prototype:sign-in`, opening `?variant=A|B|C` on the create-account route): a returning user
is a **code** (A, the code screen that already exists), a **credential form** (B), or a **remembered
device** (C). They are throwaway code with hard-coded English, ignored by a production build, and
gone once one of them wins. The questionnaire is where they are chosen between.

**This skeleton exists before the answers for the same reason
[ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) does:** an answer that arrives
as a reply has to become a recorded decision the same day, without re-deriving which screen, store,
service, test or open question it changes. That work is enumerated once, below.

Two things this file is not. It is **not a decision**: nothing is chosen here, and reading a filled
slot as a recommendation would be wrong — the designer's and the owner's words are the decision,
transcribed. And it is **not a rewrite of ADR-013, ADR-027 or ADR-028**: the provider, the seam and
the stand-ins stand until the account service lands; an answer that contradicts one of their
assumptions is recorded here and noted in that ADR's status block, never by editing its decision text
(the [ADR rules](README.md)).

## How this skeleton is filled in

1. **Answer to slot.** Paste the answer at its `> _pending_`, verbatim, with the date. Partial and
   per-question answers stay partial: an answered question and a deferred one are both recorded, and
   a deferred slot stays `pending` rather than being guessed. An answer that fits no slot is recorded
   under *Anything else* below and becomes a constraint on the decision. The section numbers are the
   questionnaire's own; the [response sheet](../../to-questionnaires-response-sheet.md) prefixes them
   with this part's letter (`A`), so §1.1 arrives as `A1.1`.
2. **§1 is a design decision, so the design side moves first.** The answer decides whether a frame is
   added to the file — and to the screen inventory in [docs/design-source.md](../design-source.md) —
   or frame 03 grows a second mode; the winning reading is built, the losing two are deleted
   (`src/features/onboarding/components/prototype/sign-in-variants.tsx` and the `?variant=` branch in
   [src/app/create-account.tsx](../../src/app/create-account.tsx)), and the screen is measured by the
   layout harness in both languages and at the largest text size (ADR-018/019 — the harness's screen
   list is `SCREENS` in [e2e/layout.spec.ts](../../e2e/layout.spec.ts)). §1.1's answer was *the app
   draws it*, so the harness holds it to what a frame-less screen can be held to (its own unit test
   carries the copy), and the two losing prototype readings are deleted with the switch that mounts
   them — which is shared with the community map's own three readings, so that deletion waits on
   that question too (PROJECT.md, known issue 23).
3. **§3 and §4 change code, test-first.** Where the session lives and how long it lasts decide what
   the store port holds behind it — [ADR-006](ADR-006-secure-credential-storage.md)'s secure-storage
   adapter, which lands with the first real token — and what `SESSION_LIFETIME_MS` becomes. What
   signs a user out decides what [src/services/sign-out.ts](../../src/services/sign-out.ts) means
   beyond dropping the session (known issue 29's two open halves), with the store's cases in
   `src/services/session/__tests__/store.test.ts` and the port's in
   `src/services/session/__tests__/stand-in-port.test.ts` moving first. If §4.1 answers “through our
   own backend”, [docs/api-contract.md](../api-contract.md) gains the account and session endpoints
   and the token-refresh path, and open question 12 closes with them.
4. **The links are wired when the screen exists — done, 2026-10-11.** The two `TextAction`s
   (welcome and create-account) carry handlers that open `/sign-in` and record which journey asked for
   the code (`rememberSignInRequest`, ADR-038 for the name the journey has none of); the layout
   harness still asserts the design's copy on both frames. A production build still accepts no
   stand-in code (ADR-027).
5. **PROJECT.md.** Update open questions 12 (where a submitted account goes) and 25 (session
   lifetime, storage, what signs a user out), and — for a session that outlives the process — the
   lawful-basis sentence question 15 owes every stored field. Known issue 29 narrows to whatever the
   owner confirms, and this ADR's row moves from *Proposed* to *Accepted* in
   [docs/adr/README.md](README.md) and in PROJECT.md's decision table as its sections fill.
6. **What is deliberately not here.** Biometric unlock (§1.7) and a remembered last-used identifier
   (§1's reading C) are personal-data questions as well as design ones: the prompt itself never tells
   the app which factor was used, but a remembered identifier is a field whose basis question 15 must
   carry, and an answer that drops reading C deletes it.

## Decision

### 1. The screen and the frame — questionnaire §1 (design owner)

The three readings in one line each, so a recorded answer is readable next to the paper it was chosen
from: **A** signs in with the code screen that already exists — one identifier field, six digits, and
frame 04 becomes a screen two journeys walk; **B** is a credential form — both identifier chips, a
password with reveal, recovery and sign-up sharing a row; **C** is device-first — one remembered
account, a biometric prompt as the primary action, a password behind a link. Two things are the same
in all three: the way in is what frames 01's and 03's links open, and the screen sits outside the app
shell, as frames 01–05 draw no bar.

**1.1 A frame of its own, or a second mode of frame 03?** It decides which frame the built screens
are measured against, and whether the design file grows a screen or a mode.

> **A screen of its own, and the app draws it** *— recorded 2026-10-11.* Signing in is its own route
> (`/sign-in`) rather than a second mode of frame 03, and the design file does not grow a frame: the
> screen is app-drawn, so its copy is this repository's, reviewed here and measured like the list
> behind frame 14's “Saved spots” row ([ADR-030](ADR-030-the-saved-plan-gets-a-screen.md)). What the
> answer settles is §1.1's own question — one screen and one route, not a mode — and what it leaves
> open is what the screen *looks* like should the designer ever draw it.

**1.2 What identifies a returning user: email, phone, or both?** Frame 03 already offers both
identifiers, so this decides how many fields the frame carries and whether the identifier is typed or
picked — and, with §4.1, how the identifier mode maps onto the provider's flow.

> **Either one, in one field** *— recorded 2026-10-11.* The screen carries frame 03's identifier
> field and neither of its two mode chips: one field, and the address or number typed into it is what
> the code is sent to. The app does not validate which of the two it is (no client check is an answer
> — SECURITY.md §3), and the account row reads back which one was verified from the identifier's own
> shape (`isEmailIdentifier`).

**1.3 Where is the way in, and what does it say?** Frames 01 and 03 each draw their own link with
slightly different words; if one link is enough, one of the two strings goes.

> **Both frames' own links open it, each keeping the design's words** *— wired 2026-10-11; the
> wording question stays the designer's.* The two `TextAction`s now carry handlers, so both links are
> buttons rather than labels, and neither frame's string was reworded: frame 01's “Already have an
> account? Sign in” and frame 03's own link are both asserted by the layout harness exactly as the
> frames draw them. Whether one of the two strings should go is still the designer's to say — a copy
> change to a frame, not a wiring decision, and the app follows whichever the frames hold.

**1.4 Which states must the frame draw?** Empty, being typed, signing in, wrong credentials, locked
out or rate-limited, no connection — a frame that draws only the empty state leaves the error
treatment to be invented, which is the thing the repository may not do.

> _pending — questionnaire §1.4_

**1.5 Is there a recovery path in v1 — a “forgot password” action — or deliberately none?** No frame
contains its destination, and provider-side recovery is ADR-013's to configure, not ours to build.

> **The owner's answer (2026-10-24):** v1 has a recovery path, and it is the provider's. The
> sign-in screen draws a “Forgot password?” action; the app asks the provider to send its reset link
> to the account's address, the provider hosts the email and the new-password page, and the app
> draws no new-password screen and handles no reset token. The request screen is app-drawn because
> the design has no reset frame, and keeps the sign-in screen's framing. Recorded, with the
> stand-in's honest no-email note, in
> [ADR-062](ADR-062-password-reset-belongs-to-the-provider.md).

**1.6 Does this screen carry the app shell, or sit outside it like onboarding?** It decides whether
the bar is drawn here, as frames 01–05 draw none.

> **Outside it** *— recorded 2026-10-11, and it is what all three readings already assumed.* The
> route sits at the app's root rather than under `(app)`: a returning user is not inside the app until
> the code is accepted, so the screen draws no core navigation and the flow behind it continues to
> frame 04 (screen 04) before anything in the shell is reached.

**1.7 Is biometric unlock (Face ID / fingerprint) in v1 or out?** The prompt is the OS's and the app
is never told which factor answered; saying yes commits the flow to reading C's device-first shape,
saying no deletes that reading.

> **Out of v1, by the reading §1.1 chose** *— recorded 2026-10-11.* Reading C (the remembered device
> with a biometric prompt) was not the one chosen, so no remembered identifier is kept on the device
> and the screen draws no prompt. This is the choice of §1.1 read to its end rather than a separate
> answer: if the designer wants a biometric unlock, it arrives with a design for it and a lawful basis
> for the identifier it would keep.

### 2. The returning-user journey — questionnaire §2 (owner)

**2.1 After signing in, where does the user land?** Someone with an account may or may not have been
through location consent on this device, and may already hold saved zones and queued reports on it.

> **In the app, not on screen 05** *— recorded 2026-10-11.* A returning user is not signing up: the
> same code screen (frame 04) serves both journeys, and what the flow carries decides where it ends.
> A sign-up continues to screen 05, while a sign-in lands in the app — the app shell's own screens,
> which the user reaches with the session the window is about. The device's own records (the consent,
> the plan, the queued reports) are untouched by signing in: they belong to the phone, not to the
> account (known issue 29).

**2.2 What should happen for a user who signs in on a second device?** It decides what, if anything,
travels between devices beyond the account itself — nothing does today.

> _pending — questionnaire §2.2_

**2.3 What does the app do when the session has expired while the user is mid-walk** — an active
visit, or a report waiting to be sent? It decides whether a stored report survives a sign-out, which
is personal data either way.

> _pending — questionnaire §2.3_

**2.4 What, if anything, must a user be able to do without an account at all?** It draws the line
between what onboarding already allows and what the account gates.

> _pending — questionnaire §2.4_

### 3. What survives a restart — questionnaire §3 (owner)

**3.1 Where does the session live on the device, and how long does it last?** [ADR-006](ADR-006-secure-credential-storage.md)
puts credentials in platform secure storage and nowhere else, and [ADR-020](ADR-020-record-consent-on-device.md)
records consent on the device; the session record has to be a decision, not whichever default the
library ships with. Today a **stand-in** answers both halves — memory for the length of the process,
good for an hour (ADR-028) — so nothing here is decided yet and no answer is foreclosed.

> _pending — questionnaire §3.1_

**3.2 What signs a user out: a control on a screen, an expiry, a revoked account, or all three?**
Frame 14's sign-out row is built and deletes what the device holds of the picker's (the consent, the
queued reports, the saved plan) before landing the user on the front door — an assumption the owner
has not confirmed (known issue 29). This answer now decides two things: whether those device records
should really go with the account, and what else signs a user out.

> _pending — questionnaire §3.2_

**3.3 Must a failed sign-in distinguish “wrong password” from “too many attempts”, or does one
message cover both?** Telling the two apart leaks whether an address has an account; collapsing them
leaves a real user retrying forever — a security call and an accessibility one at once.

> _pending — questionnaire §3.3_

### 4. The service behind it — questionnaire §4 (owner)

**4.1 Does the app talk to Firebase Authentication directly (ADR-013), or through our own backend —
and who owns that choice?** Open question 12. It shapes the API contract, where the session token is
refreshed, and what the app can honestly promise while offline.

> _pending — questionnaire §4.1_

**4.2 Which of our servers, if any, must know that a sign-in happened?**

> _pending — questionnaire §4.2_

### Anything else — questionnaire §A-else

An answer that names code, copy or a screen no section above holds.

> _pending — questionnaire §A-else_

## What no answer can change

Recorded so that an answer arriving under time pressure cannot be transcribed into something the
code already contradicts. Each is decided elsewhere, and a change to any of them is a new ADR rather
than this one's content:

- **A valid token proves identity, never privilege** ([ADR-013](ADR-013-identity-provider.md), decision 3).
  Roles, ownership and eligibility are ours, stored and enforced server-side; no session shape this
  ADR records changes that ([SECURITY.md](../../SECURITY.md) §3).
- **No credentials are stored by us** (ADR-013, decision 4). The app may draw a password field only
  where the provider checks it; verification, reset, lockout and MFA stay the provider's.
- **Credentials never in plain storage** ([ADR-006](ADR-006-secure-credential-storage.md)): a session
  that survives a restart goes to platform secure storage — never AsyncStorage, a file, a log or a
  URL — and the store port is the one place that changes.
- **The stand-ins are not lifted by this ADR.** ADR-027's `000000` code and ADR-028's stand-in
  provider end when the account service lands, not when these questions are answered.
- **The client is never the check.** A screen that appears to sign in on its own is wrong; the server
  decides ([SECURITY.md](../../SECURITY.md) §3).

## Alternatives considered

Nothing is chosen by this ADR, so the alternatives are the ones the answers are chosen *against*, and
three of them already exist as running paper (readings A, B and C). Record here, per area, the option
that was passed over and the reason given — a rejected alternative with a reason is what makes a
later reversal cheap to argue:

> _pending — the frame and the journey · questionnaire §1.1_

> _pending — the session's home and lifetime · questionnaire §3.1_

> _pending — direct, or through our own backend · questionnaire §4.1_

## Consequences

- **Today:** one file that turns a reply into a record the same day. Nothing else changes — no frame,
  no route, no persisted token, the links stay labels, the stand-ins stay, and a production build
  still cannot sign anyone in.
- **Whatever the answers are:** the seam stays a port, the provider decision stands, and any screen
  built from the answer is measured in both languages and at the largest text size before it ships.
- **An answered §1 is still not a working sign-in.** The account service does not exist (the ADR-027
  and ADR-028 stand-ins), no token is persisted (ADR-006's adapter is unbuilt), and a real sign-in
  waits on §4.1's answer like everything else here.
- **Three of these answers are security calls, not preferences:** what signs a user out (§3.2),
  whether a failure distinguishes wrong credentials from rate-limiting (§3.3), and whether a
  remembered identifier is kept (reading C). Each is recorded with its reason rather than dropped.
- **The cost of an unanswered section is that it gets asked again.** An unrecorded answer is not a
  deferred decision; it is a decision someone has to re-make, and the screen stays unbuilt in the
  meantime.

## Related

- [to-questionnaire-sign-in.md](../../to-questionnaire-sign-in.md) — the ask this ADR records
- [to-questionnaires-response-sheet.md](../../to-questionnaires-response-sheet.md) — the same
  questions as `A1.1`–`A4.2`, and the one artifact that can carry every answer back at once
- [ADR-013](ADR-013-identity-provider.md) (the provider), [ADR-027](ADR-027-a-stand-in-verification-code.md)
  and [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the stand-ins that end when the
  account service lands), [ADR-029](ADR-029-the-session-carries-the-accounts-name.md) (what the
  session carries), [ADR-006](ADR-006-secure-credential-storage.md) (where a token must be kept)
- PROJECT.md — open questions 12 and 25, question 15's lawful-basis half, known issue 29
- The other three skeletons: [ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md)
  (the backend slice), [ADR-035](ADR-035-shared-spots-the-frame-and-the-sharing-model.md) (shared
  spots), [ADR-036](ADR-036-the-zone-service-what-it-must-return.md) (the zone service)
