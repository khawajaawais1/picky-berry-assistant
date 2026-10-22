import {
  SESSION_LIFETIME_MS,
  isExpired,
  mintSession,
  parseSession,
  remainingMilliseconds,
} from '../session';

/**
 * The session record's rules, as pure data: what a stored value has to look like to be read
 * at all, and when a session stops being usable.
 *
 * The parse is where the security value sits: a session is a claim about who the user is, so
 * anything the app cannot understand — a truncated write, a hand-edited value, a shape from
 * another version — has to read as **no session**, never as one.
 */
describe('a stored session', () => {
  const SESSION = {
    accountId: 'aino@example.fi',
    displayName: 'Aino Korhonen',
    expiresAt: '2026-10-10T12:00:00.000Z',
    issuedAt: '2026-10-10T11:00:00.000Z',
  };

  it('is read back when it is a session', () => {
    expect(parseSession(JSON.stringify(SESSION))).toEqual(SESSION);
  });

  it('is no session when there is nothing stored', () => {
    expect(parseSession(null)).toBeNull();
  });

  it('is no session when the stored value is not JSON at all', () => {
    expect(parseSession('not json')).toBeNull();
  });

  it('is no session when it is missing the account it is about', () => {
    const { accountId: _accountId, ...withoutAccount } = SESSION;

    expect(parseSession(JSON.stringify(withoutAccount))).toBeNull();
    expect(parseSession(JSON.stringify({ ...SESSION, accountId: '' }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...SESSION, accountId: 42 }))).toBeNull();
  });

  it('is no session when either end of its lifetime is not a moment', () => {
    expect(parseSession(JSON.stringify({ ...SESSION, expiresAt: 'soon' }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...SESSION, issuedAt: '2026-10-10' }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...SESSION, expiresAt: undefined }))).toBeNull();
  });

  it('is a session when the account it is about has no name yet', () => {
    // A returning user signs in with a code and no name: the account's own name is the
    // service's answer, and until there is a service the app has none (ADR-038). The name is
    // therefore part of the record's shape — the key is always written — while `null` is a
    // state the screen draws differently, not a missing field.
    const nameless = { ...SESSION, displayName: null };

    expect(parseSession(JSON.stringify(nameless))).toEqual(nameless);
  });

  it('is no session when the name it carries is neither a name nor the absence of one', () => {
    const { displayName: _displayName, ...withoutName } = SESSION;

    expect(parseSession(JSON.stringify(withoutName))).toBeNull();
    expect(parseSession(JSON.stringify({ ...SESSION, displayName: '' }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...SESSION, displayName: 42 }))).toBeNull();
  });

  it('is not read out of an array or a bare value', () => {
    expect(parseSession(JSON.stringify([SESSION]))).toBeNull();
    expect(parseSession(JSON.stringify('aino@example.fi'))).toBeNull();
  });
});

describe('a session’s lifetime', () => {
  const issuedAt = new Date('2026-10-10T11:00:00.000Z');
  const session = mintSession('aino@example.fi', 'Aino Korhonen', issuedAt);

  it('carries the account it is about, under the name the sign-up gave it', () => {
    expect(session.accountId).toBe('aino@example.fi');
    expect(session.displayName).toBe('Aino Korhonen');
  });

  it('carries no name for an account the app cannot name', () => {
    // `null` rather than an empty string: the field is always written, and “the service has no
    // profile name for this account” is not the same value as “someone forgot one”.
    expect(mintSession('aino@example.fi', null, issuedAt).displayName).toBeNull();
  });

  it('starts when it was issued and runs for the stand-in lifetime', () => {
    expect(session.issuedAt).toBe(issuedAt.toISOString());
    expect(Date.parse(session.expiresAt) - issuedAt.getTime()).toBe(SESSION_LIFETIME_MS);
  });

  it('is usable right up to its expiry and not a moment after', () => {
    const expiresAt = Date.parse(session.expiresAt);

    expect(isExpired(session, new Date(expiresAt - 1))).toBe(false);
    expect(isExpired(session, new Date(expiresAt))).toBe(true);
    expect(isExpired(session, new Date(expiresAt + 1))).toBe(true);
  });

  it('says how long is left, and never a negative amount of it', () => {
    const expiresAt = Date.parse(session.expiresAt);

    expect(remainingMilliseconds(session, new Date(expiresAt - 60_000))).toBe(60_000);
    expect(remainingMilliseconds(session, new Date(expiresAt))).toBe(0);
    expect(remainingMilliseconds(session, new Date(expiresAt + 60_000))).toBe(0);
  });
});
