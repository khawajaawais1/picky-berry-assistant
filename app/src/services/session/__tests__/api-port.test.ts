import { createApiClient, type ApiFetch } from '@/services/api/api-client';

import { createApiSessionPort, type Registration } from '../api-port';
import { createInMemorySessionStore } from '../store';

/**
 * The API adapter for the session port (ADR-065): the team API checks the password and issues
 * the tokens, and the port keeps them in the store and rotates them.
 *
 * Wired through the real transport with a recorded `fetch`, an in-memory store and a fixed
 * clock. No test reaches the network.
 */
const BASE = 'https://api.example.test';
const NOW = new Date('2026-11-21T12:00:00.000Z');
const EMAIL = 'aino@example.fi';
const PASSWORD = 'correct horse battery';

function authSession(overrides: { access?: string; refresh?: string; expiresIn?: number } = {}) {
  return {
    access_token: overrides.access ?? 'access-1',
    refresh_token: overrides.refresh ?? 'refresh-1',
    token_type: 'Bearer',
    expires_in: overrides.expiresIn ?? 900,
    user: {
      id: '0f8fad5b-d9cb-469f-a165-70867728950e',
      email: EMAIL,
      nickname: 'Aino',
      role: 'picker',
    },
  };
}

type Answer = { status: number; body?: unknown } | 'offline';

function harness(...answers: Answer[]) {
  const queue = [...answers];
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error('the test gave no answer for this request');
    if (next === 'offline') throw new TypeError('Network request failed');
    return { ok: next.status < 300, status: next.status, json: async () => next.body ?? {} };
  });
  let clock = NOW;
  const store = createInMemorySessionStore();
  const port = createApiSessionPort({
    client: createApiClient({ baseUrl: BASE, fetchImpl }),
    store,
    now: () => clock,
  });

  return {
    fetchImpl,
    port,
    store,
    advance(ms: number) {
      clock = new Date(clock.getTime() + ms);
    },
    answer(...more: Answer[]) {
      queue.push(...more);
    },
    sent(index: number) {
      const [url, init] = fetchImpl.mock.calls[index]!;
      return { url, init, body: init.body === undefined ? undefined : JSON.parse(init.body) };
    },
  };
}

const REGISTRATION: Registration = {
  email: EMAIL,
  password: PASSWORD,
  displayName: 'Aino',
  lang: 'fi',
  consents: { terms_version: '2026-10', privacy_policy_version: '2026-10' },
};

describe('createApiSessionPort', () => {
  describe('signIn', () => {
    it('exchanges the address and password at /auth/login, sending no bearer', async () => {
      const h = harness({ status: 200, body: authSession() });

      await h.port.signIn({ email: `  ${EMAIL} `, password: PASSWORD });

      const { url, init, body } = h.sent(0);
      expect(url).toBe(`${BASE}/api/v1/auth/login`);
      expect(init.method).toBe('POST');
      expect(init.headers).not.toHaveProperty('Authorization');
      expect(body).toEqual({ email: EMAIL, password: PASSWORD });
    });

    it('answers a session about the account, good until the access token expires', async () => {
      const h = harness({ status: 200, body: authSession({ expiresIn: 900 }) });

      const result = await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(result).toEqual({
        ok: true,
        session: {
          accountId: EMAIL,
          displayName: 'Aino',
          issuedAt: NOW.toISOString(),
          expiresAt: new Date(NOW.getTime() + 900_000).toISOString(),
        },
      });
    });

    it('keeps the tokens and never the password', async () => {
      const h = harness({ status: 200, body: authSession() });

      await h.port.signIn({ email: EMAIL, password: PASSWORD });

      const stored = (await h.store.read()) ?? '';
      expect(stored).toContain('access-1');
      expect(stored).toContain('refresh-1');
      expect(stored).not.toContain(PASSWORD);
    });

    it('records a null nickname as an account with no name', async () => {
      const body = authSession();
      body.user.nickname = null as unknown as string;
      const h = harness({ status: 200, body });

      const result = await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(result.ok && result.session.displayName).toBeNull();
    });

    it.each([401, 422])('reads a %i as a refused credential and keeps nothing', async (status) => {
      const h = harness({
        status,
        body: { error: { code: 'X', message: 'x' }, request_id: 'q' },
      });

      const result = await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(result).toEqual({ ok: false, reason: 'refused' });
      expect(await h.store.read()).toBeNull();
    });

    it.each<[string, Answer]>([
      ['a network failure', 'offline'],
      ['a server error', { status: 503 }],
      ['a rate limit', { status: 429 }],
      ['a body that is not a session', { status: 200, body: { access_token: 'a' } }],
    ])('reads %s as unavailable and keeps nothing', async (_, answer) => {
      const h = harness(answer);

      const result = await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(result).toEqual({ ok: false, reason: 'unavailable' });
      expect(await h.store.read()).toBeNull();
    });

    it.each<[string, Record<string, unknown>]>([
      ['a token type other than Bearer', { token_type: 'MAC' }],
      ['a lifetime that is not a whole number of seconds', { expires_in: 1.5 }],
      ['a lifetime below one second', { expires_in: 0 }],
      ['a blank refresh token', { refresh_token: ' ' }],
    ])('reads a session with %s as unavailable', async (_, change) => {
      const h = harness({ status: 200, body: { ...authSession(), ...change } });

      expect(await h.port.signIn({ email: EMAIL, password: PASSWORD })).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });

    it.each<[string, unknown]>([
      ['a nickname that is not text', { email: EMAIL, nickname: 7 }],
      ['no address', { email: ' ', nickname: null }],
    ])('reads a user with %s as unavailable', async (_, user) => {
      const h = harness({ status: 200, body: { ...authSession(), user } });

      expect((await h.port.signIn({ email: EMAIL, password: PASSWORD })).ok).toBe(false);
    });

    it('refuses to send an empty password', async () => {
      const h = harness();

      await expect(h.port.signIn({ email: EMAIL, password: '' })).rejects.toThrow(RangeError);
      expect(h.fetchImpl).not.toHaveBeenCalled();
    });

    it('refuses to send a credential that names no account', async () => {
      const h = harness();

      await expect(h.port.signIn({ email: '  ', password: PASSWORD })).rejects.toThrow(RangeError);
      expect(h.fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('creates the account at /auth/register with its name, language and consents', async () => {
      const h = harness({ status: 201, body: authSession() });

      const result = await h.port.register(REGISTRATION);

      const { url, body } = h.sent(0);
      expect(url).toBe(`${BASE}/api/v1/auth/register`);
      expect(body).toEqual({
        email: EMAIL,
        password: PASSWORD,
        nickname: 'Aino',
        lang: 'fi',
        consents: { terms_version: '2026-10', privacy_policy_version: '2026-10' },
      });
      expect(result.ok).toBe(true);
      expect(await h.store.read()).toContain('access-1');
    });

    it('sends no nickname when none was given', async () => {
      const h = harness({ status: 201, body: authSession() });

      await h.port.register({ ...REGISTRATION, displayName: '  ' });

      expect(h.sent(0).body).not.toHaveProperty('nickname');
    });

    it('reads an address already in use (409) as refused', async () => {
      const h = harness({ status: 409, body: { error: { code: 'EMAIL_TAKEN', message: 'x' } } });

      expect(await h.port.register(REGISTRATION)).toEqual({ ok: false, reason: 'refused' });
    });
  });

  describe('current', () => {
    it('answers nothing when nothing is held', async () => {
      expect(await harness().port.current()).toBeNull();
    });

    it('answers the held session without asking the network while the token is good', async () => {
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });

      const session = await h.port.current();

      expect(session?.accountId).toBe(EMAIL);
      expect(h.fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('rotates an expired access token through /auth/refresh and keeps the new pair', async () => {
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.advance(900_000);
      h.answer({ status: 200, body: authSession({ access: 'access-2', refresh: 'refresh-2' }) });

      const session = await h.port.current();

      expect(h.sent(1).url).toBe(`${BASE}/api/v1/auth/refresh`);
      expect(h.sent(1).body).toEqual({ refresh_token: 'refresh-1' });
      expect(session?.expiresAt).toBe(new Date(NOW.getTime() + 1_800_000).toISOString());
      const stored = (await h.store.read()) ?? '';
      expect(stored).toContain('refresh-2');
      expect(stored).not.toContain('refresh-1');
    });

    it('refreshes a token about to expire rather than sending one the server may refuse', async () => {
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.advance(900_000 - 10_000);
      h.answer({ status: 200, body: authSession({ access: 'access-2' }) });

      await h.port.current();

      expect(h.fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('drops the session when the refresh is refused', async () => {
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.advance(900_000);
      h.answer({ status: 401, body: {} });

      expect(await h.port.current()).toBeNull();
      expect(await h.store.read()).toBeNull();
    });

    it.each<[string, Answer]>([
      ['rate-limited', { status: 429, body: {} }],
      ['answered by a deploy without the endpoint', { status: 404, body: {} }],
      ['failed by the server', { status: 503, body: {} }],
    ])(
      'keeps the session when the refresh is %s, because none of those is a refusal',
      async (_, answer) => {
        // Only the server saying no to this refresh token ends the session. A throttled refresh used
        // to clear the store and sign the picker out (architecture review, 2026-11-21).
        const h = harness({ status: 200, body: authSession() });
        await h.port.signIn({ email: EMAIL, password: PASSWORD });
        h.advance(900_000);
        h.answer(answer);

        // The picker is still signed in, so the screen that asks who they are gets an answer.
        expect(await h.port.current()).toMatchObject({ accountId: EMAIL });
        expect(await h.store.read()).toContain('refresh-1');
      },
    );

    it('answers the held session, and keeps it, when the refresh cannot reach the server', async () => {
      // Offline is not "nobody is signed in": a cold start with no signal must open the app the
      // picker was already signed in to, not onboarding.
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.advance(900_000);
      h.answer('offline');

      expect(await h.port.current()).toMatchObject({ accountId: EMAIL });
      expect(await h.store.read()).toContain('refresh-1');
    });

    it.each([
      ['text that is not JSON', 'not json'],
      ['a value of another version', JSON.stringify({ v: 2 })],
      ['a value with no tokens', JSON.stringify({ v: 1, accessToken: '', refreshToken: 'r' })],
    ])('drops %s', async (_, stored) => {
      const h = harness();
      await h.store.write(stored);

      expect(await h.port.current()).toBeNull();
      expect(await h.store.read()).toBeNull();
    });

    it('drops a stored value it cannot read', async () => {
      const h = harness();
      await h.store.write('{"not":"a session"}');

      expect(await h.port.current()).toBeNull();
      expect(await h.store.read()).toBeNull();
    });
  });

  describe('tokens', () => {
    it('hands the transport the held access token, or nothing', async () => {
      const h = harness({ status: 200, body: authSession() });
      expect(await h.port.tokens.accessToken()).toBeNull();

      await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(await h.port.tokens.accessToken()).toBe('access-1');
    });

    it('sends one refresh for concurrent callers, because a reused refresh token revokes the session', async () => {
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.answer({ status: 200, body: authSession({ access: 'access-2', refresh: 'refresh-2' }) });

      const tokens = await Promise.all([h.port.tokens.refresh(), h.port.tokens.refresh()]);

      expect(tokens).toEqual(['access-2', 'access-2']);
      expect(h.fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('hands over the stale token while offline, so the transport reports the network', async () => {
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.advance(900_000);
      h.answer('offline');

      expect(await h.port.tokens.accessToken()).toBe('access-1');
    });

    it('answers no token from a refresh that cannot reach the server', async () => {
      const h = harness({ status: 200, body: authSession() }, 'offline');
      await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(await h.port.tokens.refresh()).toBeNull();
      expect(await h.store.read()).toContain('refresh-1');
    });

    it('answers no token from a refresh when there is no session to refresh', async () => {
      const h = harness();

      expect(await h.port.tokens.refresh()).toBeNull();
      expect(h.fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('revokes the refresh token at /auth/logout and drops the session', async () => {
      const h = harness({ status: 200, body: authSession() }, { status: 204 });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });

      await h.port.signOut();

      const { url, init, body } = h.sent(1);
      expect(url).toBe(`${BASE}/api/v1/auth/logout`);
      expect(init.headers).toHaveProperty('Authorization', 'Bearer access-1');
      expect(body).toEqual({ refresh_token: 'refresh-1' });
      expect(await h.store.read()).toBeNull();
    });

    it('drops the session on the device even when the server cannot be reached', async () => {
      const h = harness({ status: 200, body: authSession() }, 'offline');
      await h.port.signIn({ email: EMAIL, password: PASSWORD });

      await h.port.signOut();

      expect(await h.store.read()).toBeNull();
    });
  });

  describe('requestPasswordReset', () => {
    it('refuses a reset that names no account', async () => {
      await expect(harness().port.requestPasswordReset('  ')).rejects.toThrow(RangeError);
    });

    it('hands the address to a reset provider when one is given', async () => {
      const passwordReset = jest.fn(async () => ({ ok: true }) as const);
      const port = createApiSessionPort({
        client: createApiClient({ baseUrl: BASE, fetchImpl: jest.fn() }),
        store: createInMemorySessionStore(),
        passwordReset,
      });

      expect(await port.requestPasswordReset(` ${EMAIL} `)).toEqual({ ok: true });
      expect(passwordReset).toHaveBeenCalledWith(EMAIL);
    });

    it('is unavailable, because the API has no reset endpoint yet (ADR-065 decision 4)', async () => {
      expect(await harness().port.requestPasswordReset(EMAIL)).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });
  });

  describe('completePasswordReset', () => {
    it('hands the token and password to the completion provider when one is given', async () => {
      const passwordResetComplete = jest.fn(async () => ({ ok: true }) as const);
      const port = createApiSessionPort({
        client: createApiClient({ baseUrl: BASE, fetchImpl: jest.fn() }),
        store: createInMemorySessionStore(),
        passwordResetComplete,
      });

      expect(await port.completePasswordReset(' a-token ', 'berries1234')).toEqual({ ok: true });
      expect(passwordResetComplete).toHaveBeenCalledWith(' a-token ', 'berries1234');
    });

    it('is unavailable when the API adapter has no completion endpoint', async () => {
      expect(await harness().port.completePasswordReset('a-token', 'berries1234')).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });
  });
});
