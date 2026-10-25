import type { Locale } from './index';

/**
 * A day as the design's rows and charts write it: “28 Aug” in English, “28.8.” in Finnish.
 *
 * It lives in the localization service rather than in a feature because two features print one:
 * `discover` on frame 11's visit history, and `offline` on frame 13's queued report. The design
 * writes its dates exactly this way — a day and a month, no year — and Finnish writes the same
 * day numerically, so the *form* is the language's while the instant stays the data's.
 *
 * A second form lives here for the marketplace: the same day with its year (“28 August 2026”),
 * because a listing says which day its berries were picked and a year matters there.
 *
 * The instant is read in **UTC**: it is the moment a report was recorded (the queue stores what
 * the device wrote), and a calendar day in the device's own zone is a refinement that arrives
 * with real visit windows (PROJECT.md). Reading it in the device's zone would make the same
 * stored report print a different day on two phones looking at one account.
 */
const ENGLISH_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ENGLISH_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** An instant the app stored, or a `RangeError` — an unreadable date is never a blank label. */
function readInstant(iso: string) {
  const instant = new Date(iso);

  if (Number.isNaN(instant.getTime())) {
    throw new RangeError(`a date is an instant the app stored, got “${iso}”`);
  }

  return instant;
}

/** An instant the app stored, as “28 Aug” / “28.8.” */
export function formatShortDate(iso: string, locale: Locale): string {
  const instant = readInstant(iso);
  const day = instant.getUTCDate();
  const month = instant.getUTCMonth();

  return locale === 'fi' ? `${day}.${month + 1}.` : `${day} ${ENGLISH_MONTHS[month]}`;
}

/**
 * The same instant with its year, as the marketplace prints it: “28 August 2026” in English and
 * “28.8.2026” in Finnish.
 *
 * English writes the month's full name here — the design's own listing line, frame 16's
 * “Harvested 28 August 2026” — while Finnish writes the full date numerically, which is how Finnish
 * writes a date with a year at all. Read in UTC, for the same reason the short form is: the instant
 * is the data, and one stored date prints one day on every phone.
 */
export function formatLongDate(iso: string, locale: Locale): string {
  const instant = readInstant(iso);
  const day = instant.getUTCDate();
  const month = instant.getUTCMonth();

  return locale === 'fi'
    ? `${day}.${month + 1}.${instant.getUTCFullYear()}`
    : `${day} ${ENGLISH_MONTH_NAMES[month]} ${instant.getUTCFullYear()}`;
}
