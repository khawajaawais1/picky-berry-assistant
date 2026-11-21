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

    it.each([401, 422, 429])(
      'reads a %i as a refused credential and keeps nothing',
      async (status) => {
        const h = harness({
          status,
          body: { error: { code: 'X', message: 'x' }, request_id: 'q' },
        });

        const result = await h.port.signIn({ email: EMAIL, password: PASSWORD });

        expect(result).toEqual({ ok: false, reason: 'refused' });
        expect(await h.store.read()).toBeNull();
      },
    );

    it.each<[string, Answer]>([
      ['a network failure', 'offline'],
      ['a server error', { status: 503 }],
      ['a body that is not a session', { status: 200, body: { access_token: 'a' } }],
    ])('reads %s as unavailable and keeps nothing', async (_, answer) => {
      const h = harness(answer);

      const result = await h.port.signIn({ email: EMAIL, password: PASSWORD });

      expect(result).toEqual({ ok: false, reason: 'unavailable' });
      expect(await h.store.read()).toBeNull();
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

    it('rejects, and keeps the session, when the refresh cannot reach the server', async () => {
      // Offline is "the app could not find out", never "nobody is signed in" (use-session.ts).
      const h = harness({ status: 200, body: authSession() });
      await h.port.signIn({ email: EMAIL, password: PASSWORD });
      h.advance(900_000);
      h.answer('offline');

      await expect(h.port.current()).rejects.toThrow();
      expect(await h.store.read()).toContain('refresh-1');
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
    it('is unavailable, because the API has no reset endpoint yet (ADR-065 decision 4)', async () => {
      expect(await harness().port.requestPasswordReset(EMAIL)).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });
  });
});
