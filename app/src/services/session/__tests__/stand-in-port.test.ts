import { SESSION_LIFETIME_MS, parseSession } from '../session';
import { createStandInSessionPort } from '../stand-in-port';
import { createInMemorySessionStore, type SessionStore } from '../store';

/**
 * The seam's behaviour, held at the port rather than at the screen: this is what the
 * create-account screen, the sign-in screen and the app shell will both build against, and what a
 * real provider has to be able to take over without either of them noticing.
 *
 * The stand-in exists because the account service does not (ADR-054 decides its shape), so what is
 * checked here is that a session can be obtained, held, expired and dropped — and that the
 * stand-in is not a way in: it accepts no credential in a production build, keeps no password,
 * and refuses a credential about nobody rather than issuing a session about nothing.
 */
const ISSUED_AT = new Date('2026-10-10T11:00:00.000Z');
const EMAIL = 'aino@example.fi';
// What screen 03 collected and the port carries to the session: the account's name, which the
// session holds so the settings screen can draw whose settings these are.
const DISPLAY_NAME = 'Aino Korhonen';
const PASSWORD = 'berries1234';

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
  it('exchanges an email and password for a session about the address it was given', async () => {
    const { port } = portOn({});

    const result = await port.signIn({
      displayName: DISPLAY_NAME,
      email: EMAIL,
      password: PASSWORD,
    });

    expect(result).toEqual({
      ok: true,
      session: {
        accountId: EMAIL,
        displayName: DISPLAY_NAME,
        expiresAt: new Date(ISSUED_AT.getTime() + SESSION_LIFETIME_MS).toISOString(),
        issuedAt: ISSUED_AT.toISOString(),
      },
    });
  });

  it('accepts a different password too, because it cannot check one and does not pretend to', async () => {
    // The stand-in is not a check: no provider is wired, so there is no password to compare
    // against. What gates the flow is the form's own rule; what the stand-in guarantees is that
    // it answers nothing in a production build and keeps no password.
    const { port } = portOn({});

    const result = await port.signIn({ email: EMAIL, password: 'something-else9' });

    expect(result.ok).toBe(true);
  });

  it('hands the session it just issued back to the caller who asks for one', async () => {
    const { port } = portOn({});

    await port.signIn({ displayName: DISPLAY_NAME, email: EMAIL, password: PASSWORD });

    expect(await port.current()).toMatchObject({ accountId: EMAIL });
  });

  it('is holding no session before anyone has signed in', async () => {
    expect(await portOn({}).port.current()).toBeNull();
  });

  it('keeps no password anywhere it can be read back', async () => {
    const { port, store } = portOn({});

    await port.signIn({ displayName: DISPLAY_NAME, email: EMAIL, password: PASSWORD });

    expect(await store.read()).not.toContain(PASSWORD);
  });

  it('refuses every credential in a production build, and keeps nothing when it does', async () => {
    // A shipped build has no account service, so nothing there can answer the question a
    // credential asks — and a stand-in answer must never be what lets someone in.
    const { port, store } = portOn({ environment: 'production' });

    expect(
      await port.signIn({ displayName: DISPLAY_NAME, email: EMAIL, password: PASSWORD }),
    ).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(await port.current()).toBeNull();
    expect(await store.read()).toBeNull();
  });

  it('stops holding a session once its lifetime is over, and stops keeping it', async () => {
    const { port, store } = portOn({});

    await port.signIn({ displayName: DISPLAY_NAME, email: EMAIL, password: PASSWORD });
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

    await port.signIn({ displayName: DISPLAY_NAME, email: EMAIL, password: PASSWORD });
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
      port.signIn({ displayName: DISPLAY_NAME, email: EMAIL, password: PASSWORD }),
    ).rejects.toThrow('the keychain refused the write');
  });

  it('refuses an address that is not one, rather than issuing a session about nothing', async () => {
    const { port } = portOn({});

    await expect(port.signIn({ email: '   ', password: PASSWORD })).rejects.toBeInstanceOf(
      RangeError,
    );
  });

  it('refuses an empty password, which no screen would have offered', async () => {
    const { port, store } = portOn({});

    await expect(port.signIn({ email: EMAIL, password: '' })).rejects.toBeInstanceOf(RangeError);
    expect(await store.read()).toBeNull();
  });

  it('issues a session about an account the credential does not name', async () => {
    // A returning user signs in with no name (ADR-034's chosen reading): the name screen 03
    // collected belongs to a sign-up, and a sign-in asks the account service for the account's own
    // name instead. With no service the app has none, which is a state the session records as
    // `null` — not one a caller may fill in with a guess (ADR-038).
    const { port } = portOn({});

    const result = await port.signIn({ email: EMAIL, password: PASSWORD });

    expect(result).toEqual({
      ok: true,
      session: {
        accountId: EMAIL,
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
      port.signIn({ displayName: '  ', email: EMAIL, password: PASSWORD }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(await store.read()).toBeNull();
  });
});

/**
 * The reset request, which is the fourth operation the port gained in ADR-062. It is the
 * provider's work — the app never sees the link, the token or the new password — so what the
 * stand-in can answer is only whether the request was accepted. It sends nothing, stores nothing
 * and signs nobody in; the screen says the rest.
 */
describe('the stand-in session port, asked for a password reset', () => {
  it('accepts a non-empty address outside a production build', async () => {
    const { port } = portOn({});

    expect(await port.requestPasswordReset(EMAIL)).toEqual({ ok: true });
  });

  it('answers nothing in a production build, where no provider can send a link', async () => {
    const { port } = portOn({ environment: 'production' });

    expect(await port.requestPasswordReset(EMAIL)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('refuses an address that is not one, rather than accepting a request about nobody', async () => {
    const { port } = portOn({});

    await expect(port.requestPasswordReset('   ')).rejects.toBeInstanceOf(RangeError);
  });

  it('keeps no address, no link and no session when it accepts a request', async () => {
    const { port, store } = portOn({});

    await port.requestPasswordReset(EMAIL);

    // A reset request is not a sign-in: the session store is untouched, and the address is not
    // written anywhere by the seam.
    expect(await port.current()).toBeNull();
    expect(await store.read()).toBeNull();
  });
});
