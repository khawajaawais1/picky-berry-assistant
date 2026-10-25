import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Locale } from '@/services/i18n';

/**
 * Sets the language a document declares, when there is a document to declare it on.
 *
 * Exported so the rule can be held without a DOM: the hook below is the platform branch.
 */
export function setDocumentLanguage(
  locale: Locale,
  documentElement: { lang: string } | null,
): void {
  if (documentElement) {
    documentElement.lang = locale;
  }
}

/**
 * Keeps the web document's `lang` in step with the language the app is showing.
 *
 * The static export can only declare the source language (`+html.tsx`), and nothing updated it
 * afterwards, so a Finnish interface was exposed to assistive technology — and to the browser's own
 * translation and hyphenation — as English (WCAG 3.1.1; frontend review, 2026-10-25). A device has
 * its own locale and does not need a document label, so the hook does nothing there.
 */
export function useDocumentLanguage(locale: Locale): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    setDocumentLanguage(locale, document.documentElement);
  }, [locale]);
}
