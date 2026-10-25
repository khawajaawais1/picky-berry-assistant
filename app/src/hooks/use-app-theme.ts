import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { resolveColorScheme, themes, type ColorSchemeName, type Theme } from '@/constants/theme';

/**
 * The theme the app's shell resolved once (`src/components/theme-provider.tsx`).
 *
 * It is a context rather than every consumer reading the system for itself because the web build
 * is pre-rendered light and hydrated in the user's scheme: a consumer that never re-renders would
 * keep the server's colours, which is how the core navigation stayed light in dark mode (frontend
 * review, 2026-10-25). One value, applied to the whole tree, cannot split that way.
 */
export const AppThemeContext = createContext<Theme | null>(null);

/**
 * The active theme. Inside the app the provider supplies it; outside one (a component test, a
 * isolated render) the system answer is the fallback, which keeps every screen renderable alone.
 */
export function useAppTheme(): Theme {
  const provided = useContext(AppThemeContext);

  return provided ?? themes[resolveColorScheme(useColorScheme())];
}

/** Exposed so components can branch on the scheme without duplicating fallback logic. */
export function useColorSchemeName(): ColorSchemeName {
  const provided = useContext(AppThemeContext);

  return provided?.scheme ?? resolveColorScheme(useColorScheme());
}
