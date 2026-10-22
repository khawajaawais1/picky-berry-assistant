# Screen 04 on a phone: which screen a phone sign-up and a phone sign-in see, and what the copy says when the code travels by SMS

**Purpose:** PROJECT.md's open question 20, in the half that is a screen and its words rather than a
service. A picker who signs up — and a picker who **signs in** — with a phone number both walk screen
04 today: the frame's email state, headed “Verify your email”, with an action reading “Change email
address” and a card at the foot addressed to someone who signed up by phone *instead*. Nothing fails,
because no test and no guard looks at which identifier a screen names; and we may not invent the
screen or its wording (AGENTS.md §8), so this is the ask rather than a fix.

**From:** the mobile team (this repository), **To:** the Figma design owner (§1, §2 and §3 — they are
about a frame and the frame's own words) and the project owner (§4, and §2's journey call).
**How your answers will be used:** they become
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) — the record
that names which screen a phone identifier walks and which strings change with it — and they settle
open question 20 in [PROJECT.md](PROJECT.md).

## Context

The app is built one design frame at a time. Screen 04 (`5:22840`) is built:
[src/app/verify-email.tsx](src/app/verify-email.tsx) → `OnboardingVerificationScreen`, measured in both
languages and at the largest system text size like every other screen (ADR-018/019).

**Both identifier journeys end there.** Screen 03 offers the frame's two chips — “Email”, “Phone
number” — and both submit the same request; the sign-in screen draws one field, “Email or phone”
(ADR-034 §1.2: *either one, in one field*), and asks for a code. Both then open screen 04, which is the
reading the design owner chose: signing in is one screen plus frame 04 ([ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md),
`pending-verification.ts`'s `purpose`).

So today a picker who typed a phone number, on either journey, reads a screen that says **“Verify your
email”** as its title, offers **“Change email address”** as the only way back to the identifier, and
carries the frame's card — “Signed up by phone instead? The same six-digit step confirms a phone
number.” — on the screen the phone sign-up has just reached. The design file draws screen 04's **email**
state only, so none of those three strings has a phone version to switch to.

Two records already exist and **this document does not re-ask them**:

- **[ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md) §2 records the branch
  sentences** the day a code travels: the email branch takes back the frame's “Check your inbox.” and
  “…the code we sent to {destination}…”, the SMS branch reads “Check your phone.” and “…the code we
  texted to {destination}…”. Those are the record; §3 below asks only about the words that record did
  not touch (the title, the action back to the identifier, the card at the foot, the destination as
  printed).
- **Nothing sends a code.** There is no email transport and no SMS transport; the flow runs on the
  stand-in code [ADR-027](docs/adr/ADR-027-a-stand-in-verification-code.md) installed, and the frame's
  resend row is drawn only where a caller can send one (ADR-048 §4), so screen 04 ships without it
  today. §4's wait is the wait a transport will pace — asked now because the constant is currently
  this repository's guess.

Deferred elsewhere, and deliberately not asked here: **what identifies a returning user** (A1.2 —
answered: either one, in one field), **which states the sign-in screen must draw** (A1.4, still open —
an error and a rate-limited state belong to that document, and this one does not re-ask it), **where a
submitted account goes** (A4.1), and **where a user lands after signing in** (A2.1 — answered: inside
the app). This is the fifth document in the same send, asked of the same reader on the same deadline;
the send's rule holds here too, so a question that is already owned by another document is not asked
twice ([to-questionnaires-cover-note.md](to-questionnaires-cover-note.md), “Nothing is asked twice”).

## How to answer

By **2026-10-17** if that is workable; say so if it is not and we will move it. Roughly 10 minutes.
Partial answers and “I don't know yet” are both useful — flag anything you are unsure of rather than
leaving it blank, since a blank we cannot tell from a “no”. Write your answer under each `>`.

§1–§3 can be seen rather than imagined: in a development build, screen 03's **Phone** chip and the
sign-in screen's single field both lead to screen 04 as it stands, with the phone number where an
address would be. We can send a short screen recording instead if you would rather not run anything.
Every question below has a numbered slot in
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md) as `E1.1`–`E4.2`, which is
the one artifact that can carry the whole set of answers back at once.

## 1. Which screen a phone sign-up sees — designer

### 1.1 Which screen does a phone sign-up see — frame 04, or a screen the design has not drawn?

_Why this matters: it decides whether one screen's copy follows the identifier or there is a second
screen to draw, measure in every shipped language and keep in step from here on. The three shapes we
can build from are: **frame 04 with a phone state** (one screen, its words switching with the
destination); **frame 04 unsplit, exactly as drawn** (today's behaviour, with the email words kept and
the departure recorded rather than papered over); or **a phone verification screen of its own**, which
the design file has to contain before it is built, because composing it here would be inventing it._

>

### 1.2 What does the design file give us to build that screen from?

_Why this matters: if a phone state is what you want, the words and the composition have to come from
somewhere we are allowed to read — the frame's own text layer, a second frame beside `5:22840`, or a
note in the file. If you would rather not draw it now, say so and we will keep the email words in
place and record the phone state as still unanswered rather than improvising it (AGENTS.md §8)._

>

## 2. Which screen a phone sign-in sees — owner and designer

### 2.1 Does a returning user who typed a number arrive on the screen a sign-up walks?

_Why this matters: today they do — signing in ends on the same screen 04 the sign-up uses, because the
design owner chose “one screen plus frame 04” (ADR-034) — and that outcome was never decided for a
phone identifier: the returning picker reads the sign-up's words, the sign-up's eyebrow
(“ONBOARDING · 04 / 05”) and a card about signed-up-by-phone. The shapes: **one screen for both
journeys** (its words follow the journey and the identifier), **a sign-in version of the screen**, or
**the same screen for both, with the difference recorded** and no second screen to design._

>

### 2.2 Must anything on the screen say which journey the picker is on?

_Why this matters: the same screen is step four of five for someone who is creating an account — which
continues to screen 05 — and the last step for someone signing in, who lands inside the app (ADR-034
§2.1). If the screen must say which, that is a string per journey and one more thing to translate; if
it need not, one screen serves both and nothing on it announces the difference._

>

### 2.3 Do the two sign-in branches — a number and an address — differ from each other on this screen?

_Why this matters: it decides what the branch is. If a phone sign-in and an email sign-in see the same
screen, the branch in §3 belongs to the **journey** (this is a returning user) rather than to the
identifier, and the design needs one state instead of two._

>

## 3. What the copy says when the code travels by SMS — designer

The three strings below are the frame's own, and they are the ones no branch has a version of yet; the
fourth question is how the line that names the destination is printed when it is a number. The
sentences a branch *does* have — the heading and the supporting line — are already recorded in
ADR-048 §2 and are not asked again here.

### 3.1 What does the screen's title say when the destination is a number?

_Why this matters: “Verify your email” is the frame's title and the screen prints it whatever the
picker typed, so on a phone journey it does not name a claim too strong for the app — it names the
wrong subject outright. It is also the kind of claim the copy audit of 2026-10-12 could not catch:
that audit cleared claims about a message being sent (ADR-048), and this one is about which
identifier the account has. Options: a title per identifier, one title that fits both, or the frame's
title kept with the reason written down._

>

### 3.2 What does the action back to the identifier say when the destination is a number?

_Why this matters: “Change email address” is the frame's wording, and it is the only way back to the
field the picker filled in. A phone journey's version names a number instead; one wording covering
both is possible; keeping the frame's words is a third answer, and it needs the reason recorded
because a reader who typed a number is being told to change something else._

>

### 3.3 Does the card at the foot stay on a phone journey, change hands, or go?

_Why this matters: “Signed up by phone instead? The same six-digit step confirms a phone number.” is
the frame's only mention of the phone path, and on a phone sign-up it answers a question that picker
did not ask — while an email journey is exactly who it is written for. So the honest answers are: the
card belongs to the email journey only; it stays on both because the screen has nothing else to say
about the other path; or it goes, and the app says nothing about the other path at all._

>

### 3.4 How is the destination printed when it is a number — as typed, or masked?

_Why this matters: the supporting line names the destination so the picker can see which account the
code belongs to, and ADR-048 §2 records that as the one thing that line is not allowed to lose. A
phone number is more identifying on a screen than an address is — a shoulder, a screenshot and a
shared screen all read it — so a masked form (`+358 ••• 45 67`) is a defensible answer, but it is the
app's own rule rather than the frame's, which means your word rather than ours._

>

## 4. The wait behind a resend — owner

### 4.1 How long does the resend wait run, and who decides it?

_Why this matters: frame 04 catches a waiting resend mid-flight (“Resend code · available in 00:28”)
and never says how long the wait is, so the app's 60 seconds (`RESEND_COOLDOWN_SECONDS`) is this
repository's guess — and a send that has its own retry window makes the service's answer the honest
one, which is a call for whoever owns the service that sends (open question 12, and §4.1 of the
sign-in document). This is the half of open question 20 that is a number rather than a screen._

>

### 4.2 What does a failed resend do to the wait?

_Why this matters: today the wait restarts the moment the action is used, which cannot tell “a new code
is on its way” from “the send failed”, and there is no API to report either yet. The answers on the
table: restart on use (today), restart only when a send is confirmed, or end the wait so the picker can
try again at once — the last one being a cost and an enumeration surface that needs a reason, since a
resend with no wait is a way to make the service send on demand (SECURITY.md §3)._

>

## Anything else?

Anything we did not ask that we should know before this screen is built for a phone identifier, or
before a code travels by SMS?

>
