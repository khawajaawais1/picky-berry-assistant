# ADR-014 — Retention: 12 months, then delete

- **Status:** Accepted (subject to data-protection review before production)
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

The product stores personal data by design: who visited which zone and when, a
coarse position centroid per presence segment (ADR-010), the evidence they captured,
and a reliability judgement about them (ADR-009). "Keep it forever because storage is
cheap" is the default outcome of not deciding, and it is the posture that
data-protection regimes treat as the riskiest. Retention also determines what
moderation and score disputes remain possible, so it is a product decision, not only
a legal one.

## Decision

1. **Retention window: 12 months** from creation for visit records, presence
   segments, position-derived centroids and evidence media (photos/video). After the
   window they are **deleted or irreversibly de-identified** — no silent archival
   into an indefinite store.
2. **Score integrity survives the window.** Scores and eligibility decisions may
   outlive their inputs, but only in a form that contains no personal data and no
   reconstructed location (aggregates, counts, bands). A score must never require a
   deleted raw record to be recomputed; if it does, that dependency is a bug.
3. **Account deletion is immediate and complete**: on request, the user's
   provider identity and their data go, regardless of the 12-month window. The only
   permitted exception is an explicit, documented legal hold — never an implied one.
4. **Backups are bounded and documented.** A backup that outlives the window must
   have a stated maximum lifetime and a documented deletion path; "it is still in the
   nightly dump" is not an acceptable answer.
5. The window is enforced by a scheduled server-side deletion job with tests, not by
   a property of the storage layer. Configuration is per environment, and shortening
   it must be safe at any time.
6. Position data ships nowhere (including analytics, crash reports and logs) before
   this policy is enforced in code — ADR-010 decision 4 already forbids it.

## Alternatives considered

1. **Indefinite retention until the user deletes their account** — simplest to
   implement and explain, and the hardest to defend: a growing store of personal
   movement history with no expiry. Rejected.
2. **24–36 months** — supports multi-season comparison and longer score history, at
   the cost of holding more personal data, for a benefit no requirement yet
   demonstrates. Rejected for now; revisitable with evidence.
3. **Store nothing position-derived** (privacy-maximal) — eliminates the retention
   problem entirely, but leaves visits unverifiable and undermines scoring and
   eligibility gating. Rejected in ADR-010; retained as the fallback if a future
   review demands it.
4. **Per-entity windows** (e.g. media 6 months, visits 24) — more precise and more
   configurable, but with no requirement driving it the added complexity buys
   nothing today. Deferred.

## Consequences

Positive: the stored footprint stays bounded and explainable; deletion is a designed
behaviour with a test, not an afterthought; score history stops depending on raw
personal data; the policy is simple enough to explain in a privacy notice.

Negative / accepted costs: disputes and moderation older than 12 months become
impossible (that is the point, and must be stated in the moderation tooling); a
deletion job plus backup policy is real operational work; historical reporting must
be built on personal-data-free aggregates from the start; shortening the window
later requires the aggregates to already exist, so item 2 is load-bearing.

## Open, blocking implementation

- Backup lifetime and the deletion path for backups (owner + infrastructure).
- Which jurisdiction(s) the notices must satisfy — may shorten the window further.
- Whether media and visit records share one window or diverge after real usage data.

## Related

- ADR-010 (position retention), ADR-009 (scores without raw inputs), ADR-013 (account
  deletion spans provider and our data)
- SECURITY.md §10 (GPS and privacy), PROJECT.md (retention open question)
