# ADR-032 — The first backend slice: one share record, one access rule, accounts by subject

- **Status:** Accepted (nothing is built by it: no backend exists, no processor is added, and the
  app still sends nothing — deployment is blocked on open questions 3, 15 and 16). Decision 6's open
  field has a prepared follow-up for one branch of the sharing model
  ([ADR-037](ADR-037-what-a-share-points-at-if-the-sharer-names-the-place.md)) — prepared in advance,
  activated or withdrawn the day §1.2 answers; nothing is decided by it.
- **Date:** 2026-10-10
- **Deciders:** the project owner asked for the slice to be specified (2026-10-10); where the
  owner's answer is still owed — region, processors, lawful basis, the invite mechanism — this
  records a **repository assumption** and names it as an open question rather than deciding it

## Context

The owner asked on 2026-10-10 for shared spots with people you invite (PROJECT.md, “Recorded
requirement”; capability 16) and, in the same conversation, for the smallest backend slice that
makes such a feature possible — accounts, and the rule that decides **who may read a share**,
written test-first. The marketplace's four frames are a *disclosed demo* for exactly this reason:
there is no listings service, no seller account and no transport (ADR-026), so an account and one
authorisation rule are the unblocker for both.

What exists on this side of the gap: a session seam with a stand-in provider behind it (ADR-028),
a decided identity provider (ADR-013: Firebase Authentication, whose token proves identity and
never privilege), and a validated `EXPO_PUBLIC_API_BASE_URL` in the app's configuration that
nothing has ever called. What does not exist: a backend, a host, a region, a data-processing
agreement, a lawful basis, and any code in the app that sends anything at all (SECURITY.md §17).

The constraint that shapes the answer is ADR-015: **this repository is the mobile app.** The
backend cannot be built here, and it must not be implied by what is written here.

## Decision

1. **The slice is one record and one rule.** A **share grant** — who shared which zone, when, until
   when, whether it was revoked, and which accounts redeemed the sharer's invite — and the rule that
   decides who may read it. Nothing else: no zone data, no weather, no reports, no listings, no
   operator surface, and no endpoint that takes a coordinate (SECURITY.md §10).
2. **Accounts are identifiers only, and the identity provider is the one already decided**
   (ADR-013). The server verifies the caller's ID token and takes its **subject** as the account id;
   it stores **no account row** — no email, no phone number, no name, no profile. That is the least
   data that makes “who may read this” answerable at all, and it is why this slice needs no account
   migration when the provider's answer to open question 12 (direct, or through our own backend)
   arrives: either way a token proves a subject.
3. **The rule is written in this repository, as the specification, test-first.** Pure, clock-
   injected and I/O-free (`src/features/sharing/domain/share-access.ts`, tests beside it), because
   the contract is what the app, the server and the tests have to agree on, and because a rule the
   server implements twice — once in code, once in a schema — is where two answers to one question
   come from. The server implements the same rule and must satisfy the same cases. **It is not
   client-side enforcement**: the app may use the same answers to decide what to draw, and that is
   UX (AGENTS.md §5, SECURITY.md §3).
4. **Default deny, and a refusal carries a reason for the server only.** A grant that is missing,
   revoked, expired, or whose window the app cannot read is closed — and so is a grant asked about
   with a clock the app cannot read, because `NaN` comparisons read as “not expired yet”. The five
   refusals are distinct in the rule (the server logs and measures them) and **identical on the
   wire**: the API answers one `404` for all of them, so no caller can enumerate other people's
   shares, or learn why one was closed.
5. **A recipient becomes one by redeeming a link the sharer sends themselves.** No third party's
   address or phone number is processed, no “find a picker” search exists, and the invite code is a
   credential: random, hashed at rest, sent in a URL fragment, never logged, never stored by the
   app. *(Assumption; question 26 asks the owner this directly, and the read rule does not depend on
   the answer.)*
6. **What is shared is a zone id** — the app's one geographic thing — until question 26 answers what
   a spot *is*. The field is renamed deliberately when it does; nothing here is called “spot”
   (CONTEXT.md).
7. **Revoking is as easy as sharing.** Revocation and expiry close the grant for the people it was
   shared with; the sharer keeps their own record, because it is their own data and because the
   screen that revokes a share has to be able to list it. Retention is the existing rule: 12 months,
   then the rows and their redemptions are deleted (ADR-014).
8. **No wire response names another account.** A share's list carries the zone and the timestamps
   and no identifier of anybody else — which is also the honest answer while question 26 is open on
   what a viewer is told about the sharer.
9. **Nothing is deployed, and no processor is chosen.** The contract
   ([docs/api-contract.md](../api-contract.md)) is written; the rule is tested; the decisions a
   deployment needs — where the backend lives and who operates it (question 3), the region,
   processors and DPAs (question 16), and the lawful basis for the identifiers involved
   (question 15) — are recorded as blocking, not assumed. The app's own position is unchanged: it
   sends nothing, and no screen imports the rule yet because the feature has no design frame.

## Alternatives considered

1. **Firestore documents with the provider's security rules** — genuinely the smallest thing to
   stand up: no server code, the identity provider already decided, and a local emulator to run
   tests against. Rejected for now, not on size but on fit: the rule would then exist in two
   languages (this module and the rules language, which cannot run it), the marketplace's shape
   (listings, chat, orders, moderation) is not a document-rules shape, and choosing Firestore
   storage means choosing a processor and a region that question 16 has not answered.
2. **Invites by email address.** Familiar, and it removes the “who do I send this to?” question.
   Rejected: it processes personal data *about someone who has never asked us for anything* (an
   address typed into a form by a third party), which is the one data story the owner's own words
   (“people you invite”) do not require.
3. **An account table with profiles** (names, addresses, roles). Rejected as premature: nothing in
   this slice needs a profile, question 26 has not decided whether a viewer sees a name at all, and
   every field would need a lawful basis before it is stored.
4. **Enforcing the rule in the app** so no server is needed yet. Rejected outright: a client check
   is not authorisation (SECURITY.md §3), and a feature that appears to work without a server is
   the worst possible thing to build in front of one.
5. **Building the API here as `apps/api`.** ADR-011 was superseded by ADR-015: this repository is
   the mobile app, and reviving a second package to host one endpoint would reverse an accepted
   decision.
6. **A stand-in local service** (a fake server answering these endpoints) so screens can be built
   before the decision. Rejected for the reason ADR-028 rejected a fake account service: it would
   pretend to be the thing that is undecided — and the feature has no design frame yet, so there is
   no screen waiting on it.
7. **A generic `permission` table** for future resources (listings, chats, reports). Rejected as
   speculative: the rule's shape is repeated when a second resource needs it, and a shared table
   designed before the second caller exists is how the first one gets the wrong columns.

## Alternatives for the host, once the owner decides (researched 2026-10-10)

The shape that fits this slice is a **managed SQL database in an EU region behind a small
TypeScript API**: one language for the rule, one place to enforce it, and the same API grows into
the marketplace later. The candidate under evaluation is a managed Postgres with a free tier and a
selectable EU region (Tiger Cloud was the only catalogued option that both offers an EU region and
costs nothing to start) — **to be evaluated and approved by the owner, not adopted here**: choosing
it creates a processor, which question 16 owns. A serverless function host in front of it is the
other half of the same decision.

## Consequences

- The app gains a rule it can test but not enforce, and a contract it can build a transport
  against the day a server exists. What it does **not** gain is anything that sends, stores or logs
  — the feature's UI still waits on a frame (open question 26).
- A second implementation of the rule (the server's) must satisfy the cases in
  `share-access.test.ts`. That is the point: the file is the conformance suite, and a server that
  disagrees with it is wrong rather than different.
- The refusals being distinct internally and identical externally puts a real constraint on the
  server: every handler has to map them, and the API's tests have to assert the map (a `404` for a
  share that exists but is not yours).
- Sharing creates **personal data about people who did not ask us for anything** — the mere fact
  that two accounts are connected. It is covered by an owner decision before it ships, and it is
  the reason the invite is a link rather than a lookup.
- The record's four questions are answered in the contract; the **lawful basis** is not this
  repository's to give (question 15), and neither is the region (question 16).
- What it costs: one feature folder with a domain rule and no screens, a contract document that has
  to move with the server, and a standing obligation to delete rows at 12 months — a job that does
  not exist because the database does not.

## Related

- PROJECT.md: capability 16 (shared spots) and capability 1 (accounts); known issue 30 (the rule
  exists and nothing calls it); open questions 3 (where the backend lives), 12 (where a submitted
  account goes), 15 (lawful basis), 16 (region, processors, DPAs), 24 (what makes the marketplace
  real) and 26 (the sharing model's open parts)
- [docs/api-contract.md](../api-contract.md) — the wire contract this decision is drawn with
- ADR-013 (the identity provider), ADR-015 (this repository is the mobile app), ADR-026 (the
  marketplace as a disclosed demo), ADR-028 (the session seam the token will travel through),
  ADR-014 (retention), ADR-006 (where a token must be kept before a real one exists)
- [to-questionnaire-community-map.md](../../to-questionnaire-community-map.md) — what the design
  owner and the project owner still answer
