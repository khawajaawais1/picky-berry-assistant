# ADR-005 — Offline-first capture with idempotent synchronisation

- **Status:** Accepted (design only — **not implemented**)
- **Date:** 2026-10-08
- **Deciders:** Project owner (bootstrap specification §19)

## Context

The product is used in the field, where connectivity is unreliable. Losing a
user's captured feedback, photos or visit record because of a dropped connection is
unacceptable. The specification requires offline writes to be validated locally,
persisted locally, marked pending, retried when online, validated by the server,
reconciled, and marked synced — with idempotency, duplicate suppression, explicit
conflict handling and visible sync state.

Deciding this before writing capture features prevents a rewrite later: a
"fire-and-forget POST" design cannot be retrofitted into a reliable queue.

## Decision

All user-generated writes follow a local-first pipeline:

```
user action → local validation → persist locally (status: pending)
           → enqueue with a client-generated idempotency key and created-at time
           → retry with bounded exponential backoff + jitter when connectivity returns
           → server validates and authorises (authoritative)
           → reconcile server response (ids, canonical values)
           → status: synced, or failed with a visible, retryable error
```

Required properties:

1. **Idempotency** — every write carries a client-generated UUID; the server must
   treat a repeat of that key as the same operation (safe retry).
2. **No silent data loss** — a failed write stays on the device with a visible
   state and manual retry; nothing is dropped because a request failed.
3. **Ordering** — per-entity ordering is preserved; global ordering is not assumed.
4. **Duplicates** — server-side dedup on the idempotency key, never on payload
   equality.
5. **Conflicts** — the server is authoritative. Conflict policy per entity is an
   explicit choice (server-wins / merge / reject with a user-visible resolution)
   recorded when the entity is modelled. Silent last-write-wins is not acceptable
   for scored or moderated data.
6. **Partial failure** — a media upload failing must not roll back an already
   accepted record; media attaches asynchronously with its own state.
7. **Visibility** — the UI always shows pending / synced / failed per item, and a
   global count of pending writes.
8. **Bounded resources** — backoff is capped, queues are size-limited, and media
   uploads respect an explicit size ceiling.
9. **Client input stays untrusted** — local validation is UX only; the server
   re-validates everything, including any client-provided location or score.

The technical choices (local database, queue implementation, state library,
media upload strategy) are deliberately still open and will be recorded in their
own ADRs when the first offline entity is implemented.

## Alternatives considered

1. **Online-only with optimistic UI** — simplest, but loses field data. Rejected
   against an explicit requirement.
2. **Server-side queue only** — cannot work: the device is the only place that
   exists while offline.
3. **Full CRDT/peer-to-peer sync** — overkill for a hub-and-spoke product with one
   authoritative server, and hard to reason about for scored data. Rejected.
4. **Third-party offline sync engine** (e.g. WatermelonDB-style sync, PowerSync) —
   viable later; adopting one now would constrain the data model before it exists.
   Deferred, to be evaluated against the first real entity.

## Consequences

Positive: field work is never lost; retries are safe by construction; sync state is
visible so users trust the app; the server remains the single authority.

Negative / accepted costs: every write path needs an idempotency key and a status
lifecycle, so capture features are more expensive to build than a plain POST;
duplicate suppression must exist server-side or retries duplicate data; conflict
policy must be decided per entity (still open); local storage of media and personal
data raises privacy requirements (SECURITY.md §10) and needs an encryption and
retention decision.

## Related

- Bootstrap specification §19 and §12 (offline queueing, synchronisation, retry,
  duplicate requests)
- ADR-006 (secure credential storage), PROJECT.md "Open questions" 5 and 7
