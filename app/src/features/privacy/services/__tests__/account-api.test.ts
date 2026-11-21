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
        alertRadiusKm: 10,
        speciesInterest: ['bilberry'],
        privacyLevel: 'private',
      });
      expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/api/v1/me`);
    });

    it.each<[string, Record<string, unknown>]>([
      ['a verification that is not a yes or no', { email_verified: 'yes' }],
      ['a radius outside 1–100 km', { alert_radius_km: 0 }],
      ['a radius that is not whole', { alert_radius_km: 2.5 }],
      ['a privacy level the contract does not name', { privacy_level: 'friends' }],
      ['a species list that is not a list', { species_interest: 'bilberry' }],
      ['a species code that is not text', { species_interest: [7] }],
    ])('rejects a profile with %s', async (_, change) => {
      const { account } = api({ status: 200, body: { ...PROFILE, ...change } });

      await expect(account.profile()).rejects.toMatchObject({
        failure: { kind: 'invalid-response' },
      });
    });

    it('keeps the species codes as the service sent them; naming them is the reader’s job', async () => {
      // The alerts screen decides which codes it can name (discover's `isSpecies`): this module
      // stays below the features that read it.
      const { account } = api({
        status: 200,
        body: { ...PROFILE, species_interest: ['cloudberry', 'rowan'] },
      });

      expect((await account.profile()).speciesInterest).toEqual(['cloudberry', 'rowan']);
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

    it.each([429, 404, 503])(
      'answers unavailable for a %i, which says nothing about the password',
      async (status) => {
        // A throttled delete used to read as “That password didn’t match.”
        const { account } = api({ status, body: { error: { code: 'X', message: 'x' } } });

        expect(await account.deleteAccount('correct horse battery')).toEqual({
          ok: false,
          reason: 'unavailable',
        });
      },
    );

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

  describe('updateProfile', () => {
    it('sends only the changed fields to PATCH /me, in the contract’s words', async () => {
      const { fetchImpl, account } = api({
        status: 200,
        body: { ...PROFILE, alert_radius_km: 25 },
      });

      const result = await account.updateProfile({
        alertRadiusKm: 25,
        speciesInterest: ['bilberry', 'lingonberry'],
      });

      const [url, init] = fetchImpl.mock.calls[0]!;
      expect(url).toBe(`${BASE}/api/v1/me`);
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body!)).toEqual({
        alert_radius_km: 25,
        species_interest: ['bilberry', 'lingonberry'],
      });
      expect(result).toEqual({
        ok: true,
        profile: expect.objectContaining({ alertRadiusKm: 25 }),
      });
    });

    it('sends a nickname trimmed, and the language as the service names it', async () => {
      const { fetchImpl, account } = api({ status: 200, body: { ...PROFILE, nickname: 'Aino K' } });

      await account.updateProfile({ nickname: '  Aino K ', lang: 'en' });

      expect(JSON.parse(fetchImpl.mock.calls[0]![1].body!)).toEqual({
        nickname: 'Aino K',
        lang: 'en',
      });
    });

    it.each<[string, Parameters<ReturnType<typeof createAccountApi>['updateProfile']>[0]]>([
      ['nothing', {}],
      ['an empty nickname', { nickname: '   ' }],
      ['a nickname over 30 characters', { nickname: 'x'.repeat(31) }],
      ['a radius outside 1–100 km', { alertRadiusKm: 101 }],
      ['a radius that is not whole', { alertRadiusKm: 1.5 }],
    ])('refuses to send %s', async (_, patch) => {
      const { fetchImpl, account } = api({ status: 200, body: PROFILE });

      await expect(account.updateProfile(patch)).rejects.toThrow(RangeError);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('answers refused for a 422 and unavailable when the service cannot answer', async () => {
      expect(
        await api({
          status: 422,
          body: { error: { code: 'X', message: 'x' } },
        }).account.updateProfile({ alertRadiusKm: 5 }),
      ).toEqual({ ok: false, reason: 'refused' });
      expect(await api('offline').account.updateProfile({ alertRadiusKm: 5 })).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });
  });

  describe('updatePrivacy', () => {
    it('sends the spot visibility to PATCH /me/privacy and answers the level the service kept', async () => {
      const { fetchImpl, account } = api({
        status: 200,
        body: { privacy_level: 'shared', background_location: false },
      });

      expect(await account.updatePrivacy('shared')).toEqual({ ok: true, privacyLevel: 'shared' });

      const [url, init] = fetchImpl.mock.calls[0]!;
      expect(url).toBe(`${BASE}/api/v1/me/privacy`);
      expect(init.method).toBe('PATCH');
      // Background location stays off (ADR-056): the app never sends it.
      expect(JSON.parse(init.body!)).toEqual({ privacy_level: 'shared' });
    });

    it('answers unavailable for a reply it cannot read', async () => {
      const { account } = api({ status: 200, body: { privacy_level: 'everyone' } });

      expect(await account.updatePrivacy('public')).toEqual({ ok: false, reason: 'unavailable' });
    });
  });

  describe('registerDevice', () => {
    it('posts the push token and platform to /me/devices and answers registered on a 204', async () => {
      const { fetchImpl, account } = api({ status: 204 });

      expect(
        await account.registerDevice({
          token: 'fcm-token',
          platform: 'android',
          appVersion: '0.1.0',
        }),
      ).toEqual({ ok: true });

      const [url, init] = fetchImpl.mock.calls[0]!;
      expect(url).toBe(`${BASE}/api/v1/me/devices`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body!)).toEqual({
        fcm_token: 'fcm-token',
        platform: 'android',
        app_version: '0.1.0',
      });
    });

    it('refuses to send an empty token', async () => {
      const { fetchImpl, account } = api({ status: 204 });

      await expect(account.registerDevice({ token: '', platform: 'ios' })).rejects.toThrow(
        RangeError,
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it.each<[{ status: number } | 'offline', string]>([
      [{ status: 422 }, 'refused'],
      [{ status: 503 }, 'unavailable'],
      ['offline', 'unavailable'],
    ])('answers %p as %s', async (answer, reason) => {
      const { account } = api(answer);

      expect(await account.registerDevice({ token: 't', platform: 'ios' })).toEqual({
        ok: false,
        reason,
      });
    });
  });
});
