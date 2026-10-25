import { Platform } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import type { Locale } from '@/services/i18n';

import { useDocumentLanguage } from '../use-document-language';

/**
 * The web document's own language. A Finnish screen inside an `<html lang="en">` is announced as
 * English by a screen reader, whatever the copy says (WCAG 3.1.1; frontend review 2026-10-25).
 */
function Probe({ locale }: { locale: Locale }) {
  useDocumentLanguage(locale);

  return null;
}

function withDocument(lang = 'en'): { lang: string } {
  const documentElement = { lang };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement },
  });

  return documentElement;
}

describe('useDocumentLanguage', () => {
  afterEach(() => {
    delete (globalThis as Partial<{ document: unknown }>).document;
  });

  it('labels the web document with the language the app is showing', async () => {
    const documentElement = withDocument();
    jest.replaceProperty(Platform, 'OS', 'web');

    await render(<Probe locale="fi" />);

    await waitFor(() => expect(documentElement.lang).toBe('fi'));
  });

  it('updates the label when the app changes language', async () => {
    const documentElement = withDocument();
    jest.replaceProperty(Platform, 'OS', 'web');

    const { rerender } = await render(<Probe locale="en" />);
    await waitFor(() => expect(documentElement.lang).toBe('en'));

    await rerender(<Probe locale="fi" />);
    await waitFor(() => expect(documentElement.lang).toBe('fi'));
  });

  it('leaves the document alone on a device, which has its own locale', async () => {
    const documentElement = withDocument();
    jest.replaceProperty(Platform, 'OS', 'ios');

    await render(<Probe locale="fi" />);

    expect(documentElement.lang).toBe('en');
  });
});
