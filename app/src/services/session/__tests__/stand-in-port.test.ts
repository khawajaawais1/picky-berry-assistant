import { createInMemorySessionStore, type SessionStore } from '../store';
import { SESSION_LIFETIME_MS, parseSession } from '../session';
import { STUB_CODE } from '../stand-in-code';
import { createStandInSessionPort } from '../stand-in-port';

/**
 * The seam's behaviour, held at the port rather than at the screen: this is what the sign-in
 * screen and the app shell will both build against, and what a real provider has to be able to
 * take over without either of them noticing.
 *
 * The stand-in exists because the account service does not (ADR-013 decides Firebase, PROJECT.md's
 * open question 12 is still open), so what is checked here is that a session can be obtained,
 * held, expired and dropped — and that the stand-in is not a way in: one code, refused in a
 * production build, with nothing kept when it is refused.
 */
const ISSUED_AT = new Date('2026-10-10T11:00:00.000Z');
const IDENTIFIER = 'aino@example.fi';
// What screen 03 collected and screen 04 carries to the port: the account's name, which the
// session holds so the settings screen can draw whose settings these are.
const DISPLAY_NAME = 'Aino Korhonen';

function portOn(options: {
  environment?: 'development' | 'preview' | 'production';
  now?: Date;
  store?: SessionStore;
}) {
  const store = options.store ?? createInMemorySessionStore();

  return {
    port: createStandInSessionPort({
      environment: options.environment ?? 'development',
      now: () => options.now ?? ISSUED_AT,
      store,
    }),
    store,
  };
}

describe('the stand-in session port', () => {
  it('exchanges the stand-in code for a session about the identifier it was given', async () => {
    const { port } = portOn({});

    const result = await port.signIn({
      code: STUB_CODE,
      displayName: DISPLAY_NAME,
      identifier: IDENTIFIER,
    });

    expect(result).toEqual({
      ok: true,
      session: {
        accountId: IDENTIFIER,
        displayName: DISPLAY_NAME,
        expiresAt: new Date(ISSUED_AT.getTime() + SESSION_LIFETIME_MS).toISOString(),
        issuedAt: ISSUED_AT.toISOString(),
      },
    });
  });

  it('hands the session it just issued back to the caller who asks for one', async () => {
    const { port } = portOn({});

    await port.signIn({ code: STUB_CODE, displayName: DISPLAY_NAME, identifier: IDENTIFIER });

    expect(await port.current()).toMatchObject({ accountId: IDENTIFIER });
  });

  it('is holding no session before anyone has signed in', async () => {
    expect(await portOn({}).port.current()).toBeNull();
  });

  it('refuses every other code, and keeps nothing when it does', async () => {
    const { port, store } = portOn({});

    expect(
      await port.signIn({ code: '482169', displayName: DISPLAY_NAME, identifier: IDENTIFIER }),
    ).toEqual({
      ok: false,
      reason: 'refused',
    });
    expect(await port.current()).toBeNull();
    expect(await store.read()).toBeNull();
  });

  it('refuses the stand-in code too in a production build, and says why', async () => {
    // A shipped build has no account service, so nothing there can answer the question a
    // credential asks — and a stand-in answer must never be what lets someone in.
    const { port, store } = portOn({ environment: 'production' });

    expect(
      await port.signIn({ code: STUB_CODE, displayName: DISPLAY_NAME, identifier: IDENTIFIER }),
    ).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(await store.read()).toBeNull();
  });

  it('stops holding a session once its lifetime is over, and stops keeping it', async () => {
    const { port, store } = portOn({});

    await port.signIn({ code: STUB_CODE, displayName: DISPLAY_NAME, identifier: IDENTIFIER });
    const expired = new Date(ISSUED_AT.getTime() + SESSION_LIFETIME_MS + 1);

    const current = createStandInSessionPort({
      environment: 'development',
      now: () => expired,
      store,
    });

    expect(await current.current()).toBeNull();
    // A credential the app may no longer use is not one it may keep (ADR-006: cleared on
    // refresh failure, on sign-out and on expiry — the same rule).
    expect(await store.read()).toBeNull();
  });

  it('forgets the session when the user signs out', async () => {
    const { port, store } = portOn({});

    await port.signIn({ code: STUB_CODE, displayName: DISPLAY_NAME, identifier: IDENTIFIER });
    await port.signOut();

    expect(await port.current()).toBeNull();
    expect(await store.read()).toBeNull();
  });

  it('reads nothing out of a value it cannot understand, and drops it', async () => {
    // What is stored is a claim about who the user is: unreadable data is no session, never a
    // session, and keeping it would mean asking the same question again on every read.
    const { port, store } = portOn({});

    await store.write('{"accountId":');

    expect(await port.current()).toBeNull();
    expect(await store.read()).toBeNull();
    expect(parseSession('{"accountId":')).toBeNull();
  });

  it('reports a session that could not be kept rather than handing one back', async () => {
    // A store that cannot write — a full disk, a locked keychain — must reject: a caller that
    // was told it had a session would go on to act as the user with nothing behind the claim.
    const store: SessionStore = {
      clear: async () => undefined,
      read: async () => null,
      write: async () => {
        throw new Error('the keychain refused the write');
      },
    };
    const { port } = portOn({ store });

    await expect(
      port.signIn({ code: STUB_CODE, displayName: DISPLAY_NAME, identifier: IDENTIFIER }),
    ).rejects.toThrow('the keychain refused the write');
  });

  it('refuses an identifier that is not one, rather than issuing a session about nothing', async () => {
    const { port } = portOn({});

    await expect(
      port.signIn({ code: STUB_CODE, displayName: DISPLAY_NAME, identifier: '   ' }),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it('issues a session about an account the credential does not name', async () => {
    // A returning user signs in with a code and no name (ADR-034's chosen reading): the name
    // screen 03 collected belongs to a sign-up, and a sign-in asks the account service for the
    // account's own name instead. With no service the app has none, which is a state the
    // session records as `null` — not one a caller may fill in with a guess (ADR-038).
    const { port } = portOn({});

    const result = await port.signIn({ code: STUB_CODE, identifier: IDENTIFIER });

    expect(result).toEqual({
      ok: true,
      session: {
        accountId: IDENTIFIER,
        displayName: null,
        expiresAt: new Date(ISSUED_AT.getTime() + SESSION_LIFETIME_MS).toISOString(),
        issuedAt: ISSUED_AT.toISOString(),
      },
    });
  });

  it('refuses a name that is blank, rather than reading it as an account without one', async () => {
    // Absent means “the app has no name for this account”; blank is what a caller that forgot to
    // pass one produces, and the two must not collapse into each other.
    const { port, store } = portOn({});

    await expect(
      port.signIn({ code: STUB_CODE, displayName: '  ', identifier: IDENTIFIER }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(await store.read()).toBeNull();
  });
});
