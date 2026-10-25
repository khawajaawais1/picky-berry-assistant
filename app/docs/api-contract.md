# The API contract — first revision

**Status:** written 2026-10-10, first cut; **status line updated 2026-10-22**. **Nothing
implements it yet.** The app no longer lives alone: it is `app/` in the team monorepo, whose
`../../backend/` is a FastAPI modular monolith and whose API convention is `/api/v1`,
OpenAPI-first, with RFC 9457 problem JSON
([`../../docs/architecture.md`](../../docs/architecture.md)). This slice's
paths are therefore **unversioned and provisional** — it describes one sharing slice, not the
served contract. The app still sends nothing anywhere (SECURITY.md §17).

This document is what the first slice will be built against, and it exists because the contract
is what the app's transport, the server's enforcement and the access rule's tests all have to
agree on. Reconciling it with the backend's OpenAPI document is a task for the PR that implements
the slice.

Decisions behind it: [ADR-032](adr/ADR-032-the-first-backend-slice.md). The rule itself, in
executable form and tested, is
[`src/features/sharing/domain/share-access.ts`](../src/features/sharing/domain/share-access.ts) —
the server implements the same rule and must satisfy the same cases
(`src/features/sharing/domain/__tests__/share-access.test.ts`).

## 1. What this revision covers — and what it deliberately does not

**Covered, and it is the whole slice:**

1. **Accounts, as identifiers only.** Who the caller is comes from the identity provider
   ([ADR-054](adr/ADR-054-the-account-belongs-to-the-api.md): the account row is the API's, the
   credential Firebase's). The server verifies the caller's ID token and uses its **subject** as the
   account key. This first slice stores no account row: no email, no phone number, no name, no
   profile. The v1 account row ADR-054 adds carries a locale and consent timestamps, not those.
2. **One share, and one access rule.** A picker grants read access to one place (a zone, today) to
   the people they invite, can revoke it, and a recipient becomes one by redeeming the sharer's
   invite link. Who may read what is decided by the rule above, server-side.

**Not in this revision** — each needs its own decision and its own slice: zone and weather data
(open questions in PROJECT.md), the report queue's transport (ADR-005), the marketplace's listings,
sellers, chat, orders and payments (ADR-026 keeps those a disclosed demo), position of any kind
(no endpoint takes a coordinate: SECURITY.md §10), and anything an operator surface needs.

**Marketplace relation.** This slice is the *unblocker*, not the marketplace: an account, and one
authorisation rule whose shape repeats (a listing is read by a buyer if its seller granted access).
Nothing here makes a listing, a chat message or an order exist, and the marketplace demo stays a
demo (ADR-026, PROJECT.md question 24).

## 2. Who decides what

- **The server decides.** Every read is authorised by the rule in `share-access.ts`, against the
  account in the token — never against an identifier in the request body, path or query
  (AGENTS.md §5, SECURITY.md §3).
- **The app renders.** It may use the same rule to decide what to draw (which share to list, what to
  say about a revoked one). That is UX. A screen that hides what the server would hand over has
  protected nothing.
- **The app never sends an account id.** Not the sharer's, not the recipient's. The only account a
  request is about is the one the token proves.

## 3. Accounts and the token

- `Authorization: Bearer <ID token>` on every endpoint. No endpoint is anonymous.
- The server verifies the token against the provider's published keys (issuer, audience, expiry)
  and takes the subject as the account id. A token it cannot verify is refused; a request with no
  token is `401`.
- The app gets that token from the session seam ([ADR-028](adr/ADR-028-an-authentication-seam-behind-a-port.md)),
  which is where a real provider goes and where the stand-in lives today. Nothing changes in the
  seam's shape: `current()` is what a caller reads, and a request is made only while it holds a
  session.
- Where the token is *kept* is ADR-006's secure adapter, still unimplemented and **required before
  a real token exists** — today's session is in memory, which is exactly why no real token may be
  held yet.

## 4. The record

Two tables, and nothing else. `shares` is the grant; `redemptions` is the list of accounts that
took the sharer up on it (the list the rule reads as `redeemedBy`).

| `shares` | Type | Why |
| --- | --- | --- |
| `id` | opaque text | Server-generated. Opaque on purpose: a guessable id is an enumeration oracle, and the refusal mapping below would only hide half of it |
| `zone_id` | text | The place the grant is about. A zone until question 26 answers what a spot is |
| `sharer_id` | text | The identity provider's subject. The only account name the rule trusts |
| `invite_hash` | text | SHA-256 of the invite code. **The code itself is never stored, logged or returned again** |
| `shared_at` | timestamptz | When the grant was made |
| `expires_at` | timestamptz | When it stops granting access. **At most 12 months after `shared_at`** (ADR-014) |
| `revoked_at` | timestamptz, null | Present means revoked; its value is not read by the rule |

| `redemptions` | Type | Why |
| --- | --- | --- |
| `share_id` | text | Which grant |
| `account_id` | text | The subject that redeemed the invite |
| `redeemed_at` | timestamptz | When. The rule does not read it the order of the list is `redeemed_at` |

**The four questions** (AGENTS.md §11.1 asks them of every stored field):

- **Who may read it** — the server, through its own database credentials, and the accounts the rule
  names: the sharer, and the recipients who redeemed. No operator surface reads it in this slice,
  no analytics pipeline, no log, and no response body contains another account's identifier (§6).
- **How a copy is got** — `GET /shares/mine` returns the caller's own grants, including revoked and
  expired ones, and `GET /shares` returns the ones they received. An export is the accepted answer
  in the documents that own it (PROJECT.md, questions 17 and 23); this slice's contribution is that
  a share is *readable by the person it is about*, which is the part a screen needs.
- **How it is corrected** — `DELETE /shares/{id}` revokes it, and a corrected grant is a new share.
  There is no edit: the record's only content is what the sharer chose once, and an edited grant
  would be one whose recipients never agreed to it.
- **How it is deleted** — expiry deletes the ability to read, and a scheduled job deletes the rows
  **and their redemptions** once past `expires_at` (12 months at most, ADR-014). Deleting an account
  at the provider leaves rows naming a subject that no longer resolves; the same job is where that
  cleanup belongs, and PROJECT.md question 17's deletion path is what has to name it as a rule.

**Retention** is 12 months, by `expires_at ≤ shared_at + 12 months`, enforced by the server when a
share is created (a client asking for more is refused, not trusted).

## 5. Endpoints

| Method and path | Who | What it does |
| --- | --- | --- |
| `POST /shares` | any signed-in account | Creates a share of one zone, for a year at most, and answers once with the invite link |
| `DELETE /shares/{id}` | the sharer | Revokes it (`revoked_at`). Idempotent: revoking twice is the same as once |
| `GET /shares/mine` | any signed-in account | The caller's own grants, **including revoked and expired ones**, newest first — this is what a screen that revokes needs, and what the four questions above lean on |
| `GET /shares` | any signed-in account | The grants the caller received and may still read: active, redeemed by them, never their own |
| `POST /shares/{id}/redeem` | any signed-in account | Binds the caller to the grant with the invite code |

```jsonc
// POST /shares
{ "zoneId": "Z14" }                     // nothing else: no account ids, no coordinates
// 201
{ "id": "…", "zoneId": "Z14", "expiresAt": "2027-10-10T09:00:00.000Z",
  "inviteLink": "https://…/invite/…#<code>" }   // returned exactly once, never retrievable again

// POST /shares/{id}/redeem
{ "code": "<code>" }                    // the fragment of the invite link, sent in the body
// 204 — no body: signing up to a share is not a way to read who shared it

// GET /shares   ·   GET /shares/mine   → 200
[ { "id": "…", "zoneId": "Z14", "sharedAt": "…", "expiresAt": "…",
    "revokedAt": null } ]               // `revokedAt` only ever non-null in /shares/mine
```

**The invite link is a capability.** Its code is a credential, so: 256 bits of randomness, stored
only as a hash, sent **in the URL fragment** (a fragment is not sent to a server, not in a log, not
in a referrer), never written to a log or a crash report, and never persisted by the app. One link
per share, redeemable by more than one person until the share is revoked or expires, which is the
smallest thing that matches “people you invite”; per-person invites with per-person revocation are
the obvious next step and change no part of the read rule.

## 6. Refusals, and what a client is told

| The rule says | The API answers |
| --- | --- |
| `not-found`, `not-holder`, `expired`, `revoked`, `unreadable` | **`404` with no detail** — the same answer for all five, so a caller cannot learn whether a share exists, who made it, or why it was closed |
| `own-share` (redeeming one's own invite) | `404`, same as above: nothing on the wire says it was the caller's |
| already redeemed by the caller | `204` — redeeming twice is the same as once, so a retry is not a failure |
| no token, or one that does not verify | `401` |
| a body that does not parse, or a `zoneId` the server does not know | `400` / `404` for the zone |

Rate limiting is **required**, not a later hardening pass: invite codes and share ids are guessed
by attackers, and a limit per account and per address is what makes the guessing pointless. It is
listed under §8 as a decision the slice needs before it is public.

## 7. What the app does with the invite link

Deep links are external input (SECURITY.md §4), so the app validates one at the boundary before
using it: an `https` link on the app's own host, a share id of the expected shape, a code in the
fragment. A deep link that does not parse leads nowhere and says nothing about why. The app then
redeems with the signed-in account, and a redemption with no session asks the user to sign in first
— it never creates an account by itself, and it never stores the code.

## 8. What still has to be decided before any of this is built

Each item below is a slot in [ADR-033](adr/ADR-033-the-first-backend-slices-deployment-decisions.md),
where the owner's answers are recorded; nothing here is decided by this document, and a slot left
pending keeps the deployment blocked.

1. **Where the backend lives, and who operates it** (PROJECT.md question 3): the repository is
   answered — `app/` here, the API in `../../backend/` (ADR-052) — but the host and the
   credentials' owner are still the team's open call (`../../deploy/`,
   `../../docs/architecture.md`).
2. **Region, processors and DPAs** (question 16). This slice stores personal data — account
   subjects, and the fact that two accounts are connected by a share. **No processor is added and
   no region is chosen by this document**: an EU region is a requirement, not an implementation
   detail, and the owner decides it. The hosting shape under evaluation (a managed SQL database in
   an EU region, behind a small TypeScript API) is recorded in ADR-032's alternatives.
3. **Lawful basis** (question 15), per purpose: the sharer's subject, the recipients' subjects, and
   the connection between two people is itself personal data about a third party who never asked
   us for anything.
4. **What a viewer is told about the sharer** (question 26). This revision's responses deliberately
   carry **no** name and no other account's identifier, which is the least-data answer and the
   reason nothing here needs a name field yet.
5. **The invite mechanism itself** (question 26): this document assumes the sharer sends a link to
   people they already know, so that no third party's address or number is processed at all.
6. **Abuse handling**: what happens when a share is used to harass, when an invite link leaks, and
   what the app shows the recipient about who shared it — a security review before the first
   external release (SECURITY.md §16).
