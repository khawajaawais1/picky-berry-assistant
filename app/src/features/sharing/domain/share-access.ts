import type { DemoZone } from '@/features/discover';

/**
 * The access rule of the first backend slice: **who may read a share.**
 *
 * A **share** is one picker's grant of read access to one place, made to the people they invite
 * and revocable by them. This module is that grant's shape and the whole of the decision — nothing
 * else in the app decides who may see what.
 *
 * **Where the rule is enforced, and why it is written here.** Authorisation is the server's
 * (AGENTS.md §5, SECURITY.md §3): this repository is the mobile app (ADR-015), so what it can
 * contribute to the first backend slice is the **specification**, which is this module and its
 * tests — pure, clock-injected, no I/O — plus the wire contract it is drawn against
 * ([docs/api-contract.md](../../../../docs/api-contract.md)). The server implements the same rule
 * and must satisfy the same cases; the app may call this module to decide **what to draw**, and
 * that use is UX, never a check. A screen that hides a share the server would hand it has not
 * protected anything.
 *
 * **The four questions AGENTS.md §11 asks of stored data** are answered where the data is stored:
 * this module stores nothing. The record's answers — who may read it, how a copy is got, how it is
 * corrected and how it is deleted — are in the contract (docs/api-contract.md, “The record”), and
 * the fields the app itself keeps are unchanged: nothing here is written to the device, sent, or
 * logged.
 *
 * **What is shared is a zone id** — the app's one geographic thing (`features/discover`) — and it
 * stays one until open question 26 answers what a spot *is* (a zone, or a place inside one). When
 * it answers, this field is renamed deliberately; until then the name is honest. No type or key
 * here is called “spot”, per CONTEXT.md's note on the word.
 *
 * Three rules the tests fix, all of them the conservative direction:
 *
 * 1. **Default deny.** A grant that is missing, revoked, expired, or whose window the app cannot
 *    read is closed. So is a grant asked about with a clock the app cannot read: `NaN` comparisons
 *    would otherwise read as “not expired yet”, which is a leak rather than a bug.
 * 2. **A refusal has a reason, for the server's own logs** — and only for them. `not-found`,
 *    `not-holder`, `expired`, `revoked` and `unreadable` are distinct here and **indistinguishable
 *    to a client**: the API answers one status for all of them, so nobody can enumerate other
 *    people's shares by watching which refusal they get.
 * 3. **Revocation and expiry close the grant for the people it was shared with, and not for the
 *    sharer.** The record is the sharer's own data, and the screen that revokes a share has to be
 *    able to list it; what ends is the access it gave to others (AGENTS.md §11.1: revoking has to
 *    be as easy as sharing).
 */

/**
 * One picker's grant of read access, as the server keeps it.
 *
 * The identifiers are accounts as the identity provider named them (ADR-013: its token's subject),
 * which is the only account name this rule trusts — never a value a client sent to be believed.
 *
 * What a viewer is *told* about the sharer is not part of this type: whether the sharer's name
 * travels with a share is one of question 26's open parts, so nothing here decides it, and the
 * rule reads no name for any decision.
 */
export type ShareGrant = {
  id: string;
  /** The zone the grant is about. A zone id until question 26 says what a spot is. */
  zoneId: DemoZone['id'];
  /** The account that made the grant. */
  sharerId: string;
  /** When it was made, ISO-8601. */
  sharedAt: string;
  /** When it stops granting access, ISO-8601 (ADR-014: retention is 12 months). */
  expiresAt: string;
  /** When the sharer took it back, ISO-8601 — present means revoked, whatever the value says. */
  revokedAt?: string;
  /** The accounts that redeemed the sharer's invite, in the order they did. */
  redeemedBy: readonly string[];
};

/**
 * Where a grant stands at a moment. `active` is the only state that grants access to anyone but
 * the sharer.
 */
export type ShareStatus = 'active' | 'expired' | 'revoked' | 'unreadable';

/** Why a read was refused. The server logs it; a client is never told which one it was. */
export type ShareRefusal = 'not-found' | 'not-holder' | 'expired' | 'revoked' | 'unreadable';

export type ShareDecision = { readable: true } | { readable: false; refusal: ShareRefusal };

/** Why a redemption was refused. */
export type RedeemRefusal = 'not-holder' | 'own-share' | 'expired' | 'revoked' | 'unreadable';

export type RedeemDecision = { redeemable: true } | { redeemable: false; refusal: RedeemRefusal };

/**
 * The shape of a moment the app can compare: `toISOString()`'s UTC timestamp, to the millisecond.
 *
 * Narrower than “anything `Date.parse` accepts”, for the reason the session reader gives: a value
 * of another shape came from somewhere else — a hand-edit, another version, a truncated write —
 * and “somewhere else” is not a reason to treat a grant as live. The same test the session module
 * applies; it is written twice because a third caller is when this repository extracts a shared
 * helper (AGENTS.md §2.5).
 */
const ISO_MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isMoment(value: unknown): value is string {
  return typeof value === 'string' && ISO_MOMENT.test(value) && !Number.isNaN(Date.parse(value));
}

/** An identifier, or nothing: a blank value is not an account and never matches one. */
function account(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Where a grant stands at the moment given.
 *
 * A revocation is read from the **presence** of `revokedAt`, not from its value: the field exists
 * because the sharer took the share back, and a revocation the app cannot parse is still one.
 * The window is the opposite case — it is compared, so an unreadable window is `unreadable`
 * rather than open.
 */
export function shareStatus(grant: ShareGrant, at: Date): ShareStatus {
  if (grant.revokedAt !== undefined) {
    return 'revoked';
  }
  if (!isMoment(grant.expiresAt) || Number.isNaN(at.getTime())) {
    return 'unreadable';
  }
  // The instant it expires is already over: the same boundary the session's expiry follows, so
  // two rules in one app cannot disagree about a moment.
  return Date.parse(grant.expiresAt) <= at.getTime() ? 'expired' : 'active';
}

/**
 * Whether this viewer may read this share at this moment.
 *
 * `undefined` means the server found no such grant; it is a refusal like any other and, like every
 * refusal here, it is reported to a client as the same “not here”.
 */
export function canReadShare(
  grant: ShareGrant | undefined,
  viewerId: string,
  at: Date,
): ShareDecision {
  if (grant === undefined) {
    return { readable: false, refusal: 'not-found' };
  }

  const viewer = account(viewerId);
  if (viewer === null) {
    return { readable: false, refusal: 'not-holder' };
  }

  // The sharer keeps their own record however it ends: what revocation and expiry take away is
  // the access granted to other people, not the sharer's own data.
  if (viewer === grant.sharerId) {
    return { readable: true };
  }

  // `revoked`, `expired` and `unreadable` are the three closed states, and each is its own
  // refusal: the server measures them, and a client is told none of them.
  const status = shareStatus(grant, at);
  if (status !== 'active') {
    return { readable: false, refusal: status };
  }

  return grant.redeemedBy.includes(viewer)
    ? { readable: true }
    : { readable: false, refusal: 'not-holder' };
}

/**
 * The shares this viewer **received**: the active ones they redeemed, and never their own.
 *
 * This is the filter a list endpoint may apply before answering — one endpoint's answer is the
 * sharer's own list (`canReadShare` for the same viewer), and the two must not be one query with
 * a flag, because the flag is where a grant ends up in the wrong list. The order given is kept:
 * the server decides the order (newest first) and the list a screen draws is stable.
 */
export function receivedShares(
  grants: readonly ShareGrant[],
  viewerId: string,
  at: Date,
): ShareGrant[] {
  const viewer = account(viewerId);

  return grants.filter(
    (grant) =>
      viewer !== null && viewer !== grant.sharerId && canReadShare(grant, viewer, at).readable,
  );
}

/**
 * Whether this viewer may redeem the sharer's invite to this share.
 *
 * Redeeming is how a recipient becomes one, which is why no third party's address or number is
 * needed anywhere: the sharer sends the link themselves, and the account that opens it is bound to
 * the grant. Redeeming twice answers the same as redeeming once — a retry is not a failure — and
 * the sharer cannot redeem their own invite, so an invitee's place cannot be taken by accident.
 */
export function mayRedeem(grant: ShareGrant, viewerId: string, at: Date): RedeemDecision {
  const viewer = account(viewerId);
  if (viewer === null) {
    return { redeemable: false, refusal: 'not-holder' };
  }

  const status = shareStatus(grant, at);
  if (status !== 'active') {
    return { redeemable: false, refusal: status };
  }

  if (viewer === grant.sharerId) {
    return { redeemable: false, refusal: 'own-share' };
  }

  return { redeemable: true };
}
