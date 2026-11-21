import type { AccountApi, AccountProfile } from './account-api';

/**
 * Test fixtures for the account API: a profile as `parseProfile` answers one, and an account API
 * whose every call is a recording mock. Nothing here reaches the network, and nothing in the app
 * imports it.
 */
export function accountProfile(overrides: Partial<AccountProfile> = {}): AccountProfile {
  return {
    email: 'aino@example.fi',
    emailVerified: true,
    nickname: 'Aino Korhonen',
    lang: 'en',
    alertRadiusKm: 3,
    speciesInterest: ['bilberry', 'lingonberry'],
    privacyLevel: 'private',
    ...overrides,
  };
}

export function fakeAccountApi(start: AccountProfile = accountProfile()) {
  let held = start;

  const api = {
    profile: jest.fn(async () => held),
    exportData: jest.fn(async () => '{}'),
    deleteAccount: jest.fn(async () => ({ ok: true }) as const),
    updateProfile: jest.fn<
      ReturnType<AccountApi['updateProfile']>,
      Parameters<AccountApi['updateProfile']>
    >(async (patch) => {
      held = {
        ...held,
        ...(patch.nickname === undefined ? {} : { nickname: patch.nickname.trim() }),
        ...(patch.alertRadiusKm === undefined ? {} : { alertRadiusKm: patch.alertRadiusKm }),
        ...(patch.speciesInterest === undefined
          ? {}
          : { speciesInterest: [...patch.speciesInterest] }),
        ...(patch.lang === undefined ? {} : { lang: patch.lang }),
      };
      return { ok: true, profile: held };
    }),
    updatePrivacy: jest.fn<
      ReturnType<AccountApi['updatePrivacy']>,
      Parameters<AccountApi['updatePrivacy']>
    >(async (level) => {
      held = { ...held, privacyLevel: level };
      return { ok: true, privacyLevel: level };
    }),
    registerDevice: jest.fn<
      ReturnType<AccountApi['registerDevice']>,
      Parameters<AccountApi['registerDevice']>
    >(async () => ({ ok: true })),
  } satisfies AccountApi;

  return api;
}
