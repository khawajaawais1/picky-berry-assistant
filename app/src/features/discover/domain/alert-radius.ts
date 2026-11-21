import type { Locale } from '@/services/i18n';

import { formatDecimal } from './season-insights';

/**
 * The radii the Alert preferences screen offers, in whole kilometres (ADR-067): the frame's own
 * 3 km among them, inside the 1–100 km `PATCH /me` accepts.
 */
export const ALERT_RADII_KM = [1, 3, 5, 10, 25, 50, 100] as const;

/**
 * A radius setting as the frame prints it: a whole number of kilometres with the language's own
 * decimal mark (“3 km”), never a trailing zero.
 *
 * The app's distances print one decimal — frame 08's route is “1.4 km” because it is a measured
 * walk — while a radius is a number the picker set, and the frame draws this one as “3 km” on the
 * same screen its headline prints “1.8 km”. A radius that is not a whole kilometre still writes
 * the language's number (“2,5 km” in Finnish), and a negative one is a mistake the caller has to
 * see rather than a radius drawn backwards.
 */
export function formatRadius(kilometres: number, locale: Locale): string {
  if (!Number.isFinite(kilometres) || kilometres < 0) {
    throw new RangeError(`a radius is a non-negative number of kilometres, got ${kilometres}`);
  }

  return `${formatDecimal(kilometres, locale)} km`;
}
