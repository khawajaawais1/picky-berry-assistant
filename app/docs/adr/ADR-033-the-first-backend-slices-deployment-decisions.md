# ADR-033 — The first backend slice's deployment decisions: host, region, basis, invite

- **Status:** **Proposed — a skeleton, not a decision.** Every `> _pending_` below is a slot for an
  answer to [to-questionnaire-backend.md](../../to-questionnaire-backend.md). An area becomes
  `Recorded` the day its answers arrive; the ADR is `Accepted` when all four are answered or
  explicitly deferred. Nothing is built and no processor exists until they are.
- **Date:** 2026-10-11 (skeleton). Each recorded answer carries the date it arrived.
- **Deciders:** the project owner — all four areas (questionnaire §1–§4; PROJECT.md open questions
  3, 5, 15, 16 and 17, and 26's mechanics half). This repository writes the slots and records the
  answers; it decides none of them, and an unanswered slot keeps the deployment blocked rather than
  defaulting.

## Context

[ADR-032](ADR-032-the-first-backend-slice.md) specified the first backend slice — one **share
grant**, one server-enforced access rule, accounts as identity-provider subjects — and named four
things it could not decide: **where the backend lives and who operates it** (question 3), **the
region, processors and DPAs** (question 16), **the lawful basis for each field** (question 15), and
**the invite's mechanics** (question 26's mechanics half, which the design document does not own).
The rule is written and tested in this repository as the specification the server enforces (24 cases
in `src/features/sharing/domain/__tests__/share-access.test.ts`), the wire contract is
[docs/api-contract.md](../api-contract.md), and none of it is deployed: no host, no region, no DPA,
no lawful basis, and an app that still sends nothing (SECURITY.md §17).

The four are asked of the owner in one document, which travels with three others under one deadline
(2026-10-17): [`to-questionnaire-backend.md`](../../to-questionnaire-backend.md), sent by
[`to-questionnaires-cover-note.md`](../../to-questionnaires-cover-note.md) alongside the sign-in,
community-map and zone-service documents. **This ADR exists before the answers for one reason:** an
answer that arrives as a reply has to become a recorded decision the same day, without re-deriving
which document, field, status line or test it changes. That work is enumerated once, below.

Two things this file is not. It is **not a decision**: nothing is chosen here, and reading a filled
item as a recommendation would be wrong — the owner's words are the decision, transcribed. And it is
**not a rewrite of ADR-032**: that ADR's slice, its rule, its refusals and its data-minimum stance
stand. An answer that contradicts one of ADR-032's recorded assumptions (decision 5's invite
mechanism, and the host shape in its *Alternatives for the host*) replaces the assumption; the
replacement is recorded here and noted in ADR-032's status block — never by editing ADR-032's
decision text (the [ADR rules](README.md)).

## How this skeleton is filled in

1. **Answer to slot.** Paste the owner's answer at its `> _pending_`, verbatim, with the date. Partial
   or per-field answers stay partial: a field answered and a field deferred are both recorded, and a
   deferred slot stays `pending` rather than being guessed.
2. **Contradiction with ADR-032, if any.** Record the replacement here, and add `Superseded by
   ADR-033` to the *assumption's* line in ADR-032's status block. The host shape and decision 5 are
   the only places ADR-032 assumed anything the owner may overrule.
3. **The contract moves with the answer.** Delete the answered item from
   [docs/api-contract.md](../api-contract.md) §8, and change §4/§5 if a field or endpoint moves —
   per-person invites add a scope on `redemptions`; a shorter invite window adds a check. A new
   mechanic is added to `share-access.test.ts` **first** (the rule's cases are the conformance suite
   the server must satisfy, so its behaviour is test-first, not prose).
4. **PROJECT.md.** Update open questions 3, 5, 15, 16 and 17, and 26's mechanics half — the set the
   questionnaire promises — and move this ADR's own row in the decision table from *Proposed* to the
   decisions it records, as its row in [docs/adr/README.md](README.md) moves from Proposed to
   Accepted.
5. **A processor is a line in two places.** A host that is a new processor, or a region outside the
   one recorded, lands in question 16's list *and* in the privacy notice, whose sign-off is question
   15's. A function host separate from the database is a second line.
6. **SECURITY.md §17 changes with the transport, not with this ADR.** A fully answered ADR here still
   leaves the app sending nothing; the queue's transport (ADR-005) and the sharing UI are separate,
   unbuilt slices.

## Decision

### 1. Host and operator — question 3 · questionnaire §1

ADR-032 assumes, and has not adopted: a **managed SQL database in an EU region behind a small
TypeScript API**, one language for the rule and one place to enforce it; the catalogued candidate is
a managed Postgres with a free tier and a selectable EU region. ADR-015 keeps the server code out of
this repository. The candidates and what each commits us to — region, DPA, cost at this slice's size,
and an always-answering database — are compared in
[docs/host-candidates.md](../host-candidates.md), written for the owner to approve.

**1.1 Which host, and is the shape adopted?** Also record where the per-account and per-address rate
limit the contract requires is enforced (§6 of the contract — required before public, not a later
hardening pass).

> _pending — questionnaire §1.1_

**1.2 Which repository does the code live in, and who writes it?**

> _pending — questionnaire §1.2_

**1.3 Who operates it day to day, and how are its secrets held and rotated?** If the answer is
“nobody”, record that: an unowned service is a risk recorded rather than removed.

> _pending — questionnaire §1.3_

### 2. Region, processors and DPAs — question 16 · questionnaire §2

**2.1 Which EU region, and does anything leave it?** Backups and replication included, with their
lifetime and who deletes them. ADR-031's [tile storage](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)
and the zone service's polygon store may share the location (zone-service §2.9).

> _pending — questionnaire §2.1_

**2.2 Which processors does this add, and who signs their DPAs?** The database host, a function host
if separate, and the identity provider already decided (ADR-013). Each is a line in the privacy
notice and in question 16.

> _pending — questionnaire §2.2_

### 3. Lawful basis, per field — question 15 · questionnaire §3

The fields this slice stores: the sharer's **subject**; the **zone id** (with the subject, a
statement about a place a person picked); the **invite hash** (a credential, not an identifier); a
recipient's **subject**; and **the connection itself** — two accounts linked by a share is personal
data about someone who never asked us for anything.

**3.1 Per field: which basis, which purpose, and in whose words is it explained?** Per-field
differences are fine; say so field by field. The design may need a sentence it does not have.

> _pending — questionnaire §3.1_

**3.2 Is redeeming an invite the recipient's affirmative action?**

> _pending — questionnaire §3.2_

**3.3 The connection: what may it be used for, and what may it never?** Today nothing reads it
beyond the share itself — no analytics, no operator surface, no log.

> _pending — questionnaire §3.3_

**3.4 Deletion: rows naming a deleted account at the provider — sooner than the 12-month job?**
(ADR-014's window; question 17's deletion path names it either way.)

> _pending — questionnaire §3.4_

### 4. The invite's mechanics — question 26 (mechanics half) · questionnaire §4

The contract assumes **one link per share**, a 256-bit code stored only as a hash, sent in a URL
fragment, redeemable by more than one person until revocation or expiry, redeeming twice the same as
once. ADR-032 records that as an **assumption**, and the read rule does not depend on any of it.

**4.1 One link per share, or per-person invites with per-person revocation?** A “now or later”, not a
“can it work”.

> _pending — questionnaire §4.1_

**4.2 How long may an invite link be used?** Today: until the share ends, at most a year.

> _pending — questionnaire §4.2_

**4.3 What may the sharer see about their recipients?** Nothing on the wire today; a count would be
safe, names would be new data needing a basis above.

> _pending — questionnaire §4.3_

### 5. What no answer can change

Recorded so that an answer arriving under time pressure cannot be transcribed into something the
code already contradicts. Each is decided and tested, and a change to any of them is a new ADR
rather than this one's content:

- **The rule is the specification.** `share-access.ts` is authoritative; the server must satisfy the
  same cases and a server that disagrees is wrong rather than different. The app may use the same
  answers to draw, and may not treat them as a check (SECURITY.md §3).
- **Default deny, and one refusal on the wire.** Missing, not-yours, expired, revoked and unreadable
  are distinct internally and a single `404` externally.
- **No endpoint takes a coordinate** (SECURITY.md §10), and **no account row exists** — no email, no
  phone number, no name, no profile in this slice.
- **No wire response names another account** — no identifier of anybody but the caller.
- **Retention:** `expires_at ≤ shared_at + 12 months`, and the scheduled job deletes the rows and
  their redemptions (ADR-014).
- **The invite code is a credential:** random, hashed at rest, sent in a fragment, never logged,
  never stored by the app, and returned exactly once.
- **No secret enters this repository or the app bundle.** `EXPO_PUBLIC_*` values are public by
  definition (AGENTS.md §5); server credentials are the host's and the operator's, not the app's.

## Alternatives considered

Nothing is chosen by this ADR, so the alternatives are the ones the answers are chosen *against*, and
they already exist: ADR-032's *Alternatives considered* (Firestore with the provider's own security
rules, invites by email address, an account table with profiles, client-side enforcement, the API in
this repository, a stand-in local service, a generic permission table) and its *Alternatives for the
host, once the owner decides* (the managed-database shape, and a serverless function host in front of
it).

Record here, per area, the option the owner **passed over** and the reason they gave — a rejected
alternative with a reason is what makes a later reversal cheap to argue, and what stops the same
comparison being run again:

> _pending — host and operator · questionnaire §1.1_

> _pending — region and processors · questionnaire §2.1_

> _pending — invite mechanics · questionnaire §4.1_

## Consequences

- **Today:** one file that turns a reply into a record the same day. Nothing else changes — no host,
  no processor, no region, no basis, nothing built, and the app still sends nothing.
- **Whatever the answers are:** the rule, the refusals, the 12-month ceiling, the no-coordinate
  stance and the data minimum are unchanged. A per-person invite mechanism adds a scope to
  `redemptions` and its cases to the suite; a shorter invite window adds a check. Neither changes the
  read rule.
- **An answered ADR still does not make the feature reachable.** The app's transport is ADR-005's
  queue, unbuilt, and sharing has no design frame — the community-map document's §1 decides what is
  drawn and where the control lives. This ADR is the precondition for a deployment, not for a screen.
- **The cost of an unanswered area is that it gets asked again.** An unrecorded answer is not a
  deferred decision; it is a decision someone has to re-make, and the slice's deployment stays
  blocked in the meantime.
- **An operator exists or the risk is recorded.** If §1.3's answer is “nobody yet”, that is written
  down as the operational risk it is, rather than read as a licence to deploy anyway.

## Related

- [ADR-032](ADR-032-the-first-backend-slice.md) — the slice these four answers unblock, and the
  assumptions they may replace
- [docs/api-contract.md](../api-contract.md) — the wire contract, its §8 blocking list and its
  conformance suite
- [docs/adr/README.md](README.md) — the rule that an accepted ADR is superseded, never rewritten
- ADR-013 (identity provider), ADR-014 (retention), ADR-015 (this repository is the mobile app),
  ADR-005 (the queue's unbuilt transport), ADR-031 (the tile storage that shares question 16),
  ADR-006 (where a real token must be kept before one exists)
- [to-questionnaire-backend.md](../../to-questionnaire-backend.md) and
  [to-questionnaires-cover-note.md](../../to-questionnaires-cover-note.md) — where the answers come
  from, and when
- PROJECT.md — open questions 3, 5, 15, 16, 17 and 26; known issue 31
