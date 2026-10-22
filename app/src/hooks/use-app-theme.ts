import { useColorScheme } from 'react-native';

import { resolveColorScheme, themes, type ColorSchemeName, type Theme } from '@/constants/theme';

/** Reads the system colour scheme and returns the matching theme tokens. */
export function useAppTheme(): Theme {
  return themes[useColorSchemeName()];
}

/** Exposed so components can branch on the scheme without duplicating fallback logic. */
export function useColorSchemeName(): ColorSchemeName {
  return resolveColorScheme(useColorScheme());
}
