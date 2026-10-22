# The zone service: what it has to return, and the calls only you can make

**Purpose:** A **Zone** is the app's one geographic thing, and **nothing returns one**. Every zone on
screen is the design's own demo composition, the containment rule has never run on a real position,
and three shipped things are waiting on a zone source: the map and its list (known issue 14), the
saved plan (a saved identifier the app cannot describe is named rather than dropped), and the first
backend slice, whose central record names a zone ([ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)).
This document has two halves: **§1 is the contract the app needs** — our reading, written so you can
correct it in one pass — and **§2 is the decisions only you can make**, because they are about data,
licensing, ground truth and what the app is allowed to claim.

**From:** the mobile team (this repository), **To:** the project owner.
**How your answers will be used:** §1 becomes
[ADR-036](docs/adr/ADR-036-the-zone-service-what-it-must-return.md) — the contract for the zone
service and the replacement for `DEMO_ZONES`; §2's answers set what the service may publish, who
curates it, and what a visit is allowed to say — recorded in [PROJECT.md](PROJECT.md) and, where they
are architecture, in the same ADR.

## Context

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

## How to answer

Answer under each `>`; partial answers are fine and “I don't know yet” is a real answer — say so
rather than skipping. **§1 is ours to be corrected**: if any line of it is wrong, the correction is
the most valuable thing in the document. §2 is yours; if the same date as the other three
questionnaires works, all four can travel together — they are sent together by
[to-questionnaires-cover-note.md](to-questionnaires-cover-note.md), which says what each decides. Every
question below also has a numbered slot in
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md), the one artifact that can
carry every answer back at once.

## 1. What the app needs from a zone service — our reading, to correct

### 1.1 The payload

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

### 1.2 The validation the app will do at the boundary

Whatever the service returns is **external input**, so it is validated before use, the way the visit
policy already is (SECURITY.md §4): a ring of at least three vertices, finite coordinates in range,
a non-empty identifier, an unknown extra field dropped rather than echoed, and a payload the app
cannot read treated as **no zones at all** — never as a zone it half-understands.

_Why this matters: the failure direction decides what a screen shows when the service misbehaves. We
are proposing “draw nothing and say nothing is known”, never “draw the last thing we had”._

>

### 1.3 What the app claims, and what only the server may claim

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

### 1.4 Staleness, change and history

A boundary will change: a zone is redrawn, split, retired. Our proposal: an identifier is
**immutable and never re-issued**, geometry carries a **version**, the app stores the zone identity
it saw at capture time (the same pattern as `policyVersion`), and a visit recorded under an older
boundary keeps saying so rather than being silently re-judged. A zone that no longer exists is
**named, not hidden** — that is already the saved plan's rule for an identifier the app cannot
describe.

_Why this matters: without a version, every stored visit silently changes meaning when a polygon
moves, and nobody can tell which boundary a past decision was made on._

>

### 1.5 Offline, and what a device may keep

Frame 13 promises downloaded regions, and a field app is used where there is no network, so the
service has to be answerable from data **kept on the device**: which zones (a bounding box? the whole
country?), how large that is, how long it stays valid, and what a visit made inside a
week-old boundary means. [ADR-031](docs/adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)
records that hosting our own tiles makes offline possible but that offline tiles are **not spiked
yet**.

_Why this matters: this is the one requirement that shapes the service's storage format, and it is
the one nobody can retrofit cheaply._

>

### 1.6 The four questions, for the fields the app itself keeps

The app stores a zone identifier in three places (the picker's plan, the queued report, a visit) and
a zone identifier alone is not personal data. **A visit to one is** — it is position-derived, which
is why ADR-010 and ADR-014 already govern it. Our reading: the identifier is readable by the app on
the device that holds it, correctable by removing the plan row, deletable by the existing controls,
and never sent anywhere yet. Nothing here needs a new field.

_Why this matters: AGENTS.md §11 asks these of every stored field, and “the zone id is fine” is
easier to confirm now than to reconstruct later._

>

## 2. What only you can answer

Ordered by what blocks the most work.

### 2.1 Where do the polygons come from?

Hand-traced by us, derived from an official or commercial dataset, traced from the design's own
drawing, or something else? If a dataset: which one, under what licence, and may we redistribute the
boundaries to devices? (OpenStreetMap data is ODbL — free to use, but attribution and share-alike
apply to derived data, and its *tile servers* are a separate, forbidden thing per ADR-031.)

_Why this matters: it decides whether the project owns a curator, a licence and an attribution line
— and whether a boundary can be redrawn at will or is somebody else's to change._

>

### 2.2 Who curates them, and in what tool?

Decision 10 keeps curation out of the field app, so where does it happen: the operator surface, a GIS
file imported by a script, a spreadsheet of coordinates? Who is the person, how often do they touch
it, and what change would need a second pair of eyes?

_Why this matters: “a zone service” is really “a polygon store plus the process that fills it”. The
process is the part that exists forever, and it needs an owner with a name._

>

### 2.3 What does a zone's geometry mean on the ground?

Is a zone an administrative area, a habitat, or a picking ground? Is the line **authoritative**
(“inside the line is inside the zone”) or **indicative** (a rough boundary the app should not be
precise about)? And how was it drawn — surveyed, traced on a map, or eyeballed — which sets how
precise a claim may be.

_Why this matters: the app's copy, the visit rule and any dispute all rest on this. “Zone 14 · 42 min”
means very different things if the boundary is a cadastral line than if it is a circle someone drew
around a berry slope._

>

### 2.4 May zones overlap, and may they nest — and does anything below a zone exist?

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

### 2.5 Is the boundary a line, or a line with a margin?

A phone's position is accurate to roughly 5–20 m in open ground and worse under canopy, so a walk
along a zone's edge flickers in and out. Should the server treat a point just outside as inside (a
tolerance, and how much), should the geometry itself carry a soft edge, or is the drawn line final
and the flicker is what you get?

_Why this matters: the dwell minimum already absorbs short flickers by design, but a margin is a
different, cheaper fix — and it changes what “you were in Zone 14” is worth at the edge._

>

### 2.6 May we publish the boundaries?

The polygons would be visible on every device, so anyone can read where the good ground is. That
concentrates picking: an empty forest becomes a busy one, and a curated zone can be stripped. Should
the app draw zone **outlines**, only a position relative to a zone (“you are 200 m outside”), or
nothing at all until a picker is inside one? The design draws outlines on frames 06–10.

_Why this matters: it is the one place where the data we publish can damage the thing the app is
about, and it is an owner call rather than a design detail. Your answer here is also the ceiling for
what may leave the device when something is shared — the community-map document's §1.5 (“Public”)
inherits it — so a shared spot may never be more precise than this allows._

>

### 2.7 What may a visit be used for, and who may read one?

Is a visit evidence — for a reward, a quota, a seller's trust score, a dispute? Who may read a
visit besides the picker who made it (other pickers see counts on a map, never visits today)? What
does the app owe a user whose visit is questioned?

_Why this matters: it decides how much the boundary and the accuracy question (§2.3, §2.5) have to
carry, and whether “probabilistic, not proof” (decision 8) is acceptable to the thing that pays out._

>

### 2.8 Which season states are real?

The design's legend colours zones “Unpicked”, “Recently picked” and “Ripening”, and the app currently
treats that state as the zone's **own property** (the design's sample). Is it really a property of the
place — curated, like a habitat classification — or is it **derived** from pickers' reports, which
would make it a different service (the report stream) and a different disclosure?

_Why this matters: if it is derived, the map's colours are a claim about other people's reports and
the “11 reports this week” figures become load-bearing; if it is curated, someone has to maintain a
season state per zone, forever._

>

### 2.9 Hosting and region

Polygons and the basemap both need storage; ADR-031 has us hosting the tiles. Same object storage and
same region for both, or different? Which region (open question 16), and does the polygon store need
a data-processing agreement with anyone?

_Why this matters: it is the cheapest moment to decide this, and the most expensive one to change
later — the same reasoning that put the tile host in ADR-031._

>

## Anything else?

Anything we did not ask that we should know before this is drawn or built — in particular anything
about who is allowed to see a zone, or about zones that must **not** be in the app at all.

>
