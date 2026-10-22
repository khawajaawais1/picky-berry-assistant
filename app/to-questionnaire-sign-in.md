# Signing in: the frame to draw, and the journey it supports

**Purpose:** The app has no way for an existing user to sign in, and no design frame draws one. This questionnaire resolves what the missing screen must be, so we can build it without inventing a design or a requirement.

**From:** the mobile team (this repository), **To:** the Figma design owner (section 1) and the project owner (sections 2–4) — one document, answer the sections that are yours, **How your answers will be used:** they become
[ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md), the frame we build
`/sign-in` from, and the sign-in links frames 01 and 03 already draw.

## Context

The app is built one design frame at a time: frames 01–18 plus the foundations are the whole inventory, and every frame except 02 now has a screen behind a route. **None of them signs a user in.** Today the only way into the app runs forward — frame 03 creates an account, frame 04 collects a code, frame 05 asks about location — so the two “Already have an account? Sign in” links the design draws (frames 01 and 03) have nowhere to go. The app renders them as plain labels that claim no button role, rather than promising a screen that does not exist.

Nothing in the app stores a session anywhere yet. ADR-013 decides Firebase Authentication as the identity provider, and open question 12 in PROJECT.md is still open on whether the app talks to Firebase directly or through our own backend. We may not invent a design or a requirement (AGENTS.md §8), which is why this is a questionnaire rather than a commit: the screen is not in the file, and “who is a returning user?” has never been written down — **but we did build the screen three ways and leave them running**, so §1 can be answered by looking instead of imagining. They are described at the top of that section.

## How to answer

Answer by **2026-10-17** if that is workable; if not, say when. Roughly 20 minutes. Partial answers and “I don't know” are both useful — flag anything you are unsure of rather than leaving it blank, since a blank we cannot tell from a “no”. Write your answer under each `>`. This document travels with the other three — [to-questionnaires-cover-note.md](to-questionnaires-cover-note.md) sends all four, and says what each one decides. Every question below also has a numbered slot in [to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md), the one artifact that can carry every answer back at once.

§1 is much easier to answer with the three readings of the screen open — they are described directly below it, and we can send them to you as a short screen recording if you would rather not run anything.

## 1. The frame we build from — designer

### The three readings, and what each one commits the flow to

So that this section can be answered by looking, we built the screen three ways from the components the app already has and left them running: `npm run prototype:sign-in` opens them at `/create-account?variant=A|B|C`, the bar at the foot switches between them (the arrow keys do too), and each action prints what the real screen would do. They are throwaway code, not product code: hard-coded English, no tests, absent from a shipped build, gone once one of them wins. None of them adds anything to the design file by itself, and they disagree about structure rather than about colour. What each one **commits the flow to** is the part we would like your answers below to react to.

**A · Code first — the return path is the code screen that already exists.** One identifier field, one action, six digits: no password to store, reset or leak. It commits the flow to signing in as **one** screen plus frame 04, which is already built and measured — so no second code screen is designed, and frame 04 becomes a screen two journeys walk. It needs your answer on whether frame 04 is drawn as a shared screen (its copy today is sign-up language: “Verify your email”, “Change email address”) or whether a returning user gets a version of it, and how a screen that names only the code says which of the two identifiers the code went to.

**B · Dense form — signing in is its own screen with its own credentials.** The identifier as frame 03's two chips, a password with a reveal control, recovery and sign-up sharing a row, everything visible at once. It commits the flow to **the app accepting a password** — it never checks one (ADR-013 leaves verification to the provider), but a password field is a password field, and the person typing it will expect both a failure and a way back in. It needs your answer on the **wrong-credentials state**, which no frame draws; on where **“Forgot password?” leads**, since no frame contains that destination; and on whether frame 03's chips and field metrics are simply borrowed here, because this screen draws them again.

**C · Device first — the device already knows who is most likely to sign in.** One remembered account, a biometric prompt as the primary action (fingerprint, Face ID or whatever the phone has — the OS does the asking and the app is never told which), a password behind a link, and a way in for a different account. It commits the flow to **biometric unlock being in v1** and to the app keeping a last-used identifier on the device, which is personal data with its own lawful-basis question. It also needs a state no frame draws: one account already known to this phone, and what the screen is when there is none. If biometric is out, this reading is out with it.

Two things the same in all three, so they are not part of the choice: **where the way in is** — each is what frames 01's and 03's “Already have an account? Sign in” links would open — and that all three sit **outside the app shell**, as onboarding does, since frames 01–05 draw no bar. They also show only their empty state: no network failure, no locked-out or rate-limited state, and no Finnish (prototype strings are hard-coded English so that prototype wording never reads as reviewed copy). Those are exactly the states your answers below decide.

### 1.1 Does the design file get a sign-in frame of its own, or is signing in a second mode of frame 03?

_Why this matters: it is the difference between a new route and one screen holding two modes, and it decides which frame our screens are measured against._

>

### 1.2 What identifies a returning user: email, phone, or both?

_Why this matters: frame 03 already offers both identifiers, so the answer decides how many fields the frame carries and whether the identifier is typed or picked._

>

### 1.3 Where is the way in, and what does it say?

_Why this matters: frames 01 and 03 each draw their own link, with slightly different words; if one link is enough, one of the two strings should go._

>

### 1.4 Which states must the frame draw?

_Why this matters: a frame that draws only the empty state leaves us inventing the error treatment, which is the one thing we may not do. Say which of these the frame will hold, and add any we have missed: empty, being typed, signing in, wrong credentials, locked out or rate-limited, no connection._

>

### 1.5 Is there a recovery path in v1 — a “forgot password” action — or deliberately none?

>

### 1.6 Does this screen carry the app shell, or sit outside it like onboarding?

_Why this matters: frames 01–05 draw no core navigation and frames 06–14 all do; the answer decides whether the bar is drawn here._

>

### 1.7 Is biometric unlock (Face ID / fingerprint) in v1 or out?

>

## 2. The returning-user journey — project owner

### 2.1 After signing in, where does the user land?

_Why this matters: someone with an account may or may not have been through location consent on this device, and may already have saved zones and queued reports on it._

>

### 2.2 What should happen for a user who signs in on a second device?

>

### 2.3 What does the app do when the session has expired while the user is mid-walk — an active visit, or a report waiting to be sent?

_Why this matters: it decides whether a stored report survives a sign-out, which is personal data either way._

>

### 2.4 What, if anything, must a user be able to do without an account at all?

>

## 3. What survives a restart — project owner

### 3.1 Where does the session live on the device, and how long does it last?

_Why this matters: ADR-006 puts credentials in platform secure storage and nowhere else, and ADR-020 records consent on the device; the session record has to be a decision, not whichever default the library ships with. Today a **stand-in** answers both halves — the session lives in memory for the length of the app's process and is good for an hour (ADR-028, PROJECT.md open question 25) — so nothing here is decided yet and no answer is foreclosed._

>

### 3.2 What signs a user out: a control on a screen, an expiry, a revoked account, or all three?

_Why this matters, and what changed on 2026-10-10: frame 14's sign-out row is built — it deletes
what the device holds of the picker's (the consent, the queued reports, the saved plan) and lands
the user on the app's front door, which is **our assumption rather than your decision** (PROJECT.md
known issue 29, open question 25). So the answer to this question now decides two things: whether
those device records should really go with the account, and what else should sign a user out
(an expiry, a revoked account). We will change the control to match whatever you answer._

>

### 3.3 Must a failed sign-in distinguish “wrong password” from “too many attempts”, or does one message cover both?

_Why this matters: telling the two apart leaks whether an address has an account, while collapsing them leaves a real user retrying forever — a security call and an accessibility one at once._

>

## 4. The service behind it — project owner

### 4.1 Does the app talk to Firebase Authentication directly (ADR-013), or through our own backend — and who owns that choice?

_Why this matters: open question 12. It shapes the API contract, where the session token is refreshed, and what we can honestly promise while offline._

>

### 4.2 Which of our servers, if any, must know that a sign-in happened?

>

## Anything else?

Anything we did not ask that we should know before this screen is drawn or built?

>
