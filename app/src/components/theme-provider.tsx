import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { resolveColorScheme, themes, type ColorSchemeName } from '@/constants/theme';
import { AppThemeContext } from '@/hooks/use-app-theme';

export type AppThemeProviderProps = {
  children: ReactNode;
};

/**
 * Resolves the colour scheme once for the whole tree — and does it **after** the first paint on
 * the web, where the static export has already painted light.
 *
 * Why the first render is light there: `react-native-web` starts `useColorScheme` from the
 * browser's media query, while the pre-rendered HTML was made without one. Rendering the dark
 * theme on the client's first pass therefore disagreed with the server's HTML; the hydration
 * mismatch left parts of the tree as the server painted them, and the core navigation — which
 * never re-renders — stayed light under dark screens (frontend review, 2026-10-25).
 *
 * Starting from the paint the HTML made keeps hydration honest; the effect below then applies the
 * real answer, so every consumer updates together. A device has no earlier paint to match, so it
 * starts from its own system scheme.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const web = Platform.OS === 'web';
  const system = useColorScheme();
  const [scheme, setScheme] = useState<ColorSchemeName>(() =>
    web ? 'light' : resolveColorScheme(system),
  );

  useEffect(() => {
    // On the web the hook's own first value is the browser's (see above), so the mounted answer is
    // read from Appearance once the tree exists; on a device the hook is already the answer.
    setScheme(resolveColorScheme(web ? Appearance.getColorScheme() : system));
  }, [system, web]);

  const theme = useMemo(() => themes[scheme], [scheme]);

  return <AppThemeContext.Provider value={theme}>{children}</AppThemeContext.Provider>;
}
