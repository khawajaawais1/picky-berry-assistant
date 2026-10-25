import {
  canReadShare,
  mayRedeem,
  receivedShares,
  shareStatus,
  type ShareGrant,
} from '../share-access';

/**
 * The access rule of the first backend slice, tested before it exists.
 *
 * This is **the specification in executable form**: the rule the server must enforce when a
 * picker asks to read a share somebody made. The app may use the same answers to decide what to
 * draw, but a client check is UX and never authorisation (AGENTS.md §5, SECURITY.md §3) — so the
 * cases below are written as the server's own tests, and a server implementation that does not
 * satisfy them is wrong.
 *
 * What the cases are built around, in the order they matter:
 *
 * 1. **Default deny.** Anything the app cannot read as a grant is closed, not open, and a clock
 *    it cannot read closes it too — the two failure directions that turn into a data leak.
 * 2. **Refusal carries a reason.** The decision says *why* it refused (`expired`, `revoked`,
 *    `not-holder`, `not-found`, `unreadable`) because the server needs it for its own logs and
 *    for metrics. It is not what a client is told: the API maps every refusal to one answer, so a
 *    caller cannot enumerate other people's shares (docs/api-contract.md).
 * 3. **Revoking is as easy as sharing.** Revocation and expiry close a share for everyone it was
 *    shared with, while the sharer keeps their own record — the record is their own data, and the
 *    screen that revokes a share has to be able to list it.
 * 4. **The invite is a link, not a lookup.** A recipient becomes one by redeeming, so no third
 *    party's address is processed at all; the rule therefore decides *who may redeem*, not who
 *    may be found.
 */

const SHARER = 'account-aino';
const RECIPIENT = 'account-mikko';
const STRANGER = 'account-elina';
/** An account that is on no share at all: the default-deny case a list has to get right. */
const NOBODY = 'account-on-nothing';
const SHARED_AT = '2026-10-10T09:00:00.000Z';
const EXPIRES_AT = '2027-10-10T09:00:00.000Z';

/** A grant one picker made to one person, active unless a case changes it. */
function grant(overrides: Partial<ShareGrant> = {}): ShareGrant {
  return {
    id: 'share-1',
    zoneId: 'Z14',
    sharerId: SHARER,
    sharedAt: SHARED_AT,
    expiresAt: EXPIRES_AT,
    redeemedBy: [RECIPIENT],
    ...overrides,
  };
}

/** A moment inside the grant's window, so a case has to say when it is asking. */
const during = new Date('2026-10-11T09:00:00.000Z');

describe('shareStatus', () => {
  it('is active while the share is inside its window', () => {
    expect(shareStatus(grant(), during)).toBe('active');
  });

  it('is expired at the instant it expires, not a moment later', () => {
    // The boundary is a rule, not a rounding: the instant it expires is already over (the same
    // rule the session's expiry follows, `src/services/session/session.ts`).
    expect(shareStatus(grant(), new Date(EXPIRES_AT))).toBe('expired');
    expect(shareStatus(grant(), new Date(Date.parse(EXPIRES_AT) - 1))).toBe('active');
  });

  it('is revoked while the revocation is recorded, whatever moment it names', () => {
    // The field's presence is the fact: a revocation the app cannot read as a moment is still a
    // revocation. Failing closed here is the whole point.
    expect(shareStatus(grant({ revokedAt: 'not-a-moment' }), during)).toBe('revoked');
  });

  it('is unreadable when the window is not a moment the app can compare', () => {
    expect(shareStatus(grant({ expiresAt: 'next October' }), during)).toBe('unreadable');
    expect(shareStatus(grant({ expiresAt: '2027-10-10' }), during)).toBe('unreadable');
  });

  it('is unreadable when the clock it is asked about is not a moment either', () => {
    // A caller with a broken clock must not open everything it asks about: `NaN <= NaN` is false,
    // which would read as “not expired yet”.
    expect(shareStatus(grant(), new Date('nonsense'))).toBe('unreadable');
  });
});

describe('canReadShare', () => {
  it('refuses a viewer who is not on the share', () => {
    expect(canReadShare(grant(), STRANGER, during)).toEqual({
      readable: false,
      refusal: 'not-holder',
    });
  });

  it('refuses when there is no grant at all, and says so', () => {
    // The reason is the server's (it logs “asked for something that is not there”), never the
    // client's: the API answers 404 for this and every other refusal.
    expect(canReadShare(undefined, RECIPIENT, during)).toEqual({
      readable: false,
      refusal: 'not-found',
    });
  });

  it('lets the person it was shared with read it', () => {
    expect(canReadShare(grant(), RECIPIENT, during)).toEqual({ readable: true });
  });

  it('lets the sharer read their own share', () => {
    expect(canReadShare(grant(), SHARER, during)).toEqual({ readable: true });
  });

  it('keeps the sharer’s own record after the share is revoked or expired', () => {
    // The record is the sharer's own data and the screen that revokes a share lists it; what
    // revocation and expiry end is the access it granted to other people.
    expect(canReadShare(grant({ revokedAt: SHARED_AT }), SHARER, during)).toEqual({
      readable: true,
    });
    expect(canReadShare(grant(), SHARER, new Date(EXPIRES_AT))).toEqual({ readable: true });
  });

  it('closes the share for its recipients when it is revoked', () => {
    expect(canReadShare(grant({ revokedAt: SHARED_AT }), RECIPIENT, during)).toEqual({
      readable: false,
      refusal: 'revoked',
    });
  });

  it('closes the share for its recipients when it expires', () => {
    expect(canReadShare(grant(), RECIPIENT, new Date(EXPIRES_AT))).toEqual({
      readable: false,
      refusal: 'expired',
    });
  });

  it('refuses everyone but the sharer when the window cannot be read', () => {
    expect(canReadShare(grant({ expiresAt: 'soon' }), RECIPIENT, during)).toEqual({
      readable: false,
      refusal: 'unreadable',
    });
  });

  it('refuses a viewer id that is blank, and never matches one id against another as a prefix', () => {
    // A blank id is not an account, and `account-2` is not `account-20`: the rule compares whole
    // identifiers, because the value comes from a token the server read and never from a client.
    expect(canReadShare(grant(), '', during)).toEqual({ readable: false, refusal: 'not-holder' });
    expect(canReadShare(grant({ redeemedBy: ['account-2'] }), 'account-20', during)).toEqual({
      readable: false,
      refusal: 'not-holder',
    });
  });

  it('refuses a viewer who redeemed a different share', () => {
    expect(
      canReadShare(grant({ id: 'share-2', redeemedBy: [STRANGER] }), RECIPIENT, during),
    ).toEqual({ readable: false, refusal: 'not-holder' });
  });
});

describe('receivedShares', () => {
  const mine = grant({ id: 'shared-by-me', redeemedBy: [] });
  const incoming = grant({ id: 'shared-with-me' });
  const revoked = grant({ id: 'revoked-by-the-sharer', revokedAt: SHARED_AT });
  const expired = grant({ id: 'expired', expiresAt: '2026-10-10T09:30:00.000Z' });
  const someoneElses = grant({ id: 'someone-elses', redeemedBy: [STRANGER] });

  it('returns the shares the viewer is on, and nothing else', () => {
    // What a list endpoint may return at all. The sharer's own share, a revoked share and an
    // expired one are all still theirs to read — but not *received*, which is what this list is.
    expect(
      receivedShares([mine, incoming, revoked, expired, someoneElses], RECIPIENT, during),
    ).toEqual([incoming]);
  });

  it('returns nothing to a viewer who is on nothing', () => {
    // The default-deny case for a list, and it has to be a viewer who is genuinely on nothing:
    // `someoneElses` is shared with `STRANGER`, who therefore receives it.
    expect(receivedShares([mine, incoming, someoneElses], NOBODY, during)).toEqual([]);
  });

  it('never returns the viewer’s own share as one they received', () => {
    expect(receivedShares([mine], SHARER, during)).toEqual([]);
  });

  it('keeps the order it was given, so a list is stable', () => {
    const first = grant({ id: 'a', redeemedBy: [RECIPIENT] });
    const second = grant({ id: 'b', redeemedBy: [RECIPIENT] });

    expect(receivedShares([second, first], RECIPIENT, during).map((entry) => entry.id)).toEqual([
      'b',
      'a',
    ]);
  });
});

describe('mayRedeem', () => {
  it('lets an invited account redeem an active share it has not redeemed', () => {
    expect(mayRedeem(grant({ redeemedBy: [] }), RECIPIENT, during)).toEqual({ redeemable: true });
  });

  it('answers the same way the second time, rather than refusing it', () => {
    // Redeeming twice is the same outcome as redeeming once — a retry on a flaky connection must
    // not read as a failure the user has to understand.
    expect(mayRedeem(grant(), RECIPIENT, during)).toEqual({ redeemable: true });
  });

  it('refuses the sharer their own invite, so an invitee’s place is not taken', () => {
    expect(mayRedeem(grant({ redeemedBy: [] }), SHARER, during)).toEqual({
      redeemable: false,
      refusal: 'own-share',
    });
  });

  it('refuses to redeem a share that is no longer active', () => {
    expect(mayRedeem(grant({ revokedAt: SHARED_AT }), RECIPIENT, during)).toEqual({
      redeemable: false,
      refusal: 'revoked',
    });
    expect(mayRedeem(grant(), RECIPIENT, new Date(EXPIRES_AT))).toEqual({
      redeemable: false,
      refusal: 'expired',
    });
    expect(mayRedeem(grant({ expiresAt: 'whenever' }), RECIPIENT, during)).toEqual({
      redeemable: false,
      refusal: 'unreadable',
    });
  });

  it('refuses a blank viewer, which is not an account', () => {
    expect(mayRedeem(grant({ redeemedBy: [] }), '', during)).toEqual({
      redeemable: false,
      refusal: 'not-holder',
    });
  });
});
