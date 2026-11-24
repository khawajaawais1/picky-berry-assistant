import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

import { resolveColorScheme, themes, type ColorSchemeName } from '@/constants/theme';
import { AppThemeContext } from '@/hooks/use-app-theme';
import {
  loadThemePreference,
  resolvedScheme,
  subscribeThemePreference,
} from '@/services/theme-preference';

export type AppThemeProviderProps = {
  children: React.ReactNode;
};

/** The system's answer and the picker's override, watched for the whole tree. */
const subscribe = (onChange: () => void) => {
  const appearance = Appearance.addChangeListener(() => onChange());
  const preference = subscribeThemePreference(() => onChange());

  return () => {
    appearance.remove();
    preference();
  };
};

const getSnapshot = (): ColorSchemeName => resolvedScheme(Appearance.getColorScheme());

/**
 * What the server rendered — and what the first hydrated render must agree with.
 *
 * The static export is built in Node, where there is no media query, so it paints light. The
 * browser's first client render therefore starts from the same answer and only then switches to
 * the system's; rendering the dark theme on the first pass disagreed with the HTML, the mismatch
 * left parts of the tree as the server painted them, and the core navigation — which never
 * re-renders — stayed light under dark screens (frontend review, 2026-10-25).
 */
const getServerSnapshot = (): ColorSchemeName => 'light';

/**
 * Resolves the colour scheme once for the whole tree.
 *
 * `useSyncExternalStore` is the primitive that makes the server/client distinction explicit: the
 * server snapshot is light (the static export's paint), the client snapshot is the real system
 * answer, and React re-renders every consumer when the two differ. There is no state update in an
 * effect and no second render path to drift.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const scheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = useMemo(() => themes[scheme], [scheme]);

  // Hydrate the picker's stored choice once on mount; notify() re-renders the tree.
  useEffect(() => {
    void loadThemePreference();
  }, []);

  return <AppThemeContext.Provider value={theme}>{children}</AppThemeContext.Provider>;
}
