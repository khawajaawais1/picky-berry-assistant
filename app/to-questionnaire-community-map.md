# Shared spots: the frame to draw, and who may see them

**Purpose:** The owner wants pickers to be able to see places other pickers picked, when those
pickers choose to share them — the design's own **community map** idea, **not** a live map of people.
The design file draws that sharing *model* (frame 14's “Default spot visibility” block) but no share
control, no invite list and no community map, so this resolves what to build without inventing a
design or a requirement.

**From:** the mobile team (this repository), **To:** the Figma design owner (section 1) and the
project owner (section 2) — one document; answer the sections that are yours.

**How your answers will be used:** they become
[ADR-035](docs/adr/ADR-035-shared-spots-the-frame-and-the-sharing-model.md), the frame(s) the app
builds, and the requirements entry in [PROJECT.md](PROJECT.md) (recorded there on 2026-10-10 as a
requirement candidate, open question 26).

## Context

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

## How to answer

Answer under each `>`; partial answers are fine. If the same date as the sign-in questionnaire works
(**2026-10-17**), these two can travel together — and all four do:
[to-questionnaires-cover-note.md](to-questionnaires-cover-note.md) sends them together and says what
each one decides. Every question below also has a numbered slot in
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md), the one artifact that can
carry every answer back at once.

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

## 1. What to draw — designer

### 1.1 Is the community map a frame of its own, or frame 06's map with other people's spots on it?

_Why this matters: it decides whether the map screen grows a second layer (the picker's own zones,
then spots shared with them) or whether there is a screen to design from scratch — and the app's map
is currently an illustration of the design's geometry, so either answer changes what that drawing
has to become._

>

### 1.2 What is a “spot” — the zone itself, or a place inside it that the sharer names?

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

### 1.3 What does a viewer see on a shared spot?

_Why this matters: a spot with no words is a pin; a spot with too much is a report. Say which of
these it carries: the zone's own card (frame 06's), the sharer's name or initials, how long ago it
was picked, a note the sharer typed, the species. Anything drawn is copy the app must have, and the
app may not invent copy the design has not drawn._

>

### 1.4 Where does the sharing control live — frame 07's screen, frame 14's default, or both?

_Why this matters: frame 14 draws a **default** (Private / Shared / Public) and frame 07 draws the
zone's own screen with a bookmark on it. Per-spot sharing is a control on the spot; a default is a
setting. The two answer different questions and the app should not draw both unless the design says
they are both wanted._

>

### 1.5 Does the design still hold all three states, or two — and what does “Public” draw?

_Why this matters: the owner has decided “people you invite” and left “Public: visible on the
community map” undecided. If the frame keeps all three, the app has to be able to draw a public
state honestly (who may see it, what it claims, how it is turned off); if it ships two, the frame
should not draw a third that means nothing — the reason the block is undrawn today._

>

### 1.6 What is the invite flow's surface, if any?

_Why this matters: “people you invite” implies a list to manage — who is on it, how they get there,
how one is removed, and what an invite looks like to the person receiving it. The app has no
contacts, no profile page and no notifications today; if the design does not hold this, the app
cannot honestly draw it and the answer may be that the invite list is simply a list of accounts the
user types in._

>

### 1.7 Which states must the frame draw that the app cannot avoid?

_Why this matters: a spot nobody has shared yet (empty), a spot whose sharer removed it while
someone was looking at it, a spot for a zone the viewer's app does not know, and a failure to load
shared spots at all. These are the states we may not invent, and they are the ones a frame usually
leaves out._

>

## 2. What it commits us to — project owner

### 2.1 Is this v1, or recorded for later?

_Why this matters: it is the first feature that needs a server, an account for the person you share
with, and a lawful basis for storing someone else's view of your spot — so it also decides what has
to be built before it (zone service, backend, authentication) and what waits. The server and the
account are now specified or decided elsewhere ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md),
ADR-013) and the lawful basis is open question 15; what is left here is scope._

>

### 2.2 Does a shared spot expire, and can it be taken back?

_Why this matters: the app's retention rule is 12 months (ADR-014) and applies to anything stored
server-side. Revoking has to be as easy as sharing (AGENTS.md §11.1) — say whether a shared spot
ends when the season does, when the sharer removes it, or at a chosen date._

>

### 2.3 Who can be invited — any account, or only people the user already knows outside the app?

_Why this matters: an invite needs an identifier for the other person (an email address or a phone
number is personal data we would process *about someone who has not asked us to*). Saying “only
people you already know, invited by a link” is a different data story from a search over all
accounts, and it decides whether the app needs a “find a picker by name” screen at all. ADR-032
already **assumes** the link — a code the sharer sends themselves, stored hashed and never looked
up — and rejected an address lookup for exactly this reason (its decision 5, marked an assumption
because this question asks you directly); an answer of “invite by address” supersedes that
assumption in a new ADR rather than being built beside it._

>

### 2.4 What does the viewer know about the sharer — their name, their initials, or nothing?

_Why this matters: it decides what the app stores and shows about a third person, and whether a spot
shared with a group is attributable at all. Anonymity is not a privacy freebie: an anonymous spot
still tells the viewer that someone was there._

>

## Anything else?

Anything we did not ask that we should know before this is drawn or built?

>
