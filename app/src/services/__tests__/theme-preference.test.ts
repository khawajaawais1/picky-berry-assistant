import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  THEME_PREFERENCE_STORAGE_KEY,
  currentThemePreference,
  loadThemePreference,
  resolvedScheme,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from '../theme-preference';

beforeEach(async () => {
  await AsyncStorage.clear();
  // Reset to the default by reloading (module state persists across tests).
  await setThemePreference('system');
});

describe('theme preference', () => {
  it('defaults to following the system', () => {
    expect(currentThemePreference()).toBe('system');
  });

  it('stores under a versioned key', () => {
    expect(THEME_PREFERENCE_STORAGE_KEY).toBe('picky.color-scheme.v1');
  });

  it('records and reads back a choice', async () => {
    await setThemePreference('dark');
    expect(currentThemePreference()).toBe('dark');
    await expect(AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).resolves.toBe('dark');

    await loadThemePreference();
    expect(currentThemePreference()).toBe('dark');
  });

  it('ignores a stored value it cannot understand', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'purple');
    await loadThemePreference();
    expect(currentThemePreference()).toBe('system');
  });

  it('notifies subscribers on change', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeThemePreference(listener);

    await setThemePreference('light');
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    await setThemePreference('dark');
    expect(listener).not.toHaveBeenCalled();
  });

  it('resolves the scheme from the preference and the system answer', () => {
    // system preference follows the system answer
    expect(resolvedScheme('dark')).toBe('dark');
    expect(resolvedScheme('light')).toBe('light');
    expect(resolvedScheme(null)).toBe('light');

    // override wins regardless of the system
    // (checked after setting; setThemePreference updates module state)
  });

  it('applies an override over the system answer', async () => {
    await setThemePreference('dark');
    expect(resolvedScheme('light')).toBe('dark');

    await setThemePreference('light');
    expect(resolvedScheme('dark')).toBe('light');

    await setThemePreference('system');
    expect(resolvedScheme('dark')).toBe('dark');
  });
});
