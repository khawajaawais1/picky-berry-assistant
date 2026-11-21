import { createApiClient, type ApiFetch, type TokenProvider } from '../api-client';

/**
 * The transport to the team API (ADR-065 decision 5), held at the boundary where it meets
 * `fetch`. No test reaches the network: the `fetch` it is given is a recorder.
 */
const BASE = 'https://api.example.test';

type Answer = { status: number; body?: unknown; unreadable?: boolean };

function reply({ status, body, unreadable = false }: Answer) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (unreadable) throw new SyntaxError('Unexpected token');
      return body;
    },
  };
}

function fetchAnswering(...answers: Answer[]) {
  const queue = [...answers];

  return jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    const next = queue.shift();
    if (!next) throw new Error('the test gave no answer for this request');
    return reply(next);
  });
}

function tokens(access: string | null, refreshed: string | null = null) {
  return {
    accessToken: jest.fn<Promise<string | null>, []>(async () => access),
    refresh: jest.fn<Promise<string | null>, []>(async () => refreshed),
  } satisfies TokenProvider;
}

const anything = (body: unknown) => body;

describe('createApiClient', () => {
  describe('the request it sends', () => {
    it('joins the base URL, the /api/v1 prefix and the path, ignoring a trailing slash', async () => {
      const fetchImpl = fetchAnswering({ status: 200, body: {} });
      const client = createApiClient({ baseUrl: `${BASE}/`, fetchImpl });

      await client.request({ method: 'GET', path: '/species', auth: false, parse: anything });

      expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/api/v1/species`);
    });

    it('encodes query parameters and leaves out the ones with no value', async () => {
      const fetchImpl = fetchAnswering({ status: 200, body: {} });
      const client = createApiClient({ baseUrl: BASE, fetchImpl });

      await client.request({
        method: 'GET',
        path: '/zones',
        query: { bbox: '25.1,62.1,25.5,62.3', species: 'bilberry', zoom: 12, since: undefined },
        auth: false,
        parse: anything,
      });

      expect(fetchImpl.mock.calls[0]![0]).toBe(
        `${BASE}/api/v1/zones?bbox=25.1%2C62.1%2C25.5%2C62.3&species=bilberry&zoom=12`,
      );
    });

    it('sends a JSON body with its content type and asks for JSON back', async () => {
      const fetchImpl = fetchAnswering({ status: 200, body: {} });
      const client = createApiClient({ baseUrl: BASE, fetchImpl });

      await client.request({
        method: 'POST',
        path: '/auth/refresh',
        body: { refresh_token: 'r1' },
        auth: false,
        parse: anything,
      });

      expect(fetchImpl.mock.calls[0]![1]).toEqual({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'r1' }),
      });
    });

    it('refuses a path that is not absolute, so a caller cannot reach another host', async () => {
      const client = createApiClient({ baseUrl: BASE, fetchImpl: fetchAnswering() });

      await expect(
        client.request({ method: 'GET', path: 'species', auth: false, parse: anything }),
      ).rejects.toThrow(RangeError);
      await expect(
        client.request({ method: 'GET', path: '//evil.test/x', auth: false, parse: anything }),
      ).rejects.toThrow(RangeError);
    });
  });

  describe('authentication', () => {
    it('attaches the access token as a bearer credential', async () => {
      const fetchImpl = fetchAnswering({ status: 200, body: {} });
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: tokens('a1') });

      await client.request({ method: 'GET', path: '/me', parse: anything });

      expect(fetchImpl.mock.calls[0]![1].headers).toEqual({
        Accept: 'application/json',
        Authorization: 'Bearer a1',
      });
    });

    it('sends no credential on a request marked unauthenticated', async () => {
      const fetchImpl = fetchAnswering({ status: 200, body: {} });
      const provider = tokens('a1');
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: provider });

      await client.request({ method: 'GET', path: '/species', auth: false, parse: anything });

      expect(fetchImpl.mock.calls[0]![1].headers).not.toHaveProperty('Authorization');
      expect(provider.accessToken).not.toHaveBeenCalled();
    });

    it('sends an explicit bearer as given, without asking the provider or refreshing', async () => {
      // The session port's own logout: it holds the token it is revoking and must not loop
      // back through itself.
      const fetchImpl = fetchAnswering({ status: 401, body: {} });
      const provider = tokens('a1', 'fresh');
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: provider });

      const result = await client.request({
        method: 'POST',
        path: '/auth/logout',
        body: { refresh_token: 'r1' },
        bearer: 'held',
        parse: anything,
      });

      expect(fetchImpl.mock.calls[0]![1].headers).toHaveProperty('Authorization', 'Bearer held');
      expect(provider.accessToken).not.toHaveBeenCalled();
      expect(provider.refresh).not.toHaveBeenCalled();
      expect(result).toEqual({
        ok: false,
        error: { kind: 'http', status: 401, code: null, requestId: null },
      });
    });

    it('treats a client built with no token provider as holding no session', async () => {
      const fetchImpl = fetchAnswering();
      const client = createApiClient({ baseUrl: BASE, fetchImpl });

      const result = await client.request({ method: 'GET', path: '/me', parse: anything });

      expect(result).toEqual({ ok: false, error: { kind: 'unauthenticated' } });
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('does not send an authenticated request when there is no session', async () => {
      const fetchImpl = fetchAnswering();
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: tokens(null) });

      const result = await client.request({ method: 'GET', path: '/me', parse: anything });

      expect(result).toEqual({ ok: false, error: { kind: 'unauthenticated' } });
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('refreshes once on a 401 and retries with the new token', async () => {
      const fetchImpl = fetchAnswering(
        { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'x' }, request_id: 'q1' } },
        { status: 200, body: { id: 'u1' } },
      );
      const provider = tokens('stale', 'fresh');
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: provider });

      const result = await client.request({ method: 'GET', path: '/me', parse: anything });

      expect(result).toEqual({ ok: true, status: 200, data: { id: 'u1' } });
      expect(provider.refresh).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[1]![1].headers).toHaveProperty('Authorization', 'Bearer fresh');
    });

    it('ends as unauthenticated when the refresh is refused', async () => {
      const fetchImpl = fetchAnswering({ status: 401, body: {} });
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: tokens('stale', null) });

      const result = await client.request({ method: 'GET', path: '/me', parse: anything });

      expect(result).toEqual({ ok: false, error: { kind: 'unauthenticated' } });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('does not refresh a second time when the retried request is also refused', async () => {
      const fetchImpl = fetchAnswering({ status: 401, body: {} }, { status: 401, body: {} });
      const provider = tokens('stale', 'fresh');
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: provider });

      const result = await client.request({ method: 'GET', path: '/me', parse: anything });

      expect(result).toEqual({ ok: false, error: { kind: 'unauthenticated' } });
      expect(provider.refresh).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('does not refresh on a 401 from an unauthenticated request such as a login', async () => {
      const fetchImpl = fetchAnswering({
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'x' }, request_id: 'q2' },
      });
      const provider = tokens('a1', 'fresh');
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: provider });

      const result = await client.request({
        method: 'POST',
        path: '/auth/login',
        body: {},
        auth: false,
        parse: anything,
      });

      expect(result).toEqual({
        ok: false,
        error: { kind: 'http', status: 401, code: 'INVALID_CREDENTIALS', requestId: 'q2' },
      });
      expect(provider.refresh).not.toHaveBeenCalled();
    });
  });

  describe('the answer it returns', () => {
    it('hands the parsed body back on success', async () => {
      const client = createApiClient({
        baseUrl: BASE,
        fetchImpl: fetchAnswering({ status: 200, body: { items: [1] } }),
      });

      const result = await client.request({
        method: 'GET',
        path: '/species',
        auth: false,
        parse: (body) => (body as { items: number[] }).items,
      });

      expect(result).toEqual({ ok: true, status: 200, data: [1] });
    });

    it('reports a body the parser cannot read as an invalid response, not as data', async () => {
      const client = createApiClient({
        baseUrl: BASE,
        fetchImpl: fetchAnswering({ status: 200, body: { unexpected: true } }),
      });

      const result = await client.request({
        method: 'GET',
        path: '/species',
        auth: false,
        parse: () => null,
      });

      expect(result).toEqual({ ok: false, error: { kind: 'invalid-response', status: 200 } });
    });

    it('reports a success whose body is not JSON as an invalid response', async () => {
      const client = createApiClient({
        baseUrl: BASE,
        fetchImpl: fetchAnswering({ status: 200, unreadable: true }),
      });

      const result = await client.request({
        method: 'GET',
        path: '/species',
        auth: false,
        parse: anything,
      });

      expect(result).toEqual({ ok: false, error: { kind: 'invalid-response', status: 200 } });
    });

    it('reads no body for a request that expects none, whatever the success status', async () => {
      const fetchImpl = fetchAnswering({ status: 202, unreadable: true });
      const client = createApiClient({ baseUrl: BASE, fetchImpl });
      const parse = jest.fn(() => true);

      const result = await client.request({
        method: 'POST',
        path: '/auth/password-reset',
        body: {},
        auth: false,
        expectsBody: false,
        parse,
      });

      expect(result).toEqual({ ok: true, status: 202, data: true });
      expect(parse).toHaveBeenCalledWith(null);
    });

    it('parses an empty 204 without reading a body', async () => {
      const fetchImpl = fetchAnswering({ status: 204, unreadable: true });
      const client = createApiClient({ baseUrl: BASE, fetchImpl, tokens: tokens('a1') });
      const parse = jest.fn(() => true);

      const result = await client.request({ method: 'DELETE', path: '/me', parse });

      expect(result).toEqual({ ok: true, status: 204, data: true });
      expect(parse).toHaveBeenCalledWith(null);
    });

    it('reads the error envelope’s code and request id from a refusal', async () => {
      const client = createApiClient({
        baseUrl: BASE,
        fetchImpl: fetchAnswering({
          status: 422,
          body: { error: { code: 'VALIDATION_FAILED', message: 'bbox' }, request_id: 'q3' },
        }),
      });

      const result = await client.request({
        method: 'GET',
        path: '/species',
        auth: false,
        parse: anything,
      });

      expect(result).toEqual({
        ok: false,
        error: { kind: 'http', status: 422, code: 'VALIDATION_FAILED', requestId: 'q3' },
      });
    });

    it('reports a refusal with no readable envelope with a null code', async () => {
      const client = createApiClient({
        baseUrl: BASE,
        fetchImpl: fetchAnswering({ status: 502, unreadable: true }),
      });

      const result = await client.request({
        method: 'GET',
        path: '/species',
        auth: false,
        parse: anything,
      });

      expect(result).toEqual({
        ok: false,
        error: { kind: 'http', status: 502, code: null, requestId: null },
      });
    });

    it('reports a fetch that rejects as a network failure rather than throwing', async () => {
      const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
        throw new TypeError('Network request failed');
      });
      const client = createApiClient({ baseUrl: BASE, fetchImpl });

      const result = await client.request({
        method: 'GET',
        path: '/species',
        auth: false,
        parse: anything,
      });

      expect(result).toEqual({ ok: false, error: { kind: 'network' } });
    });
  });
});
