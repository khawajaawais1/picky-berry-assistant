import { useLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import { en, type TranslationKey } from './locales/en';
import { fi } from './locales/fi';

/**
 * Localization.
 *
 * Finnish and English are shipped; Swedish is planned — adding it means one catalogue
 * file and one entry in `SUPPORTED_LOCALES`, and the typecheck plus the catalogue
 * tests then demand the complete translation.
 *
 * The device's preference comes through `useLocales()`, which also re-renders when the
 * setting changes (the mechanism Android needs, since it does not restart the app); the
 * app declares its supported locales in `app.json` so the system offers them (ADR-017).
 *
 * Since ADR-067 a signed-in account's own language (`lang` on `GET /me`) takes its place:
 * the Language screen sets it on the account, and `setAppLocale` makes the app follow it.
 * That choice is held in memory only — the account is where it is kept — so a signed-out
 * app, and a cold start before the profile has been read, follow the device.
 *
 * Copy is looked up by key, never by string, so `t` is total: a missing key is a
 * compile error, not a blank label.
 */
export const SUPPORTED_LOCALES = ['en', 'fi'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** The source language, and the fallback for a device that speaks neither. */
export const DEFAULT_LOCALE: Locale = 'en';

const CATALOGUES: Record<Locale, Record<TranslationKey, string>> = { en, fi };

/** The whole catalogue of one locale; exposed for the completeness tests. */
export function getCatalogue(locale: Locale): Record<TranslationKey, string> {
  return CATALOGUES[locale];
}

export function translate(locale: Locale, key: TranslationKey): string {
  return CATALOGUES[locale][key];
}

/**
 * Picks the app's language from the device's preference list — the first tag the app
 * speaks, so a Sweden-Finnish device (sv-SE, fi-FI, en-US) gets Finnish rather than
 * the fallback. Tags are matched by their language subtag, case-insensitively, as
 * BCP 47 requires.
 */
export function resolveLocale(tags: readonly (string | null | undefined)[]): Locale {
  for (const tag of tags) {
    const language = tag?.split('-')[0]?.toLowerCase();

    if (language) {
      const supported = SUPPORTED_LOCALES.find((locale) => locale === language);

      if (supported) {
        return supported;
      }
    }
  }

  return DEFAULT_LOCALE;
}

export { interpolate } from './interpolate';
export { formatLongDate, formatShortDate } from './format-date';

export type Translation = {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

let appLocale: Locale | null = null;
const appLocaleListeners = new Set<() => void>();

/**
 * Makes the app speak the signed-in account's language, or (`null`) the device's again. Every
 * screen re-renders in it at once.
 */
export function setAppLocale(locale: Locale | null): void {
  if (locale === appLocale) return;
  appLocale = locale;
  for (const listener of appLocaleListeners) listener();
}

function subscribeAppLocale(listener: () => void) {
  appLocaleListeners.add(listener);
  return () => {
    appLocaleListeners.delete(listener);
  };
}

const readAppLocale = () => appLocale;

/**
 * The hook screens use: the account's language when one is set, otherwise the device's, and a
 * re-render when either changes.
 */
export function useTranslation(): Translation {
  const locales = useLocales();
  const chosen = useSyncExternalStore(subscribeAppLocale, readAppLocale);
  const locale =
    chosen ?? resolveLocale(locales.map((entry) => entry.languageTag ?? entry.languageCode));

  return { locale, t: (key) => translate(locale, key) };
}

export type { TranslationKey };
