# Five decisions, one week — sign-in, shared spots, the zone service, the backend, and screen 04 on a phone

**Purpose:** five questionnaires travel together because they share one reader and one deadline.
Each resolves a decision the codebase is waiting on and none is ours to make: a screen nobody has
drawn, a sharing model with no frame, the data behind the app's one geographic thing, where the
first thing the app ever sends will run, and what a picker who typed a phone number reads on the
screen the code is typed into. Answer them in one sitting or five; they are independent of each
other, and no question appears in two of them.

**From:** the mobile team (this repository)
**To:** the Figma design owner (§1 of the sign-in and community-map documents — both can be answered
by opening what is already running) and the project owner (everything else, including correcting our
reading in the zone-service document's §1)
**Deadline:** **2026-10-17** — one week; say so if that is not workable and we will move it.
**Effort:** the sign-in document estimates ~20 minutes; the backend document is the shortest — twelve
questions over four areas, no design, one page; the verification document is the shortest to answer —
eleven questions, and §1–§3 are visible in the app as it stands rather than imagined; the two design
documents are longer, and the zone service's §2 is nine separate calls. Partial answers are useful, and “I don't know yet” is a real answer — flag what you are
unsure of rather than leaving it blank.

## What each document decides

**1. Signing in — [to-questionnaire-sign-in.md](to-questionnaire-sign-in.md).**
The app has no way for a returning user to get in: frames 01 and 03 both draw an “Already have an
account? Sign in” link, and neither the screen nor the journey behind it exists. Decides: whether the
design file gets a frame of its own or signing in is a second mode of frame 03, which of three
built readings we build from, and — for you — where a submitted account goes (open question 12).
Answer §1 by looking: `npm run prototype:sign-in`.

**2. Shared spots — [to-questionnaire-community-map.md](to-questionnaire-community-map.md).**
What to draw around the sharing model you chose on 2026-10-10: what a *shared* spot is (§1.2 — the
zone the service already names, or a place the sharer names themselves), where the sharing control
lives, what a viewer is shown, whether frame 14's “Public” state ships at all, and whether the whole
thing is v1. Answer §1 by looking: `npm run prototype:community-map`.

**3. The zone service — [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md).**
A **Zone** is the app's one geographic thing and nothing returns one. §1 is our reading of what a
service has to return, written so it can be corrected in one pass — that document says a correction
is the most valuable thing in it. §2 is the calls only you can make: where polygons come from, who
curates them, what the boundary means on the ground, overlapping zones, boundary margins, whether
boundaries may be published at all, what a visit may be used for, which season states are real, and
hosting and region.

**4. The backend slice — [to-questionnaire-backend.md](to-questionnaire-backend.md).**
[ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)'s blocking list, one page: which host and
repository, who operates it day to day, which EU region and whose data-processing agreements, the
lawful basis for each field a share record holds, and the invite's **mechanics** — one link or
per-person, how long it lives, whether the sharer sees a count. No design in it, and no prototype.

**5. Screen 04 on a phone — [to-questionnaire-verification.md](to-questionnaire-verification.md).**
A picker who signs up *and* one who signs in with a phone number both land on screen 04, the frame's
email state: the title “Verify your email”, an action reading “Change email address”, and a card at
the foot addressed to someone who signed up by phone instead. Decides: whether a phone journey gets
the screen as drawn, a phone state of it, or a screen of its own; what a returning user who typed a
number sees; what the title, the change action, the foot card and the destination as printed say when
the code travels by SMS; and how long the resend wait runs. Open the app in a development build —
screen 03's Phone chip and the sign-in screen's single field both show it today.

## Nothing is asked twice

The five were reconciled on 2026-10-10, and again when each was added: the community-map
document owns **what a shared spot is**, the zone-service document owns **whether a curated unit
below a zone exists**, the sign-in document owns the account questions, the backend document owns
the invite's **mechanics**, and the verification document owns **which screen a phone identifier
walks** — while **who may be invited**, and what a viewer is told about the sharer, stay
with the community map. Each says so and defers explicitly, so a reader arriving from any direction
lands on the one document that holds the ask. The verification document defers twice over: what
identifies a returning user is the sign-in document's §1.2 (answered), and the sentences each
delivery branch turns back into are already recorded in
[ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md) §2, so it asks only about the
words that record did not touch. If you still find the same question in two of them,
that is a defect in our documents rather than a question you have to answer twice — tell us and we
will fix it.

## What happens with the answers

Each answer lands in the ADR that already waits for it —
[ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md) for the sign-in
document, [ADR-035](docs/adr/ADR-035-shared-spots-the-frame-and-the-sharing-model.md) for the
community map, [ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md) for the zone
service, [ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md) for the backend
document, and [ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md)
for screen 04's phone states. Each skeleton holds one slot per question and names what the answer changes: the open
questions in [PROJECT.md](PROJECT.md) it updates, and the code or screen it unblocks — a frame the
designer draws, one constant replaced by a real service, a route built. Nothing gets built from an
unanswered question, and nothing in the five documents forecloses an answer: the two prototypes exist
so that a choice can be made by looking rather than by imagining.

## If you only get through some of it

The documents are independent, so the order is yours. The shortest to answer is the verification
document — eleven questions about a screen that is built and visible today, most of them answerable by
looking. The two with the shortest path after it are the sign-in
document (a missing screen, about 20 minutes with the prototype open) and the zone-service §1
correction (one pass through our reading, which is
what three shipped things are waiting on). The backend document is the shortest by content — four
areas, twelve questions, one page, no design — and
the only one that gates a deployment rather than a drawing. The community-map §1 decides paper before code, and the
zone-service §2 can be answered piecemeal — flag whichever of the nine you want to think about
longer.

The five documents are in the repository root, named `to-questionnaire-sign-in.md`,
`to-questionnaire-community-map.md`, `to-questionnaire-zone-service.md`,
`to-questionnaire-backend.md` and `to-questionnaire-verification.md`. Answers can come back in the
files themselves, as a reply answering
section and question numbers, or in a conversation — whatever is easiest. Every question in all five
also has a numbered slot in
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md), which is the one file that
can carry the whole set back at once. The whole send — this note and the five questionnaires — is
also assembled as one printable document, [to-questionnaires-combined.md](to-questionnaires-combined.md).
