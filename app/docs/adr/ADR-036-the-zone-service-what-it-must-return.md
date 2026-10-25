# ADR-036 — The zone service: the payload, the ground truth and the calls behind it — the answers, recorded in one place

- **Status:** **Proposed — a skeleton, not a decision.** Every `> _pending_` below is a slot for an
  answer to [to-questionnaire-zone-service.md](../../to-questionnaire-zone-service.md) — and §1's are
  ours to be corrected. A section becomes `Recorded` the day its answers arrive; the ADR is
  `Accepted` when §1 is confirmed or corrected and §2 is answered or explicitly deferred. Nothing is
  built by it, and no zone is fetched, stored or sent until they are.
- **Date:** 2026-10-11 (skeleton). Each recorded answer carries the date it arrived.
- **Deciders:** the project owner — both sections (§1 is this repository's reading, written so it can
  be corrected in one pass) — covering PROJECT.md open questions 9, 16 and the visit-use half of 15,
  and known issues 12, 14, 28 and 30. This repository writes the slots and records the answers; it
  decides none of them, and an unanswered slot keeps the demo composition on screen rather than
  defaulting to something invented.

## Context

A **Zone** is the app's one geographic thing, and **nothing returns one**. Every zone on screen is the
design's own demo composition — `DEMO_ZONES` in
[src/features/discover/domain/zone.ts](../../src/features/discover/domain/zone.ts), twice amended and
recorded in [docs/design-source.md](../design-source.md), classified in
[docs/demo-and-stand-ins.md](../demo-and-stand-ins.md) as `A2`, the design's sample, disclosed on the
screens that show it. The containment rule has never run on a real position
(`src/features/visits/domain/zone-containment.ts`: point-in-polygon, boundary counts as inside, ≤3
vertices degenerate, antimeridian crossing unsupported, and the winner when a point is inside two of
them chosen by a rule the **caller supplies** — `ZoneResolution`, whose default is the first zone the
server sent, a documented assumption rather than a requirement, open question 9), and the visit state
machine is tested with no caller
(`visit-lifecycle.ts`), because there are no real zones to enter.

Three shipped things are waiting on a zone source, and this ADR is the answer to all three: the map
and its list (known issue 14 — the zones, their identifiers, the score and the card's species are the
demo); the saved plan (a saved identifier the app cannot describe is named rather than dropped —
known issue 28); and the first backend slice, whose central record names a zone
([ADR-032](ADR-032-the-first-backend-slice.md)). The real basemap is decided and deliberately not
built ([ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)); its **first prerequisite is
exactly this — zone geometry to draw on the tiles** (known issue 30).

What the questionnaire holds, and this ADR records: **§1 is the repository's reading of what a
service has to return** — the payload, the validation the app will do at the boundary, what the app
may claim versus what only the server may claim, staleness and history, offline, and the four
questions AGENTS.md §11 asks of every stored field — written so a correction can replace it in one
pass. **§2 is the owner's**: where polygons come from and under what licence, who curates them,
what the geometry means on the ground, whether zones may overlap or nest, boundary margins, whether
boundaries may be published at all, what a visit may be used for, which season states are real, and
hosting with its region. The geography's other half — whether anything curated exists below a zone —
is §2.4 here, and the *shared-spot* half is
[to-questionnaire-community-map.md](../../to-questionnaire-community-map.md) §1.2's; the two meet
only at the share's field.

**This skeleton exists before the answers for the same reason
[ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) does:** an answer that arrives
as a reply has to become a recorded decision the same day, without re-deriving which constant, screen,
validator, test or open question it changes. That work is enumerated once, below.

Two things this file is not. It is **not a decision**: nothing is chosen here, and reading a
confirmed line as a recommendation would be wrong — the owner's words are the decision, transcribed.
And it is **not a rewrite of ADR-021 or ADR-031**: the map drawn from the design's geometry and the
OSM-derived tiles the project will host stand; an answer that contradicts one of their assumptions is
recorded here and noted in that ADR's status block.

## How this skeleton is filled in

1. **Answer to slot.** Paste the answer at its `> _pending_`, verbatim, with the date — for §1, a
   **confirmation counts**: a line the owner confirms is recorded as confirmed, and a correction
   replaces the reading rather than sitting beside it. Partial and per-question answers stay partial,
   and a deferred slot stays `pending` rather than being guessed. An answer that fits no slot is
   recorded under *Anything else* below. The section numbers are the questionnaire's own; the
   [response sheet](../../to-questionnaires-response-sheet.md) prefixes them with this part's letter
   (`C`), so §2.4 arrives as `C2.4`.
2. **A confirmed §1 becomes the service's contract, and the app's half of it is written test-first.**
   Whatever the service returns is external input: the payload validator lands beside the domain the
   way [visit-policy.ts](../../src/features/visits/domain/visit-policy.ts) validates a server policy
   ([SECURITY.md](../../SECURITY.md) §4), with its cases written before the implementation — and a
   payload the app cannot read is treated as **no zones at all**, never as a zone it half-understands
   (the failure direction §1.2 proposes).
3. **The constant is replaced, not the screen.** `DEMO_ZONES` and its dependents
   (`src/features/discover/domain/saved-spots.ts`, the screens that read it) take the real source;
   the `A2` entry in [docs/demo-and-stand-ins.md](../demo-and-stand-ins.md) moves out of “the
   design's sample”, the note in [docs/design-source.md](../design-source.md) on the demo's two
   additions changes with it, and the screens stop disclosing a sample they no longer show only when
   the data is really real — the “SEASON DEMO” disclosure is the map's own honesty, not decoration.
4. **Containment's assumption is replaced by §2.4 and §2.5.** `zone-containment.ts`'s “first matching
   zone wins” is open question 9; the answer decides what happens inside two zones at once and whether
   a margin softens the edge, and the rule's cases move **first**. Half of that is in place already:
   the choice is a rule the caller supplies (`ZoneResolution`, defaulting to the server's order), and
   the cases for a curated unit below a zone are written in `zone-containment.test.ts` — so §2.4's
   answer replaces one rule rather than the geometry. The visit state machine gains its caller only
   when position capture ships — which is gated on question 15's lawful basis and the consent, not on
   this ADR.
5. **Publication and seasons carry their own consequences.** §2.6 is the ceiling for what may leave
   the device when something is shared (the community-map document's §1.5 inherits it), and the ODbL
   attribution line is part of the map wherever derived data is drawn (ADR-031). §2.8 decides whether
   the map's season colours are a curated property of the place or derived from pickers' reports — if
   derived, they belong to a different service and the figures on the map become load-bearing.
6. **PROJECT.md.** Update open question 9 (overlap and nesting), question 16 (§2.9's hosting and
   region), the visit-use half of question 15 (§2.7), and question 22's clause about where zones come
   from and what a score means once the server owns it. Known issues 12, 14 and 28 narrow to whatever
   the source still cannot describe, known issue 30 loses its first prerequisite, and this ADR's row
   moves from *Proposed* to *Accepted* in [docs/adr/README.md](README.md) and in PROJECT.md's decision
   table as its sections fill.

## Decision

### 1. What the app needs from a zone service — our reading, to correct

**1.1 The payload.** One zone as the app could consume it: `id` (stable, never reused, never
re-issued to a different area), `number` (what the card and list print as “Zone 14”), `place` (the
ground's own name, if it has one), `ring` (exterior ring, closing vertex optional), `version` (which
boundary this is), `species` (what grows here, in the app's species vocabulary). Every field is
already drawn by a screen, and two of them are already stored — the identifier in the picker's plan
and in every queued report.

> _pending — questionnaire §1.1 (correct it, or confirm it)_

**1.2 The validation the app will do at the boundary.** A ring of at least three vertices, finite
coordinates in range, a non-empty identifier, an unknown extra field dropped rather than echoed, and
a payload the app cannot read treated as no zones at all.

> _pending — questionnaire §1.2 (correct it, or confirm it)_

**1.3 What the app claims, and what only the server may claim.** The app may say “you were in Zone 14
for 42 min, judged against policy v3” — the device's own reading, with the policy version attached.
The app may not say a visit is confirmed, verified or worth anything (verification is probabilistic,
decision 8), and may not say a zone's yield, ripeness or freshness unless a service said so.

> _pending — questionnaire §1.3 (correct it, or confirm it)_

**1.4 Staleness, change and history.** An identifier is immutable and never re-issued, geometry
carries a version, the app stores the zone identity it saw at capture time (the same pattern as
`policyVersion`), a visit recorded under an older boundary keeps saying so, and a zone that no longer
exists is named, not hidden.

> _pending — questionnaire §1.4 (correct it, or confirm it)_

**1.5 Offline, and what a device may keep.** Which zones a device keeps (a bounding box? the whole
country?), how large that is, how long it stays valid, and what a visit made inside a week-old
boundary means — the one requirement that shapes the service's storage format and the one nobody can
retrofit cheaply.

> _pending — questionnaire §1.5 (correct it, or confirm it)_

**1.6 The four questions, for the fields the app itself keeps.** The app stores a zone identifier in
three places (the plan, the queued report, a visit); a zone identifier alone is not personal data,
but **a visit to one is** — position-derived, already governed by ADR-010 and ADR-014. The reading:
readable by the app on the device that holds it, correctable by removing the plan row, deletable by
the existing controls, and sent nowhere yet.

> _pending — questionnaire §1.6 (correct it, or confirm it)_

### 2. What only the owner can answer

**2.1 Where do the polygons come from?** Hand-traced by us, derived from an official or commercial
dataset, traced from the design's own drawing, or something else? If a dataset: which one, under what
licence, and may the boundaries be redistributed to devices?

> _pending — questionnaire §2.1_

**2.2 Who curates them, and in what tool?** Decision 10 keeps curation out of the field app; the
answer names the surface, the person, how often they touch it, and what change needs a second pair of
eyes — “a zone service” is really “a polygon store plus the process that fills it”.

> _pending — questionnaire §2.2_

**2.3 What does a zone's geometry mean on the ground?** An administrative area, a habitat, or a
picking ground — and is the line authoritative (“inside the line is inside the zone”) or indicative?
It sets what the app's copy, the visit rule and any dispute may claim.

> _pending — questionnaire §2.3_

**2.4 May zones overlap, and may they nest — and does anything below a zone exist?** Open question 9.
If zones may overlap: which one wins (the smallest? the most specific? the server's order?) — today
the app's only rule is the first zone the server sent, and the rest are offered to a rule the caller
supplies (`ZoneResolution`), so the choice is already the caller's rather than the loop's. Whether
anything curated exists below a zone changes this service's payload and who does the curation work.

> _pending — questionnaire §2.4_

**2.5 Is the boundary a line, or a line with a margin?** A phone's position is accurate to roughly
5–20 m in open ground and worse under canopy, so a walk along a zone's edge flickers in and out — a
tolerance, a soft edge, or the drawn line is final and the flicker is what you get.

> _pending — questionnaire §2.5_

**2.6 May we publish the boundaries?** The polygons would be visible on every device; the design draws
outlines on frames 06–10. An owner call, and the ceiling for what may leave the device when something
is shared.

> _pending — questionnaire §2.6_

**2.7 What may a visit be used for, and who may read one?** Evidence for a reward, a quota, a
seller's trust score, a dispute — and who besides the picker may read it, and what the app owes a
user whose visit is questioned.

> _pending — questionnaire §2.7_

**2.8 Which season states are real?** The legend colours zones “Unpicked”, “Recently picked” and
“Ripening”, and the app currently treats that state as the zone's own property (the design's sample).
Curated like a habitat classification, or derived from pickers' reports — which would make it a
different service and a different disclosure.

> _pending — questionnaire §2.8_

**2.9 Hosting and region.** Polygons and the basemap both need storage (ADR-031 hosts the tiles);
same object storage and region for both, or different? Which region (open question 16), and does the
polygon store need a data-processing agreement with anyone?

> _pending — questionnaire §2.9_

### Anything else — questionnaire §C-else

Anything the fifteen above do not cover — in particular anything about who is allowed to see a zone,
or about zones that must **not** be in the app at all.

> _pending — questionnaire §C-else_

## What no answer can change

Recorded so that an answer arriving under time pressure cannot be transcribed into something the
code, the decisions or the law already contradicts:

- **A zone is authoritative, operator-maintained and has a stable identity** — not derived from data
  and not user-created (domain decision 1).
- **Curation is a privileged capability and never ships in the field app**
  ([ADR-012](ADR-012-privileged-surface.md), decision 10).
- **Position is derived into one coarse centroid per segment, never a trace**
  ([ADR-010](ADR-010-position-retention.md)), and **retention is 12 months**
  ([ADR-014](ADR-014-retention-policy.md)).
- **The visit policy is server-owned and versioned** (decision 16); the app records decisions against
  the version it saw rather than shipping its own.
- **Verification is probabilistic, not proof** (decision 8): no answer makes the app able to say a
  visit is confirmed or worth anything.
- **Whatever the service returns is external input and is validated at the boundary** before use
  ([SECURITY.md](../../SECURITY.md) §4). How the failure direction behaves is §1.2's answer;
  validating at the boundary is not negotiable.
- **The app sends nothing today** and this ADR does not change that: a zone service is a server, and
  a server brings a region, a processor, a DPA and a lawful basis with it (questions 3, 15 and 16).

## Alternatives considered

Nothing is chosen by this ADR, so the alternatives are the ones the answers are chosen *against*.
Record here, per area, the option that was passed over and the reason given — a rejected alternative
with a reason is what makes a later reversal cheap to argue:

> _pending — where the polygons come from · questionnaire §2.1_

> _pending — curated, or derived from reports · questionnaire §2.8_

> _pending — the polygon store's home and region · questionnaire §2.9_

## Consequences

- **Today:** one file that turns a reply into a record the same day. Nothing else changes — no zone
  is fetched, stored or sent; the screens keep showing the design's sample **and saying so**.
- **Whatever the answers are:** the position rule, the retention ceiling, the curation boundary and
  the client's claim ceiling are unchanged. A dataset answer adds a licence and possibly an
  attribution line to the map; a derived-seasons answer moves a figure to a different service; a
  margin answer adds a check to the containment rule.
- **What it unblocks, when answered:** the map and its list stop being the design's composition
  (known issues 12 and 14); the saved plan can describe what it holds (known issue 28); containment
  gets its first real caller and the visit state machine a real entry; the backend slice's grant has
  a zone that means something; and [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)
  loses its first prerequisite (known issue 30).
- **What stays open after it:** the basemap build and its offline-region spike, the operator surface
  that curates the polygons, and position capture itself — gated on the lawful basis, not on this
  service.
- **The cost of an unanswered section is that it gets asked again.** An unrecorded answer is not a
  deferred decision; it is a decision someone has to re-make, and every zone on screen stays the
  design's sample in the meantime.

## Related

- [to-questionnaire-zone-service.md](../../to-questionnaire-zone-service.md) — the ask this ADR
  records
- [to-questionnaires-response-sheet.md](../../to-questionnaires-response-sheet.md) — the same
  questions as `C1.1`–`C2.9`, and the one artifact that can carry every answer back at once
- [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) (the drawn map this data replaces) and
  [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) (the real basemap whose first
  prerequisite this answer is)
- [ADR-032](ADR-032-the-first-backend-slice.md) and
  [ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) — the slice that names a zone,
  and the deployment decisions that share §2.9's region question
- ADR-010 (position), ADR-012 (curation stays out of the field app), ADR-014 (retention)
- PROJECT.md — open questions 9, 15 (the visit-use half), 16 and 22 (the data-source clause), known
  issues 12, 14, 28 and 30
- [docs/demo-and-stand-ins.md](../demo-and-stand-ins.md) — the `A2` entry that moves when
  `DEMO_ZONES` does
- The other three skeletons: [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md)
  (signing in), [ADR-035](ADR-035-shared-spots-the-frame-and-the-sharing-model.md) (shared spots)
