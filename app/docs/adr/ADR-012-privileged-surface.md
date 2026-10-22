# ADR-012 — Privileged capabilities stay out of the field app

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

Three capabilities are privileged: curating **zone** geometry (authoritative, see
PROJECT.md "Domain model decisions"), moderating reports, and changing a user's
**trust score** or eligibility outcomes (ADR-009). All three are decisions *about*
other users or *about* the map.

The field app is an untrusted client on a device that can be lost, shared or
rooted (SECURITY.md §1–§3). Putting privileged capability there would mean
privileged tokens and privileged data at rest on that device, and every
permission check would have to be re-proven on a platform we do not control.

## Decision

1. The field app carries **no privileged capability and no privileged token**:
   no zone authoring, no moderation queue, no trust or eligibility changes. It may
   only read what the user themself is entitled to and submit field observations.
2. Those capabilities live in a **separate operator surface** (its own client,
   authentication and authorisation), which is out of scope for this repository's
   mobile app.
3. The server always enforces the boundary (SECURITY.md §3): a request from the
   field app for a privileged operation is rejected even if the client attempts it,
   and role checks are never inferred from the client.
4. Any future proposal to move a privileged action into the field app requires a
   new ADR and a threat model review first.

## Alternatives considered

1. **Moderation inside the field app, gated by roles** — greatest convenience for
   staff in the field, but it puts privileged sessions and privileged cached data on
   the highest-risk client and enlarges the app's attack surface for every user.
   Rejected.
2. **Hybrid split by capability** (some field-appropriate moderation in the app) —
   plausible later, but it multiplies authorisation paths that must each be tested
   independently. Rejected for now; revisit with its own ADR and tests.
3. **No privileged surface at all** — remove moderation from the product. Rejected:
   trust scores and zone curation are load-bearing for scoring and eligibility
   (ADR-009), so the capability must exist somewhere.

## Consequences

Positive: the app's risk surface stays small and testable; a stolen device cannot
moderate or redraw zones; the authorisation model in the client collapses to
"self and public reads"; no privileged data at rest on field devices.

Negative / accepted costs: the operator surface is extra work with its own auth,
authorisation, audit log and deployment (nothing here builds it); field staff cannot
resolve a report on the spot; two clients will eventually share domain vocabulary
and must not diverge — which is why [CONTEXT.md](../../CONTEXT.md) is the single
glossary for both.

## Related

- PROJECT.md "Domain model decisions" 1 and 6, ADR-009 (scoring), ADR-010 (position)
- SECURITY.md §1–§3, §5 (never trust the client; server-side authorisation)
