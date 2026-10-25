import { renderHook } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import { themes } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppThemeProvider } from '../theme-provider';

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');

  return {
    ...actual,
    useSyncExternalStore: ((_subscribe: unknown, _getSnapshot: unknown, server: () => unknown) =>
      server()) as typeof actual.useSyncExternalStore,
  };
});

/**
 * The static export is painted light in Node. The provider must use that answer on the server and
 * on the first hydrated pass, even when the device prefers dark; only the post-hydration render may
 * switch. This is the branch the browser hydration spec exercises but Jest never did.
 */
describe('AppThemeProvider on the server snapshot', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hands down the light paint even when the system prefers dark', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

    const { result } = await renderHook(() => useAppTheme(), {
      wrapper: AppThemeProvider,
    });

    expect(result.current).toBe(themes.light);
  });
});
