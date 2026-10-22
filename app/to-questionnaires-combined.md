# Five decisions, one week — the cover note and the five questionnaires

**Purpose:** five questionnaires travel together because they share one reader and one deadline.
Each resolves a decision the codebase is waiting on and none is ours to make: a screen nobody has
drawn, a sharing model with no frame, the data behind the app's one geographic thing, where the
first thing the app ever sends will run, and what a picker who typed a phone number reads on the
screen the code is typed into. Answer them in one sitting or five; they are independent of
each other, and no question appears in two of them.

**From:** the mobile team (this repository)
**To:** the Figma design owner (Part 1 §1, Part 2 §1 and Part 5 §1–§3 — all can be answered by opening
what is already running) and the project owner (everything else, including correcting our reading in
Part 3 §1)
**Deadline:** **2026-10-17** — one week; say so if that is not workable and we will move it.
**Effort:** Part 1 estimates ~20 minutes; Part 4 is the shortest by content — twelve questions over
four areas, no design, one page; Part 5 is the shortest to answer — eleven questions about a screen
that is built and visible; Parts 2 and 3 are longer, and Part 3 §2 is nine separate calls. Partial
answers are useful, and “I don't know yet” is a real answer — flag what you are unsure of rather than
leaving it blank, since a blank cannot be told from a “no”.

**How to answer:** write under each `>`. Every question also has a numbered slot in
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md), so answers can come back
in this document, in that sheet, or as a reply naming the numbers — whatever is easiest. Each part
keeps its own question numbers, and the sheet prefixes them with the part's letter — Part 1 is `A`,
Part 2 `B`, Part 3 `C`, Part 4 `D`, Part 5 `E`, so Part 3's §2.4 comes back as `C2.4`.

## What each part decides

| Part | Who answers it | What it decides | Questions |
| --- | --- | --- | --- |
| **1 · Signing in** | designer §1, owner §2–§4 | The app has no way for a returning user to get in: frames 01 and 03 both draw an “Already have an account? Sign in” link, and neither the screen nor the journey behind it exists. Decides whether the design file gets a frame of its own, which of three built readings we build from, and where a submitted account goes | 16 (§1 by looking: `npm run prototype:sign-in`) |
| **2 · Shared spots** | designer §1, owner §2 | What to draw around the sharing model chosen on 2026-10-10: what a *shared* spot is, where the sharing control lives, what a viewer is shown, whether frame 14's “Public” state ships at all, and whether the whole thing is v1 | 11 (§1 by looking: `npm run prototype:community-map`) |
| **3 · The zone service** | owner (§1 is ours to correct) | A **Zone** is the app's one geographic thing and nothing returns one. §1 is our reading of what a service has to return, written so it can be corrected in one pass; §2 is the calls only you can make — where polygons come from, who curates them, what the boundary means on the ground, overlapping zones, margins, whether boundaries may be published, what a visit may be used for, which season states are real, hosting and region | 15 (§1 is ours to be corrected) |
| **4 · The first backend slice** | owner | [ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)'s blocking list: which host and repository, who operates it day to day, which EU region and whose data-processing agreements, the lawful basis for each field a share record holds, and the invite's **mechanics**. No design in it, and no prototype. Host candidates are compared in [docs/host-candidates.md](docs/host-candidates.md) | 12 |
| **5 · Screen 04 on a phone** | designer §1–§3, owner §2 and §4 | A picker who signs up *and* one who signs in with a phone number both land on screen 04, the frame's email state: the title “Verify your email”, an action reading “Change email address”, and a card at the foot addressed to someone who signed up by phone instead. Decides whether a phone journey gets the screen as drawn, a phone state of it or a screen of its own; what a returning user who typed a number sees; what the title, the change action, the foot card and the destination as printed say when the code travels by SMS; and how long the resend wait runs. The frame's own text, visible in the app today (ADR-048 §2 already records the branch sentences, so they are not asked again) | 11 |

Each part ends with an “Anything else?” box, so the counts above plus one catch-all per part is
**70 slots — the same 70 as the response sheet**.

## Nothing is asked twice

The five were reconciled on 2026-10-10, and again when each was added: Part 2 owns **what a shared
spot is**, Part 3 owns **whether a curated unit below a zone exists**, Part 1 owns the account
questions, Part 4 owns the invite's **mechanics**, and Part 5 owns **which screen a phone identifier
walks** — while **who may be invited** and **what a
viewer is told about the sharer** stay with Part 2 (§2.3–§2.4), and the maps' storage region is
Part 3 §2.9. Part 5 defers twice over: what identifies a returning user is Part 1's §1.2 (answered),
and the sentences each delivery branch turns back into are recorded in
[ADR-048](docs/adr/ADR-048-the-verification-copy-claims-no-delivery.md) §2, so it asks only about the
words that record did not touch. Each part says so and defers explicitly, so a reader arriving from any direction lands
on the one place that holds the ask. If you still find the same question in two parts, that is a
defect in our documents rather than a question you have to answer twice — tell us and we will fix it.

## What happens with the answers

Each answer lands in the ADR that already waits for it —
[ADR-034](docs/adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md) for Part 1,
[ADR-035](docs/adr/ADR-035-shared-spots-the-frame-and-the-sharing-model.md) for Part 2,
[ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md) for Part 3,
[ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md) for Part 4, and
[ADR-049](docs/adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md) for Part 5. Each
skeleton holds one slot per question and names what the answer changes: the open questions in
[PROJECT.md](PROJECT.md) it updates, and the code or screen it unblocks — a frame the designer draws,
one constant replaced by a real service, a route built. Nothing gets built from an unanswered
question, and nothing in the five parts forecloses an answer: the prototypes exist so that a choice
can be made by looking rather than by imagining.

## If you only get through some of it

The parts are independent, so the order is yours. The shortest to answer is Part 5 — eleven questions
about a screen that is built and visible today, most of them answerable by looking. The two with the
shortest path after it are Part 1 (a missing
screen, about 20 minutes with the prototype open) and Part 3 §1 (one pass through our reading, which is
what three shipped things are waiting on). Part 4 is the shortest by content — four areas, twelve
questions, one page, no design — and the only one that gates a deployment rather than a drawing.
Part 2 §1 decides paper before code, and Part 3 §2 can be answered piecemeal — flag whichever calls you
want to think about longer.

## How this document was assembled

It concatenates [to-questionnaires-cover-note.md](to-questionnaires-cover-note.md) and the five
questionnaires ([sign-in](to-questionnaire-sign-in.md),
[shared spots](to-questionnaire-community-map.md), [zone service](to-questionnaire-zone-service.md),
[the backend slice](to-questionnaire-backend.md) and
[screen 04 on a phone](to-questionnaire-verification.md)), in the order the cover note sends them,
with the
blocks each document repeated — its title, its From/To line, the deadline and the “how to answer”
etiquette — stated once, here. Nothing else was cut: each part keeps its own context, its own
questions and its own numbering. The six files remain the record; if they change, this document has
to change with them.

---

## Part 1 · Signing in — the frame to draw, and the journey it supports

The app has no way for an existing user to sign in, and no design frame draws one. This part resolves what the missing screen must be, so we can build it without inventing a design or a requirement.

### Context

The app is built one design frame at a time: frames 01–18 plus the foundations are the whole inventory, and every frame except 02 now has a screen behind a route. **None of them signs a user in.** Today the only way into the app runs forward — frame 03 creates an account, frame 04 collects a code, frame 05 asks about location — so the two “Already have an account? Sign in” links the design draws (frames 01 and 03) have nowhere to go. The app renders them as plain labels that claim no button role, rather than promising a screen that does not exist.

Nothing in the app stores a session anywhere yet. ADR-013 decides Firebase Authentication as the identity provider, and open question 12 in PROJECT.md is still open on whether the app talks to Firebase directly or through our own backend. We may not invent a design or a requirement (AGENTS.md §8), which is why this is a questionnaire rather than a commit: the screen is not in the file, and “who is a returning user?” has never been written down — **but we did build the screen three ways and leave them running**, so §1 can be answered by looking instead of imagining. They are described at the top of that section.

### Answering this part by looking

§1 is much easier to answer with the three readings of the screen open — they are described directly below it, and we can send them to you as a short screen recording if you would rather not run anything.

### 1. The frame we build from — designer

#### The three readings, and what each one commits the flow to

So that this section can be answered by looking, we built the screen three ways from the components the app already has and left them running: `npm run prototype:sign-in` opens them at `/create-account?variant=A|B|C`, the bar at the foot switches between them (the arrow keys do too), and each action prints what the real screen would do. They are throwaway code, not product code: hard-coded English, no tests, absent from a shipped build, gone once one of them wins. None of them adds anything to the design file by itself, and they disagree about structure rather than about colour. What each one **commits the flow to** is the part we would like your answers below to react to.

**A · Code first — the return path is the code screen that already exists.** One identifier field, one action, six digits: no password to store, reset or leak. It commits the flow to signing in as **one** screen plus frame 04, which is already built and measured — so no second code screen is designed, and frame 04 becomes a screen two journeys walk. It needs your answer on whether frame 04 is drawn as a shared screen (its copy today is sign-up language: “Verify your email”, “Change email address”) or whether a returning user gets a version of it, and how a screen that names only the code says which of the two identifiers the code went to.

**B · Dense form — signing in is its own screen with its own credentials.** The identifier as frame 03's two chips, a password with a reveal control, recovery and sign-up sharing a row, everything visible at once. It commits the flow to **the app accepting a password** — it never checks one (ADR-013 leaves verification to the provider), but a password field is a password field, and the person typing it will expect both a failure and a way back in. It needs your answer on the **wrong-credentials state**, which no frame draws; on where **“Forgot password?” leads**, since no frame contains that destination; and on whether frame 03's chips and field metrics are simply borrowed here, because this screen draws them again.

**C · Device first — the device already knows who is most likely to sign in.** One remembered account, a biometric prompt as the primary action (fingerprint, Face ID or whatever the phone has — the OS does the asking and the app is never told which), a password behind a link, and a way in for a different account. It commits the flow to **biometric unlock being in v1** and to the app keeping a last-used identifier on the device, which is personal data with its own lawful-basis question. It also needs a state no frame draws: one account already known to this phone, and what the screen is when there is none. If biometric is out, this reading is out with it.

Two things the same in all three, so they are not part of the choice: **where the way in is** — each is what frames 01's and 03's “Already have an account? Sign in” links would open — and that all three sit **outside the app shell**, as onboarding does, since frames 01–05 draw no bar. They also show only their empty state: no network failure, no locked-out or rate-limited state, and no Finnish (prototype strings are hard-coded English so that prototype wording never reads as reviewed copy). Those are exactly the states your answers below decide.

#### 1.1 Does the design file get a sign-in frame of its own, or is signing in a second mode of frame 03?

_Why this matters: it is the difference between a new route and one screen holding two modes, and it decides which frame our screens are measured against._

>

#### 1.2 What identifies a returning user: email, phone, or both?

_Why this matters: frame 03 already offers both identifiers, so the answer decides how many fields the frame carries and whether the identifier is typed or picked._

>

#### 1.3 Where is the way in, and what does it say?

_Why this matters: frames 01 and 03 each draw their own link, with slightly different words; if one link is enough, one of the two strings should go._

>

#### 1.4 Which states must the frame draw?

_Why this matters: a frame that draws only the empty state leaves us inventing the error treatment, which is the one thing we may not do. Say which of these the frame will hold, and add any we have missed: empty, being typed, signing in, wrong credentials, locked out or rate-limited, no connection._

>

#### 1.5 Is there a recovery path in v1 — a “forgot password” action — or deliberately none?

>

#### 1.6 Does this screen carry the app shell, or sit outside it like onboarding?

_Why this matters: frames 01–05 draw no core navigation and frames 06–14 all do; the answer decides whether the bar is drawn here._

>

#### 1.7 Is biometric unlock (Face ID / fingerprint) in v1 or out?

>

### 2. The returning-user journey — project owner

#### 2.1 After signing in, where does the user land?

_Why this matters: someone with an account may or may not have been through location consent on this device, and may already have saved zones and queued reports on it._

>

#### 2.2 What should happen for a user who signs in on a second device?

>

#### 2.3 What does the app do when the session has expired while the user is mid-walk — an active visit, or a report waiting to be sent?

_Why this matters: it decides whether a stored report survives a sign-out, which is personal data either way._

>

#### 2.4 What, if anything, must a user be able to do without an account at all?

>

### 3. What survives a restart — project owner

#### 3.1 Where does the session live on the device, and how long does it last?

_Why this matters: ADR-006 puts credentials in platform secure storage and nowhere else, and ADR-020 records consent on the device; the session record has to be a decision, not whichever default the library ships with. Today a **stand-in** answers both halves — the session lives in memory for the length of the app's process and is good for an hour (ADR-028, PROJECT.md open question 25) — so nothing here is decided yet and no answer is foreclosed._

>

#### 3.2 What signs a user out: a control on a screen, an expiry, a revoked account, or all three?

_Why this matters, and what changed on 2026-10-10: frame 14's sign-out row is built — it deletes
what the device holds of the picker's (the consent, the queued reports, the saved plan) and lands
the user on the app's front door, which is **our assumption rather than your decision** (PROJECT.md
known issue 29, open question 25). So the answer to this question now decides two things: whether
those device records should really go with the account, and what else should sign a user out
(an expiry, a revoked account). We will change the control to match whatever you answer._

>

#### 3.3 Must a failed sign-in distinguish “wrong password” from “too many attempts”, or does one message cover both?

_Why this matters: telling the two apart leaks whether an address has an account, while collapsing them leaves a real user retrying forever — a security call and an accessibility one at once._

>

### 4. The service behind it — project owner

#### 4.1 Does the app talk to Firebase Authentication directly (ADR-013), or through our own backend — and who owns that choice?

_Why this matters: open question 12. It shapes the API contract, where the session token is refreshed, and what we can honestly promise while offline._

>

#### 4.2 Which of our servers, if any, must know that a sign-in happened?

>

### Anything else?

Anything we did not ask that we should know before this screen is drawn or built?

>

---

## Part 2 · Shared spots — the frame to draw, and who may see them

The owner wants pickers to be able to see places other pickers picked, when those
pickers choose to share them — the design's own **community map** idea, **not** a live map of people.
The design file draws that sharing *model* (frame 14's “Default spot visibility” block) but no share
control, no invite list and no community map, so this resolves what to build without inventing a
design or a requirement.

### Context

What the owner decided on 2026-10-10, in one paragraph: **a shared spot is a place someone picked,
never a person's position.** Sharing is with **people you invite**, and the frame's own third state,
“Public: visible on the community map” (`5:23657`), is recorded but **not** decided as in scope. That
choice is what lets the app keep the promises it already makes — screen 05's “Your exact GPS tracks
are never shown to other people”, screen 03's “Your GPS trails are never public”, frame 14's
“Visibility applies to spots, not your route. Exact tracks are never shown to others.” — so those
sentences are not up for change; what is missing is what to draw around them.

What exists today, so the questions below are about the gaps and not about re-asking:

- the app's only geographic thing is a **Zone** — a curated polygon with a name, a state and a season
  — and **nothing returns a zone yet** (PROJECT.md known issues 12 and 14): the zones on screen are
  the design's demo composition;
- the app's own copy already calls the picker's plan “**Saved spots**” (the private list frame 14's
  row opens), which is a different thing from a shared spot;
- frame 14's visibility block is deliberately **not drawn**, because its three chips promise a
  sharing model the app does not have;
- nothing in the app **sends** anything anywhere today (reports queue on the device; SECURITY.md
  §17), so this feature is also the first one that needs a server — whose *shape* is specified now
  ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md): one share record, one server-enforced
  access rule, accounts as identity-provider subjects, and the rule that reads a share already
  written alongside its tests, `src/features/sharing`), while where it lives and runs stays open
  (open questions 3, 15 and 16).

**Where the other half of this is asked.** The geography is
[to-questionnaire-zone-service.md](to-questionnaire-zone-service.md)'s subject, and the two
documents divide the one question they appear to share (the sections below are numbered so each
answer can be pointed at, as that document's are):

- **that document owns the geography's levels** — whether anything finer than a zone exists *and is
  curated by the operator* (§2.4), because that answer changes the zone service's payload, the
  curation work behind it and what it may be licensed from;
- **this document owns what a *shared* spot is** (§1.2) — whether a picker shares the zone the
  service already names, or a place they name themselves — because a place needs a name only once
  it is shared, and that name would be a field on the grant ADR-032 already specifies (which
  records *which zone* today; its decision 6 says the field is renamed when this is answered),
  not a level in the service;
- and whether zone boundaries may be **shown** at all is that document's §2.6, which a shared
  spot's visibility inherits.

Neither answer blocks the other; they meet in exactly one place, which is what a share points at.

### Answering this part by looking

**Section 1 can be answered by looking.** `npm run prototype:community-map` opens three throwaway
readings of the community map, each on the screen that reading would give it, and the floating bar
at the foot of the screen navigates between them:

- **A** `/discover?variant=A` — other pickers' places as a second layer on frame 06's own map;
- **B** `/zone-details?variant=B` — the places shared for a zone, listed under that zone's figures;
- **C** `/saved-spots?variant=C` — one card per place, carrying the person who shared it, where the
  picker's own places live.

They are paper, not a proposal: prototype code (no tests, hard-coded English, invented spots),
ignored by a `production` build, and deleted once one reading wins. The three disagree on purpose
about *where* the community map lives and about *what a shared spot is* (a mark on the map, a place
inside a zone, a place plus a person) — the two things §1 asks below. “The header from B with the
cards from C” is a perfectly good answer, and the notes in the reading name what it left out (the
frame's “Public” state, an invite list, removing a spot someone else shared).

### 1. What to draw — designer

#### 1.1 Is the community map a frame of its own, or frame 06's map with other people's spots on it?

_Why this matters: it decides whether the map screen grows a second layer (the picker's own zones,
then spots shared with them) or whether there is a screen to design from scratch — and the app's map
is currently an illustration of the design's geometry, so either answer changes what that drawing
has to become._

>

#### 1.2 What is a “spot” — the zone itself, or a place inside it that the sharer names?

_Why this matters: the app has one geographic thing, a zone, and the word “spot” already means “a
zone in my saved plan” in the app's own copy (frame 14's “Saved spots”). If what a picker shares is
something finer — a clearing, a berry patch inside a zone — then the design has to say **who names
it**: a name the picker types (a field on the share, and a new sentence to translate) or a place
the operator curates and the app offers as a list. If the sharer names it, that name is part of the
share, not of the zone, and nothing in the code may be called “spot” until this lands (CONTEXT.md).
The geography's own half of it — whether anything below a zone exists at all, and who curates it —
is asked in [to-questionnaire-zone-service.md](to-questionnaire-zone-service.md) §2.4, so it is not
asked twice here._

>

#### 1.3 What does a viewer see on a shared spot?

_Why this matters: a spot with no words is a pin; a spot with too much is a report. Say which of
these it carries: the zone's own card (frame 06's), the sharer's name or initials, how long ago it
was picked, a note the sharer typed, the species. Anything drawn is copy the app must have, and the
app may not invent copy the design has not drawn._

>

#### 1.4 Where does the sharing control live — frame 07's screen, frame 14's default, or both?

_Why this matters: frame 14 draws a **default** (Private / Shared / Public) and frame 07 draws the
zone's own screen with a bookmark on it. Per-spot sharing is a control on the spot; a default is a
setting. The two answer different questions and the app should not draw both unless the design says
they are both wanted._

>

#### 1.5 Does the design still hold all three states, or two — and what does “Public” draw?

_Why this matters: the owner has decided “people you invite” and left “Public: visible on the
community map” undecided. If the frame keeps all three, the app has to be able to draw a public
state honestly (who may see it, what it claims, how it is turned off); if it ships two, the frame
should not draw a third that means nothing — the reason the block is undrawn today._

>

#### 1.6 What is the invite flow's surface, if any?

_Why this matters: “people you invite” implies a list to manage — who is on it, how they get there,
how one is removed, and what an invite looks like to the person receiving it. The app has no
contacts, no profile page and no notifications today; if the design does not hold this, the app
cannot honestly draw it and the answer may be that the invite list is simply a list of accounts the
user types in._

>

#### 1.7 Which states must the frame draw that the app cannot avoid?

_Why this matters: a spot nobody has shared yet (empty), a spot whose sharer removed it while
someone was looking at it, a spot for a zone the viewer's app does not know, and a failure to load
shared spots at all. These are the states we may not invent, and they are the ones a frame usually
leaves out._

>

### 2. What it commits us to — project owner

#### 2.1 Is this v1, or recorded for later?

_Why this matters: it is the first feature that needs a server, an account for the person you share
with, and a lawful basis for storing someone else's view of your spot — so it also decides what has
to be built before it (zone service, backend, authentication) and what waits. The server and the
account are now specified or decided elsewhere ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md),
ADR-013) and the lawful basis is open question 15; what is left here is scope._

>

#### 2.2 Does a shared spot expire, and can it be taken back?

_Why this matters: the app's retention rule is 12 months (ADR-014) and applies to anything stored
server-side. Revoking has to be as easy as sharing (AGENTS.md §11.1) — say whether a shared spot
ends when the season does, when the sharer removes it, or at a chosen date._

>

#### 2.3 Who can be invited — any account, or only people the user already knows outside the app?

_Why this matters: an invite needs an identifier for the other person (an email address or a phone
number is personal data we would process *about someone who has not asked us to*). Saying “only
people you already know, invited by a link” is a different data story from a search over all
accounts, and it decides whether the app needs a “find a picker by name” screen at all. ADR-032
already **assumes** the link — a code the sharer sends themselves, stored hashed and never looked
up — and rejected an address lookup for exactly this reason (its decision 5, marked an assumption
because this question asks you directly); an answer of “invite by address” supersedes that
assumption in a new ADR rather than being built beside it._

>

#### 2.4 What does the viewer know about the sharer — their name, their initials, or nothing?

_Why this matters: it decides what the app stores and shows about a third person, and whether a spot
shared with a group is attributable at all. Anonymity is not a privacy freebie: an anonymous spot
still tells the viewer that someone was there._

>

### Anything else?

Anything we did not ask that we should know before this is drawn or built?

>

---

## Part 3 · The zone service — what it has to return, and the calls only you can make

A **Zone** is the app's one geographic thing, and **nothing returns one**. Every zone on
screen is the design's own demo composition, the containment rule has never run on a real position,
and three shipped things are waiting on a zone source: the map and its list (known issue 14), the
saved plan (a saved identifier the app cannot describe is named rather than dropped), and the first
backend slice, whose central record names a zone ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)).
This part has two halves: **§1 is the contract the app needs** — our reading, written so you can
correct it in one pass — and **§2 is the decisions only you can make**, because they are about data,
licensing, ground truth and what the app is allowed to claim.

### Context

Settled already, so nobody re-asks it: a zone is **an authoritative, operator-maintained area with a
stable identity — not derived from data and not user-created** (domain decision 1); curation is a
**privileged capability and never ships in the field app** (decision 10, [ADR-012](docs/adr/ADR-012-privileged-surface.md));
a **visit** opens on entering a zone once a dwell minimum has elapsed and continues across a grace
window as several presence segments (decisions 2–3); the visit policy is **server-owned and
versioned** (decision 16); position is stored as **one coarse centroid per segment, never a trace**
([ADR-010](docs/adr/ADR-010-position-retention.md)), and retention is **12 months**
([ADR-014](docs/adr/ADR-014-retention-policy.md)). The map itself is drawn from the design's own
geometry ([ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md)), and the real
basemap is decided but unbuilt: tiles **we host** ([ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)),
whose first prerequisite is exactly this — zone geometry to draw on them.

What exists in code, and what it assumes: `features/visits/domain/zone-containment.ts` (pure
point-in-polygon, boundary counts as inside, ≤3 vertices is degenerate, antimeridian crossing
unsupported, **first matching zone wins** — a documented assumption, not a requirement, open
question 9); `features/visits/domain/visit-lifecycle.ts` (the dwell/grace/day state machine, tested,
with no caller); `features/visits/domain/visit-policy.ts` (the pattern for validating a
server payload at the boundary); `features/discover/domain/zone.ts` (`DEMO_ZONES` — the design's
composition, twice amended, and the one constant a real source replaces). No zone has ever been
fetched, stored or sent anywhere (SECURITY.md §17).

**This is the data, not the drawing.** The design's half of the map is settled enough (frames 06–12
exist; [docs/design-source.md](docs/design-source.md) holds their geometry). Two sibling documents
ask things this one deliberately does not, and the split is deliberate so that no question is asked
twice: [to-questionnaire-community-map.md](to-questionnaire-community-map.md) owns **what a shared
spot is** — the zone the service already names, or a place the sharer names themselves (§1.2 there;
the two answers meet only here, at §2.4 below) — and the sign-in document owns the account
questions.

### Answering this part

**§1 is ours to be corrected**: if any line of it is wrong, the correction is the most
valuable thing in this part. §2 is yours, and it can be answered piecemeal.

### 1. What the app needs from a zone service — our reading, to correct

#### 1.1 The payload

One zone, as the app could consume it:

```jsonc
{
  "id": "…",                  // stable, never reused, never re-issued to a different area (§1.4)
  "number": "14",             // what the design's card and list print as “Zone 14”
  "place": "Laajavuori",      // the ground's own name, if it has one
  "ring": [ { "latitude": 62.2, "longitude": 25.7 } ],  // exterior ring, closing vertex optional
  "version": "2026-10-01.1",  // which boundary this is: see 1.4
  "species": ["lingonberry", "bilberry"]  // what grows here, as the app's species vocabulary
}
```

_Why this matters: every field above is already drawn by a screen, and two of them are already
stored — the identifier in the picker's plan and in every queued report. A field we cannot fill is a
screen that has to change, and we would rather change it deliberately than discover it later._

>

#### 1.2 The validation the app will do at the boundary

Whatever the service returns is **external input**, so it is validated before use, the way the visit
policy already is (SECURITY.md §4): a ring of at least three vertices, finite coordinates in range,
a non-empty identifier, an unknown extra field dropped rather than echoed, and a payload the app
cannot read treated as **no zones at all** — never as a zone it half-understands.

_Why this matters: the failure direction decides what a screen shows when the service misbehaves. We
are proposing “draw nothing and say nothing is known”, never “draw the last thing we had”._

>

#### 1.3 What the app claims, and what only the server may claim

Our proposal, so you can strike it down:

- **The app may say** “you were in Zone 14 for 42 min, judged against policy v3” — that is the
  device's own reading of its own samples, with the policy version attached so it can be reconciled.
- **The app may not say** that a visit is confirmed, verified, or worth anything: verification is
  probabilistic by decision 8, and the server recomputes from the segments and centroids it receives.
- **The app may not say** a zone's yield, ripeness or “freshness” unless a service said so. Today
  those figures are the design's sample and every screen carrying them discloses it.

_Why this matters: this is the line between the app's own observation and an authoritative claim. It
decides what a screen may assert, what a dispute is about, and whether a visit can be reward evidence
(§2.7)._

>

#### 1.4 Staleness, change and history

A boundary will change: a zone is redrawn, split, retired. Our proposal: an identifier is
**immutable and never re-issued**, geometry carries a **version**, the app stores the zone identity
it saw at capture time (the same pattern as `policyVersion`), and a visit recorded under an older
boundary keeps saying so rather than being silently re-judged. A zone that no longer exists is
**named, not hidden** — that is already the saved plan's rule for an identifier the app cannot
describe.

_Why this matters: without a version, every stored visit silently changes meaning when a polygon
moves, and nobody can tell which boundary a past decision was made on._

>

#### 1.5 Offline, and what a device may keep

Frame 13 promises downloaded regions, and a field app is used where there is no network, so the
service has to be answerable from data **kept on the device**: which zones (a bounding box? the whole
country?), how large that is, how long it stays valid, and what a visit made inside a
week-old boundary means. [ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)
records that hosting our own tiles makes offline possible but that offline tiles are **not spiked
yet**.

_Why this matters: this is the one requirement that shapes the service's storage format, and it is
the one nobody can retrofit cheaply._

>

#### 1.6 The four questions, for the fields the app itself keeps

The app stores a zone identifier in three places (the picker's plan, the queued report, a visit) and
a zone identifier alone is not personal data. **A visit to one is** — it is position-derived, which
is why ADR-010 and ADR-014 already govern it. Our reading: the identifier is readable by the app on
the device that holds it, correctable by removing the plan row, deletable by the existing controls,
and never sent anywhere yet. Nothing here needs a new field.

_Why this matters: AGENTS.md §11 asks these of every stored field, and “the zone id is fine” is
easier to confirm now than to reconstruct later._

>

### 2. What only you can answer

Ordered by what blocks the most work.

#### 2.1 Where do the polygons come from?

Hand-traced by us, derived from an official or commercial dataset, traced from the design's own
drawing, or something else? If a dataset: which one, under what licence, and may we redistribute the
boundaries to devices? (OpenStreetMap data is ODbL — free to use, but attribution and share-alike
apply to derived data, and its *tile servers* are a separate, forbidden thing per ADR-031.)

_Why this matters: it decides whether the project owns a curator, a licence and an attribution line
— and whether a boundary can be redrawn at will or is somebody else's to change._

>

#### 2.2 Who curates them, and in what tool?

Decision 10 keeps curation out of the field app, so where does it happen: the operator surface, a GIS
file imported by a script, a spreadsheet of coordinates? Who is the person, how often do they touch
it, and what change would need a second pair of eyes?

_Why this matters: “a zone service” is really “a polygon store plus the process that fills it”. The
process is the part that exists forever, and it needs an owner with a name._

>

#### 2.3 What does a zone's geometry mean on the ground?

Is a zone an administrative area, a habitat, or a picking ground? Is the line **authoritative**
(“inside the line is inside the zone”) or **indicative** (a rough boundary the app should not be
precise about)? And how was it drawn — surveyed, traced on a map, or eyeballed — which sets how
precise a claim may be.

_Why this matters: the app's copy, the visit rule and any dispute all rest on this. “Zone 14 · 42 min”
means very different things if the boundary is a cadastral line than if it is a circle someone drew
around a berry slope._

>

#### 2.4 May zones overlap, and may they nest — and does anything below a zone exist?

Open question 9. Today the app takes the **first** zone in the order the server sends and ignores the
rest — an assumption. If zones may overlap: which one wins (the smallest? the most specific? the
server's order?), and what does it mean to be inside two at once? If they nest — a region containing
zones — the shape of the payload changes.

This document owns the second half of that: **whether anything below a zone exists and is curated by
the operator** — a named place, a smaller ring, a point — because the answer changes this service's
payload, who does the curation work and what the geometry can be licensed from. It is **not** the
same question as “what is a shared spot?”, which
[to-questionnaire-community-map.md](to-questionnaire-community-map.md) §1.2 owns: a picker's own
name for a place on a share needs no level in this service, and a curated level would be offered
before anyone names anything. Answer that one over there; it does not come back to this box.

_Why this matters: “inside a zone” is the app's central fact. Two answers to it means two visits,
two scores and two explanations for the same walk._

>

#### 2.5 Is the boundary a line, or a line with a margin?

A phone's position is accurate to roughly 5–20 m in open ground and worse under canopy, so a walk
along a zone's edge flickers in and out. Should the server treat a point just outside as inside (a
tolerance, and how much), should the geometry itself carry a soft edge, or is the drawn line final
and the flicker is what you get?

_Why this matters: the dwell minimum already absorbs short flickers by design, but a margin is a
different, cheaper fix — and it changes what “you were in Zone 14” is worth at the edge._

>

#### 2.6 May we publish the boundaries?

The polygons would be visible on every device, so anyone can read where the good ground is. That
concentrates picking: an empty forest becomes a busy one, and a curated zone can be stripped. Should
the app draw zone **outlines**, only a position relative to a zone (“you are 200 m outside”), or
nothing at all until a picker is inside one? The design draws outlines on frames 06–10.

_Why this matters: it is the one place where the data we publish can damage the thing the app is
about, and it is an owner call rather than a design detail. Your answer here is also the ceiling for
what may leave the device when something is shared — the community-map document's §1.5 (“Public”)
inherits it — so a shared spot may never be more precise than this allows._

>

#### 2.7 What may a visit be used for, and who may read one?

Is a visit evidence — for a reward, a quota, a seller's trust score, a dispute? Who may read a
visit besides the picker who made it (other pickers see counts on a map, never visits today)? What
does the app owe a user whose visit is questioned?

_Why this matters: it decides how much the boundary and the accuracy question (§2.3, §2.5) have to
carry, and whether “probabilistic, not proof” (decision 8) is acceptable to the thing that pays out._

>

#### 2.8 Which season states are real?

The design's legend colours zones “Unpicked”, “Recently picked” and “Ripening”, and the app currently
treats that state as the zone's **own property** (the design's sample). Is it really a property of the
place — curated, like a habitat classification — or is it **derived** from pickers' reports, which
would make it a different service (the report stream) and a different disclosure?

_Why this matters: if it is derived, the map's colours are a claim about other people's reports and
the “11 reports this week” figures become load-bearing; if it is curated, someone has to maintain a
season state per zone, forever._

>

#### 2.9 Hosting and region

Polygons and the basemap both need storage; ADR-031 has us hosting the tiles. Same object storage and
same region for both, or different? Which region (open question 16), and does the polygon store need
a data-processing agreement with anyone?

_Why this matters: it is the cheapest moment to decide this, and the most expensive one to change
later — the same reasoning that put the tile host in ADR-031._

>

### Anything else?

Anything we did not ask that we should know before this is drawn or built — in particular anything
about who is allowed to see a zone, or about zones that must **not** be in the app at all.

>

---

## Part 4 · The first backend slice — host, region, basis, invite

The four decisions the deployment waits on. Each question’s context lives in the slot it fills in [ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md), and the host candidates are compared in [docs/host-candidates.md](docs/host-candidates.md).

### 1. Where it runs, and who operates it — question 3

**1.1 Which host — and is the managed-Postgres-behind-a-small-TypeScript-API shape adopted?**
>
**1.2 Which repository does the server code live in, and who writes it?**
>
**1.3 Who operates it day to day, and how are its secrets held and rotated?**
>

### 2. Region, processors and DPAs — question 16

**2.1 Which EU region — and does anything leave it?**
>
**2.2 Which processors does this add, and who signs their data-processing agreements?**
>

### 3. Lawful basis, per field — question 15

**3.1 Which basis, which purpose, and in whose words is it explained — per field?**
>
**3.2 Is redeeming an invite the recipient's affirmative action?**
>
**3.3 What may the connection between two accounts be used for — and never?**
>
**3.4 Deletion: rows naming an account deleted at the provider, sooner than the 12-month job (ADR-014)?**
>

### 4. The invite's mechanics — question 26

**4.1 One link per share, or per-person invites with per-person revocation?**
>
**4.2 How long may an invite link be used?**
>
**4.3 What may the sharer see about their recipients?**
>

### Anything else?

>


---

## Part 5 · Screen 04 on a phone — which screen a phone identifier walks, and the words that follow it

A picker who signs up *and* one who signs in with a phone number both walk screen 04 today: the frame’s
email state, headed “Verify your email”, with an action reading “Change email address” and a card at
the foot addressed to someone who signed up by phone *instead*. This part resolves which screen a
phone identifier walks, and which words follow it.

### Context

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

### Answering this part by looking

§1–§3 can be seen rather than imagined: in a development build, screen 03's **Phone** chip and the
sign-in screen's single field both lead to screen 04 as it stands, with the phone number where an
address would be. We can send a short screen recording instead if you would rather not run anything.

### 1. Which screen a phone sign-up sees — designer

#### 1.1 Which screen does a phone sign-up see — frame 04, or a screen the design has not drawn?

_Why this matters: it decides whether one screen's copy follows the identifier or there is a second
screen to draw, measure in every shipped language and keep in step from here on. The three shapes we
can build from are: **frame 04 with a phone state** (one screen, its words switching with the
destination); **frame 04 unsplit, exactly as drawn** (today's behaviour, with the email words kept and
the departure recorded rather than papered over); or **a phone verification screen of its own**, which
the design file has to contain before it is built, because composing it here would be inventing it._

>

#### 1.2 What does the design file give us to build that screen from?

_Why this matters: if a phone state is what you want, the words and the composition have to come from
somewhere we are allowed to read — the frame's own text layer, a second frame beside `5:22840`, or a
note in the file. If you would rather not draw it now, say so and we will keep the email words in
place and record the phone state as still unanswered rather than improvising it (AGENTS.md §8)._

>

### 2. Which screen a phone sign-in sees — owner and designer

#### 2.1 Does a returning user who typed a number arrive on the screen a sign-up walks?

_Why this matters: today they do — signing in ends on the same screen 04 the sign-up uses, because the
design owner chose “one screen plus frame 04” (ADR-034) — and that outcome was never decided for a
phone identifier: the returning picker reads the sign-up's words, the sign-up's eyebrow
(“ONBOARDING · 04 / 05”) and a card about signed-up-by-phone. The shapes: **one screen for both
journeys** (its words follow the journey and the identifier), **a sign-in version of the screen**, or
**the same screen for both, with the difference recorded** and no second screen to design._

>

#### 2.2 Must anything on the screen say which journey the picker is on?

_Why this matters: the same screen is step four of five for someone who is creating an account — which
continues to screen 05 — and the last step for someone signing in, who lands inside the app (ADR-034
§2.1). If the screen must say which, that is a string per journey and one more thing to translate; if
it need not, one screen serves both and nothing on it announces the difference._

>

#### 2.3 Do the two sign-in branches — a number and an address — differ from each other on this screen?

_Why this matters: it decides what the branch is. If a phone sign-in and an email sign-in see the same
screen, the branch in §3 belongs to the **journey** (this is a returning user) rather than to the
identifier, and the design needs one state instead of two._

>

### 3. What the copy says when the code travels by SMS — designer

The three strings below are the frame's own, and they are the ones no branch has a version of yet. The
sentences a branch *does* have — the heading and the supporting line — are already recorded in
ADR-048 §2 and are not asked again here.

#### 3.1 What does the screen's title say when the destination is a number?

_Why this matters: “Verify your email” is the frame's title and the screen prints it whatever the
picker typed, so on a phone journey it is not a claim we cannot support — it is the wrong subject
named outright. It is the only string here the copy audit of 2026-10-12 could not catch, because that
audit cleared claims about a message being sent (ADR-048) and this is a claim about which identifier
the account has. Options: a title per identifier, one title that fits both, or the frame's title kept
with the reason written down._

>

#### 3.2 What does the action back to the identifier say when the destination is a number?

_Why this matters: “Change email address” is the frame's wording, and it is the only way back to the
field the picker filled in. A phone journey's version names a number instead; one wording covering
both is possible; keeping the frame's words is a third answer, and it needs the reason recorded
because a reader who typed a number is being told to change something else._

>

#### 3.3 Does the card at the foot stay on a phone journey, change hands, or go?

_Why this matters: “Signed up by phone instead? The same six-digit step confirms a phone number.” is
the frame's only mention of the phone path, and on a phone sign-up it answers a question that picker
did not ask — while an email journey is exactly who it is written for. So the honest answers are: the
card belongs to the email journey only; it stays on both because the screen has nothing else to say
about the other path; or it goes, and the app says nothing about the other path at all._

>

#### 3.4 How is the destination printed when it is a number — as typed, or masked?

_Why this matters: the supporting line names the destination so the picker can see which account the
code belongs to, and ADR-048 §2 records that as the one thing that line is not allowed to lose. A
phone number is more identifying on a screen than an address is — a shoulder, a screenshot and a
shared screen all read it — so a masked form (`+358 ••• 45 67`) is a defensible answer, but it is the
app's own rule rather than the frame's, which means your word rather than ours._

>

### 4. The wait behind a resend — owner

#### 4.1 How long does the resend wait run, and who decides it?

_Why this matters: frame 04 catches a waiting resend mid-flight (“Resend code · available in 00:28”)
and never says how long the wait is, so the app's 60 seconds (`RESEND_COOLDOWN_SECONDS`) is this
repository's guess — and a send that has its own retry window makes the service's answer the honest
one, which is a call for whoever owns the service that sends (open question 12, and §4.1 of the
sign-in document). This is the half of open question 20 that is a number rather than a screen._

>

#### 4.2 What does a failed resend do to the wait?

_Why this matters: today the wait restarts the moment the action is used, which cannot tell “a new code
is on its way” from “the send failed”, and there is no API to report either yet. The answers on the
table: restart on use (today), restart only when a send is confirmed, or end the wait so the picker can
try again at once — the last one being a cost and an enumeration surface that needs a reason, since a
resend with no wait is a way to make the service send on demand (SECURITY.md §3)._

>

### Anything else?

Anything we did not ask that we should know before this screen is built for a phone identifier, or
before a code travels by SMS?

>
