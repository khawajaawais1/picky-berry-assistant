import { useLocales } from 'expo-localization';

import { en, type TranslationKey } from './locales/en';
import { fi } from './locales/fi';

/**
 * Localization.
 *
 * Finnish and English are shipped; Swedish is planned — adding it means one catalogue
 * file and one entry in `SUPPORTED_LOCALES`, and the typecheck plus the catalogue
 * tests then demand the complete translation.
 *
 * There is deliberately no in-app language picker: both iOS and Android let the user
 * choose a language per app, and that choice reaches us through `useLocales()`, which
 * also re-renders when the setting changes (the mechanism Android needs, since it
 * does not restart the app). The app declares its supported locales in `app.json` so
 * the system offers them (see ADR-017).
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

/** The hook screens use. Reads the device's languages and re-renders when they change. */
export function useTranslation(): Translation {
  const locales = useLocales();
  const locale = resolveLocale(locales.map((entry) => entry.languageTag ?? entry.languageCode));

  return { locale, t: (key) => translate(locale, key) };
}

export type { TranslationKey };
