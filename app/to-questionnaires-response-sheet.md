# The five questionnaires, one response sheet

**Purpose:** every question the five documents ask, in one file, numbered so the answers come back as
a single artifact. Nothing here is new: each line is the question as its document asks it — except the
zone-service document's §1, which is our reading to correct, so its line names the reading and the
reading itself is in that document. The reason behind each question lives there too.

**To:** the Figma design owner (the §1s of A and B, and E's §1–§3) and the project owner (everything
else, including E's §4).
**Deadline 2026-10-17.** Partial answers are fine; write under each `>`; **"I don't know" is an
answer**, and an empty `>` reads as deferred only if you say so.

**How the numbers work:** document letter + the document's own question number, so `A3.1` is the
sign-in document's §3.1 and `C2.9` is the zone-service document's §2.9. All five documents number
their own questions, and the numbers here are theirs, unchanged — the only edit to a document was
adding the numbers the sign-in one was missing. **70 slots: A 17 · B 12 · C 16 · D 13 · E 12.**

**Returning it:** fill this file in, or answer by number in a reply — answers go back to the slot that
owns them. [to-questionnaires-cover-note.md](to-questionnaires-cover-note.md) says what each document
decides, and each document's answers land in the ADR that already waits for them — A in
[ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md), B in
[ADR-035](docs/adr/ADR-035-shared-spots-the-frame-and-the-sharing-model.md), C in
[ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md), D in
[ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md), E in
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md). Each skeleton holds one
slot per question, names the [PROJECT.md](PROJECT.md) open questions the answer updates, and lists the
code or screen it unblocks.

## A · Signing in — [to-questionnaire-sign-in.md](to-questionnaire-sign-in.md)

*The missing screen and the journey behind it. §1 is the designer's; §2–§4 the owner's. Answers are
recorded in [ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md), become
the frame `/sign-in` is built from, and wire the links frames 01 and 03 already draw.*

**A1.1 Does the design file get a sign-in frame of its own, or is signing in a second mode of frame 03?**
>
**A1.2 What identifies a returning user: email, phone, or both?**
>
**A1.3 Where is the way in, and what does it say?**
>
**A1.4 Which states must the frame draw?**
>
**A1.5 Is there a recovery path in v1 — a “forgot password” action — or deliberately none?**
>
**A1.6 Does this screen carry the app shell, or sit outside it like onboarding?**
>
**A1.7 Is biometric unlock (Face ID / fingerprint) in v1 or out?**
>
**A2.1 After signing in, where does the user land?**
>
**A2.2 What should happen for a user who signs in on a second device?**
>
**A2.3 What does the app do when the session has expired while the user is mid-walk — an active visit, or a report waiting to be sent?**
>
**A2.4 What, if anything, must a user be able to do without an account at all?**
>
**A3.1 Where does the session live on the device, and how long does it last?**
>
**A3.2 What signs a user out: a control on a screen, an expiry, a revoked account, or all three?**
>
**A3.3 Must a failed sign-in distinguish “wrong password” from “too many attempts”, or does one message cover both?**
>
**A4.1 Does the app talk to Firebase Authentication directly (ADR-013), or through our own backend — and who owns that choice?**
>
**A4.2 Which of our servers, if any, must know that a sign-in happened?**
>
**A-else Anything about signing in that the sixteen above do not cover?**
>

## B · Shared spots — [to-questionnaire-community-map.md](to-questionnaire-community-map.md)

*The community map's frame and who may see a spot. §1 is the designer's; §2 the owner's. Answers are
recorded in [ADR-035](docs/adr/ADR-035-shared-spots-the-frame-and-the-sharing-model.md), become the
frame(s) the app builds, and the requirement entry in [PROJECT.md](PROJECT.md).*

**B1.1 Is the community map a frame of its own, or frame 06's map with other people's spots on it?**
>
**B1.2 What is a “spot” — the zone itself, or a place inside it that the sharer names?**
>
**B1.3 What does a viewer see on a shared spot?**
>
**B1.4 Where does the sharing control live — frame 07's screen, frame 14's default, or both?**
>
**B1.5 Does the design still hold all three states, or two — and what does “Public” draw?**
>
**B1.6 What is the invite flow's surface, if any?**
>
**B1.7 Which states must the frame draw that the app cannot avoid?**
>
**B2.1 Is this v1, or recorded for later?**
>
**B2.2 Does a shared spot expire, and can it be taken back?**
>
**B2.3 Who can be invited — any account, or only people the user already knows outside the app?**
>
**B2.4 What does the viewer know about the sharer — their name, their initials, or nothing?**
>
**B-else Anything about shared spots that the eleven above do not cover?**
>

## C · The zone service — [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md)

*What the app needs from the data behind its one geographic thing. **§1 is ours to be corrected** —
each line below names the reading, the reading is in the document, and a correction is the most
valuable answer in the document. §2 is the owner's. Answers are recorded in
[ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md).*

**C1.1 The payload — correct it, or confirm it.**
>
**C1.2 The validation the app will do at the boundary — correct it, or confirm it.**
>
**C1.3 What the app claims, and what only the server may claim — correct it, or confirm it.**
>
**C1.4 Staleness, change and history — correct it, or confirm it.**
>
**C1.5 Offline, and what a device may keep — correct it, or confirm it.**
>
**C1.6 The four questions, for the fields the app itself keeps — correct it, or confirm it.**
>
**C2.1 Where do the polygons come from?**
>
**C2.2 Who curates them, and in what tool?**
>
**C2.3 What does a zone's geometry mean on the ground?**
>
**C2.4 May zones overlap, and may they nest — and does anything below a zone exist?**
>
**C2.5 Is the boundary a line, or a line with a margin?**
>
**C2.6 May we publish the boundaries?**
>
**C2.7 What may a visit be used for, and who may read one?**
>
**C2.8 Which season states are real?**
>
**C2.9 Hosting and region — the same object storage and region as the basemap, or different?**
>
**C-else Anything the fifteen above do not cover — who must not see a zone, or a zone that must not be in the app?**
>

## D · The first backend slice — [to-questionnaire-backend.md](to-questionnaire-backend.md)

*Host, region, basis and invite: the four decisions the deployment waits on. All four areas are the
owner's. Answers are recorded in
[ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md).*

**D1.1 Which host — and is the managed-Postgres-behind-a-small-TypeScript-API shape adopted?**
>
**D1.2 Which repository does the server code live in, and who writes it?**
>
**D1.3 Who operates it day to day, and how are its secrets held and rotated?**
>
**D2.1 Which EU region — and does anything leave it?**
>
**D2.2 Which processors does this add, and who signs their data-processing agreements?**
>
**D3.1 Which basis, which purpose, and in whose words is it explained — per field?**
>
**D3.2 Is redeeming an invite the recipient's affirmative action?**
>
**D3.3 What may the connection between two accounts be used for — and never?**
>
**D3.4 Deletion: rows naming an account deleted at the provider, sooner than the 12-month job (ADR-014)?**
>
**D4.1 One link per share, or per-person invites with per-person revocation?**
>
**D4.2 How long may an invite link be used?**
>
**D4.3 What may the sharer see about their recipients?**
>
**D-else Anything about the backend slice that the twelve above do not cover?**
>

## E · Screen 04 on a phone — [to-questionnaire-verification.md](to-questionnaire-verification.md)

*The frame's email state, which a phone sign-up and a phone sign-in both reach today. §1–§3 are the
design owner's; §2 and §4 are the owner's. Answers are recorded in
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md), and settle
PROJECT.md open question 20. The sentences each delivery branch turns back into are already recorded
in [ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md) §2 and are not asked again.*

**E1.1 Which screen does a phone sign-up see — frame 04, or a screen the design has not drawn?**
>
**E1.2 What does the design file give us to build that screen from?**
>
**E2.1 Does a returning user who typed a number arrive on the screen a sign-up walks?**
>
**E2.2 Must anything on the screen say which journey the picker is on?**
>
**E2.3 Do the two sign-in branches — a number and an address — differ from each other on this screen?**
>
**E3.1 What does the screen's title say when the destination is a number?**
>
**E3.2 What does the action back to the identifier say when the destination is a number?**
>
**E3.3 Does the card at the foot stay on a phone journey, change hands, or go?**
>
**E3.4 How is the destination printed when it is a number — as typed, or masked?**
>
**E4.1 How long does the resend wait run, and who decides it?**
>
**E4.2 What does a failed resend do to the wait?**
>
**E-else Anything about a phone identifier's screen that the eleven above do not cover?**
>

---

**If something fits no slot:** write it under the document it belongs to, or name the letter in a reply.
**If a document changes after this sheet was written, this sheet has to change with it** — the counts
above (A 17 · B 12 · C 16 · D 13 · E 12) are the check that it still covers everything.
