import { act, renderHook } from '@testing-library/react-native';

import { setAppLocale, useTranslation } from '..';

/**
 * The app's language (ADR-067, amending ADR-017): the account's own language while one is signed
 * in, and the device's preference otherwise. The choice is held in memory only — the account is
 * where it is kept — so a signed-out app, and a cold start before the profile is read, follow the
 * device as they always did.
 */
afterEach(() => {
  setAppLocale(null);
});

describe('the app locale', () => {
  it('follows the device when no account language is set', async () => {
    const { result } = await renderHook(() => useTranslation());

    // The test device speaks English (jest.setup.ts).
    expect(result.current.locale).toBe('en');
  });

  it('follows the account language once one is set, and re-renders every screen', async () => {
    const { result } = await renderHook(() => useTranslation());

    await act(async () => setAppLocale('fi'));

    expect(result.current.locale).toBe('fi');
    expect(result.current.t('privacy.language.title')).toBe('Kieli');
  });

  it('goes back to the device language when the account language is dropped', async () => {
    setAppLocale('fi');
    const { result } = await renderHook(() => useTranslation());

    await act(async () => setAppLocale(null));

    expect(result.current.locale).toBe('en');
  });
});
