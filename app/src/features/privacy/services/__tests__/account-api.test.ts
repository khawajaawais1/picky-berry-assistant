import { createApiClient, type ApiFetch } from '@/services/api';

import { createAccountApi } from '../account-api';

/**
 * The account endpoints of the team API (ADR-065, the plan's phase 5): `GET /me`,
 * `POST /me/export` and `DELETE /me`, through the authenticated transport. No test reaches
 * the network.
 */
const BASE = 'https://api.example.test';

const PROFILE = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  email: 'aino@example.fi',
  email_verified: false,
  nickname: 'Aino',
  role: 'picker',
  privacy_level: 'private',
  background_location: false,
  alert_radius_km: 10,
  species_interest: ['bilberry'],
  lang: 'fi',
  created_at: '2026-11-21T12:00:00.000Z',
};

function api(answer: { status: number; body?: unknown } | 'offline') {
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    if (answer === 'offline') throw new TypeError('Network request failed');
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body };
  });
  const client = createApiClient({
    baseUrl: BASE,
    fetchImpl,
    tokens: { accessToken: async () => 'a1', refresh: async () => null },
  });

  return { fetchImpl, account: createAccountApi({ client }) };
}

describe('createAccountApi', () => {
  describe('profile', () => {
    it('reads the account’s own profile', async () => {
      const { fetchImpl, account } = api({ status: 200, body: PROFILE });

      expect(await account.profile()).toEqual({
        email: 'aino@example.fi',
        emailVerified: false,
        nickname: 'Aino',
        lang: 'fi',
      });
      expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/api/v1/me`);
    });

    it('rejects a profile it cannot read', async () => {
      const { account } = api({ status: 200, body: { ...PROFILE, email_verified: 'yes' } });

      await expect(account.profile()).rejects.toMatchObject({
        failure: { kind: 'invalid-response' },
      });
    });
  });

  describe('exportData', () => {
    it('posts for the export and answers it as a readable JSON document', async () => {
      const body = { profile: PROFILE, consents: [], devices: [], visits: [], reports: [] };
      const { fetchImpl, account } = api({ status: 200, body });

      const document = await account.exportData();

      expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/api/v1/me/export`);
      expect(fetchImpl.mock.calls[0]![1].method).toBe('POST');
      expect(JSON.parse(document)).toEqual(body);
      expect(document).toContain('\n  "profile"');
    });

    it('rejects an export that is not the account’s data', async () => {
      const { account } = api({ status: 200, body: { profile: PROFILE } });

      await expect(account.exportData()).rejects.toMatchObject({
        failure: { kind: 'invalid-response' },
      });
    });
  });

  describe('deleteAccount', () => {
    it('sends the password to DELETE /me and answers deleted on a 204', async () => {
      const { fetchImpl, account } = api({ status: 204 });

      expect(await account.deleteAccount('correct horse battery')).toEqual({ ok: true });

      const [url, init] = fetchImpl.mock.calls[0]!;
      expect(url).toBe(`${BASE}/api/v1/me`);
      expect(init.method).toBe('DELETE');
      expect(JSON.parse(init.body!)).toEqual({ password: 'correct horse battery' });
    });

    it.each([401, 422])('answers refused for a %i, the wrong password', async (status) => {
      // A wrong password makes the server refuse, and the transport cannot renew a refusal.
      const { account } = api({ status, body: { error: { code: 'X', message: 'x' } } });

      expect(await account.deleteAccount('wrong password')).toEqual({
        ok: false,
        reason: 'refused',
      });
    });

    it('answers unavailable when the server cannot be reached', async () => {
      const { account } = api('offline');

      expect(await account.deleteAccount('correct horse battery')).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });

    it('refuses to send an empty password', async () => {
      const { fetchImpl, account } = api({ status: 204 });

      await expect(account.deleteAccount('')).rejects.toThrow(RangeError);
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });
});
