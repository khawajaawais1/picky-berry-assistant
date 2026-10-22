import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveLocale } from '../index';

/**
 * The app is Finnish and English; Swedish is planned. Resolution is pure, so the
 * device's preference list can be exercised without a device.
 */
describe('supported locales', () => {
  it('is Finnish and English, with English as the source language', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['en', 'fi']);
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('resolveLocale', () => {
  it('resolves the device’s region-tagged locales to their language', () => {
    expect(resolveLocale(['fi-FI'])).toBe('fi');
    expect(resolveLocale(['en-US'])).toBe('en');
  });

  it('matches language tags case-insensitively, as BCP 47 requires', () => {
    expect(resolveLocale(['FI-fi'])).toBe('fi');
  });

  it('takes the first tag the app supports', () => {
    // Sweden-Finnish users: Swedish is not supported yet, Finnish is, so the
    // Finnish preference in the list wins over falling back to English.
    expect(resolveLocale(['sv-SE', 'fi-FI'])).toBe('fi');
    expect(resolveLocale(['en-GB', 'fi-FI'])).toBe('en');
  });

  it('falls back to the source language for anything it does not speak', () => {
    expect(resolveLocale(['de-DE'])).toBe('en');
    expect(resolveLocale(['sv-SE'])).toBe('en');
  });

  it('falls back when the device reports nothing usable', () => {
    expect(resolveLocale([])).toBe('en');
    expect(resolveLocale([null, undefined])).toBe('en');
    expect(resolveLocale([''])).toBe('en');
    expect(resolveLocale(['und'])).toBe('en');
  });
});
