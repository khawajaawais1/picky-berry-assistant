import type { ApiFetch } from '@/services/api/api-client';
import type { ConfigResult } from '@/config/env';

import { createAppSessionPort } from '../app-port';
import type { SecureStorage } from '../secure-store';

/**
 * How the app composes its one session port (ADR-065): the API adapter over the configured base
 * URL, with the session in secure storage on a device and in memory on the web export, which
 * has no keychain. A build whose configuration is unusable gets a port that answers nothing
 * rather than one that sends credentials somewhere unvalidated.
 */
const GOOD: ConfigResult = {
  ok: true,
  config: {
    environment: 'development',
    apiBaseUrl: 'https://api.example.test',
  },
};
const BAD: ConfigResult = {
  ok: false,
  problems: [{ variable: 'EXPO_PUBLIC_API_BASE_URL', reason: 'not https' }],
};

const AUTH_SESSION = {
  access_token: 'a1',
  refresh_token: 'r1',
  token_type: 'Bearer',
  expires_in: 900,
  user: { id: 'u1', email: 'aino@example.fi', nickname: null, role: 'picker' },
};

function recorder() {
  return jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => ({
    ok: true,
    status: 200,
    json: async () => AUTH_SESSION,
  }));
}

function secureStorage() {
  const held = new Map<string, string>();
  const storage: SecureStorage = {
    getItemAsync: jest.fn(async (key: string) => held.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      held.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      held.delete(key);
    }),
  };
  return storage;
}

const CREDENTIAL = { email: 'aino@example.fi', password: 'berries1234' };

describe('createAppSessionPort', () => {
  it('signs in against the configured API', async () => {
    const fetchImpl = recorder();
    const port = createAppSessionPort({
      config: GOOD,
      platform: 'ios',
      fetchImpl,
      secureStorage: secureStorage(),
    });

    const result = await port.signIn(CREDENTIAL);

    expect(result.ok).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.example.test/api/v1/auth/login');
  });

  it('keeps the session in secure storage on a device', async () => {
    const storage = secureStorage();
    const port = createAppSessionPort({
      config: GOOD,
      platform: 'android',
      fetchImpl: recorder(),
      secureStorage: storage,
    });

    await port.signIn(CREDENTIAL);

    expect(storage.setItemAsync).toHaveBeenCalled();
  });

  it('keeps the session in memory on the web, which has no keychain', async () => {
    const storage = secureStorage();
    const port = createAppSessionPort({
      config: GOOD,
      platform: 'web',
      fetchImpl: recorder(),
      secureStorage: storage,
    });

    await port.signIn(CREDENTIAL);

    expect(storage.setItemAsync).not.toHaveBeenCalled();
    expect((await port.current())?.accountId).toBe('aino@example.fi');
  });

  it('asks the account service for a reset link (ADR-065 decision 4, amended)', async () => {
    const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => ({
      ok: true,
      status: 202,
      json: async () => null,
    }));
    const port = createAppSessionPort({
      config: GOOD,
      platform: 'ios',
      fetchImpl,
      secureStorage: secureStorage(),
    });

    expect(await port.requestPasswordReset('aino@example.fi')).toEqual({ ok: true });
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.example.test/api/v1/auth/password-reset');
  });

  it('spends the emailed reset token at the completion endpoint', async () => {
    const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => ({
      ok: true,
      status: 204,
      json: async () => null,
    }));
    const port = createAppSessionPort({
      config: GOOD,
      platform: 'ios',
      fetchImpl,
      secureStorage: secureStorage(),
    });

    expect(await port.completePasswordReset('a-token', 'berries1234')).toEqual({ ok: true });
    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'https://api.example.test/api/v1/auth/password-reset/confirm',
    );
  });

  it('answers unavailable, and sends nothing, when the configuration is unusable', async () => {
    const fetchImpl = recorder();
    const port = createAppSessionPort({
      config: BAD,
      platform: 'ios',
      fetchImpl,
      secureStorage: secureStorage(),
    });

    expect(await port.signIn(CREDENTIAL)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await port.register({ ...CREDENTIAL, lang: 'en', consents: {} })).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(await port.current()).toBeNull();
    expect(await port.tokens.accessToken()).toBeNull();
    expect(await port.tokens.refresh()).toBeNull();
    expect(await port.requestPasswordReset('aino@example.fi')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(await port.completePasswordReset('a-token', 'berries1234')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    await expect(port.signOut()).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
