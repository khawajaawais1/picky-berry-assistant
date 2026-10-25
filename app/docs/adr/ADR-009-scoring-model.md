# ADR-009 — Scoring model: per-visit yield, server-only per-user trust, gated access

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

The bootstrap specification requires "yield-score logic" and "trust-score logic"
but never says what either score describes. Without that, the data model, the
privacy boundary and the client UI cannot be designed: a score of a *place*, of a
*trip* and of a *person* are three incompatible records, and only one of them can
be verified by evidence. Scoring also touches money eventually (rewards,
marketplace), which fixes strict requirements on where the decision is made.

## Decision

1. **Yield score is per visit.** It estimates what was found during that one visit
   and is derived server-side from that visit's own feedback and evidence (media
   analysis may contribute). Zone-level "how good is this area now" reporting is a
   *derived aggregate* of visit scores with an explicit recency policy, not a
   separate scoring model, and not the definition of the score.
2. **Trust score is per user and describes report reliability.** It is computed and
   held server-side only, is never shown to other users, and never gates anything
   by itself on the client. The user themself sees a **band plus the reasons**
   behind it (never a raw number or its inputs), so a decision is explainable and
   challengeable without handing over a function to optimise against. Decided
   2026-10-08, closing this ADR's original open item.
3. **Scores may gate access and money.** Rewards and marketplace eligibility may
   derive from scores, but only through a server-side rule that (a) is versioned
   and auditable, (b) records why a decision was made, and (c) can be explained to
   the affected user. Client-side hints are display only.
4. Client-submitted scores or model results are never authoritative: the client
   may send observations and evidence, never a score it computed about itself or
   its user (SECURITY.md §3, §13).

## Alternatives considered

1. **Zone-level score as the primary model** — better for discovery UX, but it
   cannot represent what an individual found, needs a decay policy to stay
   meaningful, and makes each user's contribution unattributable. Rejected as the
   definition; retained as a future aggregate.
2. **Per-user performance (productivity) score** — attractive for ranking and
   rewards, but unverifiable from evidence, and it makes a person the subject of a
   judgement. Rejected.
3. **Self-reported yield in the feedback form** — trivially gameable, so unusable
   for anything privileged; the spec also implies model-derived estimation.
   Rejected as the source of truth.
4. **Public trust/reputation score** — motivates good behaviour but turns the score
   into a target, leaks a personal judgement to other users, and invites farming.
   Rejected.
5. **Human-only eligibility decisions (no score gating)** — safest and simplest to
   defend, but human review does not scale to marketplace volume and the owner
   intends scores to gate access. Rejected.

## Consequences

Positive: observations stay attributable and aggregation stays possible; scores
never become a client-side source of truth; every access/money decision has an
auditable server-side rule with a user-visible reason; the trust score stays a
private judgement rather than a public ranking.

Negative / accepted costs: zone "quality right now" needs a separate aggregate and
recency policy; a versioned eligibility rule plus decision log is real server work
(moderation, storage, audit); users get no ranking to compare themselves against,
which may reduce engagement; two score concepts must be kept distinct in code,
docs and UI copy.

## Open, blocking implementation

- Numeric dwell minimum and grace window (see PROJECT.md "Domain model decisions").
- Where the rules that turn feedback and evidence into a score live, and what
  media validation and duplicate detection must reject before scoring.
- The band boundaries and reason vocabulary shown to a user, which must be stable
  enough to be explainable and versioned alongside the eligibility rule.

## Related

- [CONTEXT.md](../../CONTEXT.md) (definitions), PROJECT.md "Domain model decisions"
- SECURITY.md §3, §13 (never trust the client; models are not security boundaries)
