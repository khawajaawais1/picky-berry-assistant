import type { Locale } from '@/services/i18n';

/**
 * What a price is made of, on every marketplace screen.
 *
 * Money is held as a whole number of **cents** (`MarketListing.pricePerKgCents`, and the totals
 * `order.ts` adds up) and only becomes a string here, once, so a price printed on two screens
 * cannot be printed two ways. The design writes prices without a symbol in its figures and with
 * one in its labels (“€8 / kg”, “€8/kg”, “Total held €40”); the symbol and its placement are the
 * *language's* — Finnish writes “8,50 €” — which is why the catalogue holds the unit and this
 * function holds only the number.
 */
export function formatEuros(cents: number, locale: Locale): string {
  if (!Number.isInteger(cents) || cents < 0) {
    // A float or a negative reaching here is a bug upstream, and printing a plausible-looking
    // price for it would hide the bug behind a number nobody can check.
    throw new RangeError(`a price is a whole number of cents, got “${cents}”`);
  }

  const euros = Math.floor(cents / 100);
  const remainder = cents % 100;

  if (remainder === 0) return String(euros);

  const fraction = String(remainder).padStart(2, '0');

  // The decimal mark is the one thing about a price that differs between the two shipped
  // languages, exactly as it is for a distance (`formatDistance`).
  return `${euros}${locale === 'fi' ? ',' : '.'}${fraction}`;
}
