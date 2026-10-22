/**
 * Public API of the `sharing` feature.
 *
 * One thing lives here: the **access rule** of the first backend slice — who may read a share, and
 * who may redeem the sharer's invite — with the grant's shape. It is the specification the server
 * enforces ([docs/api-contract.md](../../../docs/api-contract.md)) written in the language the
 * server is written in, so the two cannot drift about what “revoked” or “expired” means.
 *
 * **Why there are no screens here yet.** Shared spots have no design frame: the design draws the
 * sharing model (frame 14's “Default spot visibility”) and no community map, no share control and
 * no invite list, so there is nothing to build against — the owner's request is recorded in
 * PROJECT.md (“Recorded requirement”) and the design questions are out as
 * [to-questionnaire-community-map.md](../../../to-questionnaire-community-map.md). Three throwaway
 * readings of it exist for the designer (`npm run prototype:community-map`), and they settle
 * nothing. What this feature owns today is the rule, its tests and the contract.
 *
 * **What the app may do with it.** Decide what to draw: which shares to list, what to say about a
 * revoked or expired one, whether to offer “open the invite”. It may not treat any of it as a
 * check — the client is untrusted, the server decides, and hiding what the server would hand over
 * protects nobody (AGENTS.md §5, SECURITY.md §3).
 *
 * **What it does not do.** It reads and writes nothing: no storage, no transport, no clock of its
 * own (every rule takes the moment it is asked about), no React. There is no server to talk to
 * yet — this repository is the mobile app (ADR-015) and the backend's home, host, region, DPA and
 * lawful basis are the owner's open questions (3, 15 and 16) — so nothing here sends anything, and
 * the app still sends nothing at all (SECURITY.md §17).
 */
export {
  canReadShare,
  mayRedeem,
  receivedShares,
  shareStatus,
  type RedeemDecision,
  type RedeemRefusal,
  type ShareDecision,
  type ShareGrant,
  type ShareRefusal,
  type ShareStatus,
} from './domain/share-access';
