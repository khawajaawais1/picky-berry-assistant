import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import { resolveColorScheme, type ColorSchemeName } from '@/constants/theme';

/**
 * The picker's own choice of colour scheme (ADR-017's "follow the device" is the default).
 *
 * - `system` — follow the OS (the original behaviour).
 * - `light` / `dark` — the picker's override, applied on top of the system.
 *
 * Stored on this device only; never sent anywhere. The OS setting remains the source of truth
 * until the picker chooses otherwise, and withdrawing the choice (back to `system`) is as easy
 * as making it.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCE_STORAGE_KEY = 'picky.color-scheme.v1';

const VALID: readonly ThemePreference[] = ['system', 'light', 'dark'];

let preference: ThemePreference = 'system';
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The preference currently in effect (synchronous, for the provider's snapshot). */
export function currentThemePreference(): ThemePreference {
  return preference;
}

/** Subscribe to preference changes. Returns the unsubscribe function. */
export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reads the stored preference back, if it is one the app understands. */
export async function loadThemePreference(): Promise<ThemePreference> {
  const raw = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  const value = (VALID as readonly string[]).includes(raw ?? '')
    ? (raw as ThemePreference)
    : 'system';
  if (value !== preference) {
    preference = value;
    notify();
  }
  return value;
}

/** Records the picker's choice and applies it. */
export async function setThemePreference(next: ThemePreference): Promise<void> {
  preference = next;
  await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, next);
  notify();
}

/** The scheme the app should paint, from the preference and the system's answer. */
export function resolvedScheme(system: string | null | undefined): ColorSchemeName {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return resolveColorScheme(system);
}

// Re-export so callers can branch on the system answer without importing Appearance.
export { Appearance };
