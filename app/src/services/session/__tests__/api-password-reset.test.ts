import { createApiClient, type ApiFetch } from '@/services/api/api-client';

import { createApiPasswordResetRequest } from '../api-password-reset';

/**
 * The reset request through the team API (`POST /auth/password-reset`, ADR-065 decision 4
 * amended). The service answers `202` whether or not the address has an account, and the app
 * keeps that silence: an accepted request says nothing about who is registered.
 */
const BASE = 'https://api.example.test';

function requestAnswering(answer: { status: number; body?: unknown } | 'offline') {
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    if (answer === 'offline') throw new TypeError('Network request failed');
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body };
  });
  const request = createApiPasswordResetRequest({
    client: createApiClient({ baseUrl: BASE, fetchImpl }),
  });
  return { fetchImpl, request };
}

describe('createApiPasswordResetRequest', () => {
  it('posts the trimmed address, sending no credential', async () => {
    const { fetchImpl, request } = requestAnswering({ status: 202 });

    await request('  aino@example.fi ');

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/v1/auth/password-reset`);
    expect(init.method).toBe('POST');
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(init.body!)).toEqual({ email: 'aino@example.fi' });
  });

  it('answers accepted for a 202 with an empty body, as the service sends it', async () => {
    // Nest answers `@HttpCode(202)` on a void handler with no body, so `json()` throws, as it
    // does in a browser. The request must not read that as an unreadable answer.
    const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => ({
      ok: true,
      status: 202,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    }));
    const request = createApiPasswordResetRequest({
      client: createApiClient({ baseUrl: BASE, fetchImpl }),
    });

    expect(await request('aino@example.fi')).toEqual({ ok: true });
  });

  it('answers accepted for the service’s 202', async () => {
    expect(await requestAnswering({ status: 202 }).request('aino@example.fi')).toEqual({
      ok: true,
    });
  });

  it.each([422, 429])('answers refused for a %i', async (status) => {
    const { request } = requestAnswering({ status, body: { error: { code: 'X', message: 'x' } } });

    expect(await request('aino@example.fi')).toEqual({ ok: false, reason: 'refused' });
  });

  it.each<[string, { status: number } | 'offline']>([
    ['the network', 'offline'],
    ['a server error', { status: 503 }],
    ['a service without the endpoint yet', { status: 404 }],
  ])('answers unavailable when %s fails it', async (_, answer) => {
    expect(await requestAnswering(answer).request('aino@example.fi')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('refuses to send a request about nobody', async () => {
    const { fetchImpl, request } = requestAnswering({ status: 202 });

    await expect(request('  ')).rejects.toThrow(RangeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
