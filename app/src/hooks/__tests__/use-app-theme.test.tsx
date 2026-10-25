import { renderHook } from '@testing-library/react-native';

import { themes } from '@/constants/theme';

import { useAppTheme, useColorSchemeName } from '../use-app-theme';

/**
 * Outside the provider — a component test, an isolated render — the system answer is the fallback.
 * These tests close the uncovered half of the hook; the provider's own tests cover the supplied
 * theme.
 */
describe('useAppTheme without a provider', () => {
  it('falls back to the system theme', async () => {
    const { result } = await renderHook(() => useAppTheme());

    expect([themes.light, themes.dark]).toContain(result.current);
  });

  it('reports the system scheme name', async () => {
    const { result } = await renderHook(() => useColorSchemeName());

    expect(['light', 'dark']).toContain(result.current);
  });
});
