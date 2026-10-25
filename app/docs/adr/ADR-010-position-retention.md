# ADR-010 — Position retention: derived centroids, never movement traces

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

Visits are detected on-device from GPS, and the client is untrusted (SECURITY.md
§3): a modified client can claim any zone it likes. Verifying a visit server-side
therefore requires *some* position evidence to travel with the visit. At the same
time, location is sensitive personal data and a stored track is a precise movement
history about an identifiable person — the highest-risk data this product would
hold, and the hardest to justify later.

The choice decides both the anti-fraud capability and the privacy exposure of the
system, and it is expensive to reverse in the direction of *more* privacy: once
tracks exist in backups, they cannot be recalled.

## Decision

1. The server keeps, per visit: the **zone identity**, the visit's **timestamps**,
   the **presence segments** (entry/exit times per segment), and for each segment a
   single **derived centroid at a defined precision** — coarse enough not to be a
   location trace, precise enough to check plausibility.
2. The server **must not persist, log or forward raw GPS samples**, tracks or
   per-sample histories. Samples are used on-device to decide zone entry/exit and
   are then discarded; only the derived values above are transmitted.
3. With a centroid, verification is **probabilistic, not proof**: the server checks
   that the reported position and timings are consistent with the zone and with
   other corroborating signals, and treats disagreement as a moderation signal —
   never as an automatic accusation. Client assertions remain untrusted input.
4. Retention: position-derived fields inherit the visit's retention policy; the
   policy itself (duration, deletion, access) is still an owner decision recorded in
   PROJECT.md, and nothing may ship to production before it exists.
5. The precision to use, and whether the centroid is computed on-device or by the
   server from a bounded, truncated aggregate, are implementation choices to be
   fixed in the feature that first stores it — with a test that fails if raw
   samples are ever written to storage or transport.

## Alternatives considered

1. **Full track per visit** — strongest anti-fraud and moderation evidence, and the
   worst privacy position: an identifiable movement history, more exposure in a
   breach, and a much heavier deletion obligation. Rejected.
2. **Zone id and timestamps only** — strongest privacy, but the server cannot
   independently check anything: a modified client can claim any zone, which
   undermines scoring, rewards and marketplace gating (ADR-009). Rejected as the
   sole evidence, and kept as the fallback if a future retention decision demands
   it.
3. **Store nothing until policy exists** — safest default, but blocks verification,
   scoring and eligibility gating, i.e. the product's core loop. Rejected, since the
   remaining decision (retention duration) does not block building it.

## Consequences

Positive: the system never holds a movement trace by design, which bounds breach
impact and future disclosure scope; verification remains possible in a form
proportional to the risk; the constraint is testable (a test asserts no raw sample
is persisted or sent).

Negative / accepted costs: verification is probabilistic, so fraud detection leans
on anomaly signals and moderation rather than proof; a deliberate attacker who
fakes a plausible centroid inside the zone is not caught by geometry alone;
precision tuning is required to satisfy both privacy and usefulness; the retention
policy is still needed before production, and the client must be written so samples
never reach logs in the first place.

## Related

- SECURITY.md §3 (never trust the client) and §10 (GPS and privacy)
- [CONTEXT.md](../../CONTEXT.md) defines _visit_ and _presence segment_
- ADR-009 (scores that depend on verified visits), PROJECT.md (retention open question)
