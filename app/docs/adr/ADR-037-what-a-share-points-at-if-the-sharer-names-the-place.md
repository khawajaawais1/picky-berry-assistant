# ADR-037 — What a share points at, if the sharer names the place: the grant's record, and the read rule that does not move

- **Status:** **Proposed — prepared in advance for one branch, not a decision.** Written for the case
  where [to-questionnaire-community-map.md](../../to-questionnaire-community-map.md) §1.2 answers
  that a shared spot is *a place inside the zone that the sharer names*. It is **activated** (status
  → `Accepted`, dated) only when that answer arrives together with §1's frame; if §1.2 answers “the
  zone itself”, or both questionnaires together answer that a share points at an operator-curated
  unit below a zone, it is **withdrawn**, and its status line records the answer it lost to. Nothing
  is decided by it, and no field, byte or sentence moves until the answer arrives.
- **Date:** 2026-10-11 (prepared). Activation records the answer's own date against it.
- **Deciders:** the Figma design owner owns §1.2 — the answer that activates or withdraws this
  document. This repository prepared the shape so that the answer becomes a record the same day
  rather than a derivation; it decides none of the questions the preparation waits on.

## Context

[ADR-032](ADR-032-the-first-backend-slice.md) decision 6 left exactly one thing open in the share
record, on purpose: **what a share points at.** “What is shared is a zone id — the app's one
geographic thing — until question 26 answers what a spot *is*. The field is renamed deliberately
when it does; nothing here is called ‘spot’” — and [CONTEXT.md](../../CONTEXT.md)'s note says the
same in the glossary's own words. The question is asked once, in
[to-questionnaire-community-map.md](../../to-questionnaire-community-map.md) §1.2, and it has two
branches:

1. **The zone itself.** The record stands as it is; the answer resolves decision 6 without a rename,
   and no follow-up is prepared for it.
2. **A place inside the zone that the sharer names.** The record grows by the name the sharer typed,
   the contract moves with it, and the read rule has to be looked at and shown not to move.

This ADR is branch 2, **written before the answer** for the same reason
[ADR-033](ADR-033-the-first-backend-slices-deployment-decisions.md) (and the three skeletons beside
it) were: an answer that arrives as a reply has to become a recorded decision the same day. The two
questions this branch turns on — **what the grant's record would carry** and **what the read rule
does and does not need to change** — deserve an answer written calmly rather than under the reply's
deadline, so that activation is transcription, not derivation.

Three things this file is not. It is **not a decision**: §1.2's answer is the decision, and reading
the shape below as a recommendation would be wrong. It is **not a rewrite of ADR-032**: activation
records the replacement in ADR-032's *status block* and never in its decision text (the
[ADR rules](README.md)). And it is **not the geography's half** of “what is a spot”: whether
anything below a zone exists *and is curated by the operator* is
[to-questionnaire-zone-service.md](../../to-questionnaire-zone-service.md) §2.4, whose answer lands
in [ADR-036](ADR-036-the-zone-service-what-it-must-return.md) — the two documents were divided along
that seam on 2026-10-10, and this ADR does not re-ask it.

What stands whichever branch is chosen, because the owner decided it on 2026-10-10 and no answer
reopens it: **a shared spot is a place, never a position**, and no endpoint takes a coordinate
(ADR-032 decision 1, [SECURITY.md](../../SECURITY.md) §10). Nothing in this preparation adds one —
that is the boundary the record below is drawn with. One thing an activation settles: the **word**
the record's field takes is fixed in CONTEXT.md before it reaches code (ADR-035, step 4), so the
field below is described by its shape and its identifier is deliberately left to that step.

## Decision — the shape, if §1.2 activates this

### 1. What the grant's record would carry

One field beside the ones that exist, and no others.

| the grant type (`ShareGrant`, and the `shares` row it mirrors) | what activation does to it |
| --- | --- |
| `id`, `sharerId`, `sharedAt`, `expiresAt`, `revokedAt`, `redeemedBy` | **unchanged** — the record's identity and the read rule's inputs; nothing here touches one of them |
| `zoneId` | **stays**, and stops being the whole of what is shared: the answer's own wording puts the place *inside* a zone, the share is authored from that zone's screen, and the zone remains the app's one geographic thing and the grant's anchor |
| — | **the name the sharer typed**: one nullable text field, the sharer's own words for the place; set by the sharer when the share is made, and by nobody else |

What the new field *is*:

- **The sharer's words for the place** — “the berry patch by the big rock”. It belongs to the share
  and never to the zone: a zone's name is the service's and is shared by everyone, while this name is
  one person's. It is a **label, not an identifier**: nothing looks anything up by it, no place is
  matched to another by it, and two sharers may name the same clearing differently without anything
  being wrong.
- **Its absence has a stated meaning** — the zone is the place the share is about. Whether the frame
  always asks a sharer for a name, or sharing may be of the zone as such, is §1.4's control to say;
  the record keeps both states representable and does not guess.
- **It is validated where it enters** — trimmed, one line, at most a short ceiling the contract
  states (80 characters is the shape this preparation proposes: one line, comfortably above the
  longest zone name, below the length of a sentence of copy — and §1.3's note, if it lands, is a
  different field). Empty after trimming is **absent**, never a whitespace name. The app validates
  as it collects and as it receives; the server enforces the same rules and must satisfy the same
  cases — the specification pattern ADR-032 decision 3 set for the rule.
- **It is text, and nothing more** — stored and returned as data, never interpolated into a query,
  never a log field, never a deep-link parameter. A name the app cannot render is a rendering
  question, not a grant that opens or closes.

**The field's four answers** (AGENTS.md §11 — a field with no answer is not done):

- **Who may read it** — exactly the accounts the rule already names for the grant: the sharer, and
  the recipients who redeemed while it was active. The name adds no audience and no access decision:
  it is part of a response the reader was already authorised to get. No log, no analytics, no
  operator surface (the contract's §4).
- **How a copy is got** — it rides the same reads every other field does: `GET /shares/mine` (the
  sharer's own record) and `GET /shares` (the recipients'). The export answer stays where it lives
  (PROJECT.md questions 17 and 23); this field adds nothing to it.
- **How it is corrected** — the contract's existing answer stands: there is no edit, and a corrected
  grant is a new share (revoke, then share again with the corrected name). That is dull for a typo
  and it is the smallest surface; **if §1.4's frame offers renaming, the frame and this answer move
  together** — an edit is a one-field update with its own contract change, recorded at activation,
  never quietly left behind.
- **How it is deleted** — with the grant, and only with it: revocation closes access at once,
  retention deletes the row and its redemptions at 12 months (ADR-014), and the account-deletion
  cleanup the contract already names (question 17) takes it with the row. The field has no separate
  life and no second copy — the device stores nothing of it; a screen draws what it was given.

And what the field is **not**:

- **Not a coordinate.** Nothing here reverses ADR-032 decision 1's “no endpoint takes a coordinate”,
  and it does not turn “a place, never a position” into “a position, if you meant the place”. If a
  frame later wants the place *pinned* on a map, that is a position with its own decision and its
  own privacy question — never a side effect of naming the place.
- **Not a name for a person.** ADR-032 decision 8 stands: no wire response names another account.
  A place's name must not become the back door to that — what a viewer is told *about the sharer*
  stays §2.4's question and the contract's blocking item §8.4.
- **Not a curated service unit.** If the answer ever makes the shared thing something the operator
  curates below a zone, the share points *at that unit* — an id the service names — and that shape
  lands with §2.4's answer in ADR-036, not here.
- **Not §1.3's content.** A note the sharer typed, the species, how long ago — each is its own field
  if it lands, each with its own copy and its own four answers. This ADR prepares the *first* text
  field's pattern once; §1.3's answer copies it rather than re-deciding it.

### 2. What the read rule does and does not need to change

The rule decides **who**, never **what**. Its whole input is the caller, the sharer, the window, the
revocation and the redemption list; a name the sharer typed is none of those. Function by function:

- `shareStatus` reads `revokedAt`, `expiresAt` and the clock. A name cannot move any of the three.
- `canReadShare` reads `sharerId` and `redeemedBy` against the viewer. A name cannot make a viewer a
  holder, and it cannot take one off.
- `receivedShares` is `canReadShare` applied as a filter; unchanged with it.
- `mayRedeem` reads the grant's activity and the viewer. §1.2 is not §2.3's question, and the invite
  mechanism does not appear in this branch at all.
- The five refusals and their one-`404` mapping (ADR-032 decision 4) are unchanged: a name is never
  a reason to refuse a read and never something a refusal is told about. Default deny is unchanged,
  and a malformed name is not a closed grant either — it is a value the boundary rejects or a screen
  renders, while the grant's access states stay exactly the states the tests fix.

**No case in `share-access.test.ts` changes, and activation adds none to it.** That is not an
omission to be tidied later: no case in the file mentions what a grant points at, because none
*could* — the rule's inputs do not include it. If activation ever finds `canReadShare` needing a
name, that is the signal that the change is being made in the wrong place: the name rides a response
the rule has already authorised, and it must never appear in a decision.

What **does** change — all of it around the rule, none of it in it:

- **The type**: `ShareGrant` gains the field, because the type *is* the record's shape; the doc
  comment's “What is shared is a zone id” paragraph is replaced with the new description — the
  paragraph itself says this is what would happen. The app may read the field to decide what to
  draw — UX, never a check.
- **The contract**: `shares` gains its column beside `zone_id`, the create body gains the field, and
  both read responses carry it; the trim/one-line/ceiling rule is stated once there and enforced on
  both sides.
- **The validation's tests**: the name's boundary rules are specified in this repository the way the
  access rule is — written first, tested beside `share-access.test.ts`, with the server satisfying
  the same cases. This is the one place new cases appear, and they are about the value's shape, not
  about access.
- **The vocabulary**: CONTEXT.md's “no term yet for what a shared spot is” note becomes a definition,
  and where the answer adds a field, that field takes the word the answer chooses — first in the
  glossary, before any code identifier exists (ADR-035, step 4). The word is not taken from this
  preparation, because the answer is what settles it; the pressure on it is that the design says
  “spot” while the app's own copy already calls the private plan “Saved spots”, and a third meaning
  of that word is exactly the trap CONTEXT.md records.
- **The app's input, when a frame draws it**: a field and a sentence to translate in both languages
  (ADR-017), and the layout harness's screen list (ADR-018/019) if a screen gains it. Nothing is
  written before the frame exists (ADR-035's standing rule).

### 3. What activation touches, and in what order

Same-day work, in this order — the order matters because the glossary word is what the identifiers
below take, and because the tests go first where a rule is specified:

1. **CONTEXT.md** — the note becomes the definition; the **Share** entry's “its own record names a
   Zone until the open question above is answered” sentence is replaced.
2. **ADR-035's §1.2 slot** — the answer recorded verbatim, with its date; this ADR moves from being a
   preparation to being a record.
3. **`share-access.ts` and its tests** — the name's validation tests written first, then
   `ShareGrant`'s field and the doc comment; **no decision function changes**, and the 24 existing
   cases stay as they are.
4. **`docs/api-contract.md`** — the column, the create body, the responses, the validation rule, and
   the field's four answers folded into §4's list.
5. **ADR-032's status block** — one line naming the replacement (its decision text untouched).
6. **The tables** — this ADR's status moves to `Accepted` in [docs/adr/README.md](README.md) and
   PROJECT.md; ADR-035's row moves as its sections fill.
7. **The app's surface, later** — only when the frame draws the input. Nothing is sent by any of
   this: the first byte still waits on ADR-033's deployment answers.

## If the other branch wins

Withdrawal is one edit: the status line records the answer it lost to (“withdrawn — §1.2 answered
‘the zone itself’, 2026-…”), the two table rows say the same, and ADR-035's §1.2 slot records the
answer that stands. No code was written and no byte was sent — this file is documents only — and the
ADR folder keeps it as the record of the option that was passed over: a rejected alternative with
its reasoning is what makes a later reversal cheap to argue (ADR-035's alternatives section makes
that the rule). Withdrawal is also the outcome if the two questionnaires together answer that a
share points at an **operator-curated unit** below a zone — then the thing shared is a unit the
service names, its shape lands with §2.4's answer (ADR-036), and this branch of §1.2 was not the one
chosen.

## Alternatives considered

The branch's alternatives — what this preparation deliberately did not choose, so activation starts
from an argued shape rather than a blank page:

1. **Wait for the answer, then write this.** Rejected for the reason the skeletons exist: the answer
   arrives as a reply, and the day it arrives is the day it has to be recorded — under whatever
   deadline that reply's thread already carries. Writing the two answers (the record's field, the
   rule's non-change) now is cheap; deriving them then is not.
2. **Fill ADR-035's §1.2 slot with the shape.** Rejected: the slot records the *answer*, and a
   change to an accepted ADR's data model and public contract is its own ADR (the
   [ADR rules](README.md): a decision that changes architecture, security, data or a public contract
   needs one). ADR-035's job is the frame and the model; the field's shape is this.
3. **Let the place be a coordinate the sharer drops.** Rejected: it reverses ADR-032 decision 1's “no
   endpoint takes a coordinate” and SECURITY.md §10, and it would give the app's geography a second
   kind of point than the zone — the position rule would then have to be re-argued for a feature
   whose promise is “a place, never a position”.
4. **Put the name on the zone** — one name per zone, the sharer's becoming a nickname. Rejected: the
   questionnaire's own split says a sharer-named place belongs to the share, and a zone's identity
   is the service's. Two people naming one zone differently is the normal case, not a conflict, and
   the zone id stays the anchor precisely so the name never has to be reconciled.
5. **Make the name an identifier** — match places across shares by name. Rejected: names collide,
   change and are typed by people; nothing about access may hang on a string a user typed, and the
   only identifier the rule trusts stays the one the service issued.
6. **Carry §1.3's content in the same change.** Rejected as scope: each additional field is its own
   copy, its own four answers and its own place in the frame's design. Preparing the first text
   field's pattern once is what makes the second one cheap; deciding them together is what makes the
   answer's deadline decide the design.

## Consequences

- **If activated:** the record grows by one nullable text field, the contract by one column and one
  validation rule, and the glossary by one definition. The read rule, its five refusals and its 24
  cases stand **unchanged** — this file's answer to its second question. The server must enforce the
  ceiling and the trimming, and satisfy the validation's cases exactly as it must satisfy the
  rule's. There is no migration to argue: nothing is deployed, and the field is nullable from the
  first row.
- **If withdrawn:** nothing was written and nothing was sent; the record stays the zone id ADR-032
  wrote, decision 6 resolves without a rename, and the cost is the status line and two table rows.
- **The field rides an already-authorised response.** The name adds no audience: the rule that
  decides whether a reader may read the grant decides whether they see the name, because the name is
  part of the grant they were authorised to read. That is why §2 is short — there is nothing for a
  name to decide.
- **The one thing to watch:** a place's name is the sharer's content *about a place* — not the
  sharer's own name, and not anyone else's. What a viewer is told about the sharer is §2.4's
  question, and a free-text place name must not become its back door: the app renders it as a
  place's label, never as a person's identity.
- **The lawful basis stays where it was.** The purpose is question 15's, over the connection a share
  already creates; a name the sharer typed is content inside a record that already exists, not a new
  purpose and not a new audience. Its four answers are §1's, and the field has no separate life to
  answer for.
- **What it costs:** one document that may be withdrawn, one field in the event it is not, and a
  standing obligation to keep this file's claims true — status line, tables and ADR-032's status
  move together on the day §1.2 lands.

## Related

- [ADR-032](ADR-032-the-first-backend-slice.md) — the record this prepares the next version of:
  decision 1 (no coordinate), 3 (the specification pattern), 4 (refusals), 5 (invites — untouched by
  §1.2), 6 (the open field this follows up) and 8 (no account named on the wire)
- [ADR-035](ADR-035-shared-spots-the-frame-and-the-sharing-model.md) — where §1.2's answer is
  recorded, and whose steps 3 and 4 this preparation feeds
- [to-questionnaire-community-map.md](../../to-questionnaire-community-map.md) — §1.2 (what a spot
  is: the answer this waits on), §1.3 (what a viewer sees) and §1.4 (where the control lives)
- [to-questionnaire-zone-service.md](../../to-questionnaire-zone-service.md) §2.4 and
  [ADR-036](ADR-036-the-zone-service-what-it-must-return.md) — the geography's half of the seam, and
  where an operator-curated unit's shape lives
- [docs/api-contract.md](../api-contract.md) — the column, the create body and the responses that
  move on activation
- [CONTEXT.md](../../CONTEXT.md) — where the field's word is fixed before its identifier
- ADR-014 (retention), ADR-017 (copy in both languages), ADR-018/ADR-019 (the layout harness, when a
  frame draws the input), ADR-010 (a place is never a trace)
- [PROJECT.md](../../PROJECT.md) — open question 26 and known issue 31
