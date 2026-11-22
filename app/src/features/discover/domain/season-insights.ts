import { formatShortDate, type Locale, type TranslationKey } from '@/services/i18n';
import type { VisitReport } from '@/services/report-queue';

/**
 * What frame 11 (Core picker · Visits and analytics, node `5:23343`) knows about one picker's
 * season. The totals and the chart are the API's (`GET /me/season`); the history is the picker's
 * reports — the ones still queued on this phone, then the ones the API holds (`GET /me/reports`).
 * The two period chips filter that list: this month, or everything.
 */

/** The tallest bar in the chart, in pixels: the frame's own 70 (node 5:23388 onwards). */
export const HARVEST_BAR_MAX_HEIGHT = 70;

export type VisitSyncStatus = 'queued' | 'synced';

/** One row of the picker's visit history: a report still on this phone, or one the API holds. */
export type VisitHistoryEntry = {
  zoneName: string;
  speciesId: string;
  date: string;
  minutes: number;
  amountText: string;
  status: VisitSyncStatus;
  recordedAt: string;
};

/**
 * The two periods the frame's chips offer (ADR-043): the month its own sample belongs to, or
 * everything the phone is holding. What the app can be true about is which rows are in the chosen
 * period and how many are outside it — it aggregates nothing, so the chips filter the history and
 * say what they are showing rather than standing for an analytics window nothing keeps.
 */
export const VISIT_HISTORY_PERIODS = ['month', 'all'] as const;

export type VisitHistoryPeriod = (typeof VISIT_HISTORY_PERIODS)[number];

/** The word each period is called by, which is the frame's own two chip labels. */
export function historyPeriodLabelKey(period: VisitHistoryPeriod): TranslationKey {
  return period === 'month' ? 'discover.season.period.month' : 'discover.season.period.all';
}

/**
 * A visit's month, as “2026-08”, read in **UTC** for the same reason every date this app prints
 * is: the instant is what the device stored, and one stored visit belongs to one month on every
 * phone looking at it. An unreadable instant is a mistake the caller has to see rather than a row
 * filed under some month.
 */
export function historyMonthOf(recordedAt: string): string {
  const instant = new Date(recordedAt);

  if (Number.isNaN(instant.getTime())) {
    throw new RangeError(`a visit is recorded at an instant the app stored, got “${recordedAt}”`);
  }

  return `${instant.getUTCFullYear()}-${String(instant.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The rows the chosen period shows, in the order they were given (the history is already newest
 * first): the design's own month, or every row the screen holds. */
export function historyFor(
  rows: readonly VisitHistoryEntry[],
  period: VisitHistoryPeriod,
  now: Date = new Date(),
): VisitHistoryEntry[] {
  return period === 'all'
    ? [...rows]
    : rows.filter((row) => historyMonthOf(row.recordedAt) === historyMonthOf(now.toISOString()));
}

/**
 * How many rows the chosen period leaves out. The screen prints it, so a visit that is not on the
 * list is never hidden without a trace — with “All visits” one tap away, and nothing outside it.
 */
export function outsidePeriodCount(
  rows: readonly VisitHistoryEntry[],
  period: VisitHistoryPeriod,
  now: Date = new Date(),
): number {
  return rows.length - historyFor(rows, period, now).length;
}

/**
 * The count line's singular or plural entry. The sentence belongs to the language, which is why
 * the number is a value in it rather than glued to a word here (the same pair frame 13's waiting
 * heading uses).
 */
export function historyCountLabelKey(count: number): TranslationKey {
  return count === 1 ? 'discover.season.history.shown.one' : 'discover.season.history.shown.many';
}

/**
 * The same choice for the line about what is outside the period. It has no zero form: nothing is
 * outside every period, so the screen draws it only when the count is at least one.
 */
export function outsideCountLabelKey(count: number): TranslationKey {
  return count === 1
    ? 'discover.season.history.outside.one'
    : 'discover.season.history.outside.many';
}

/**
 * A number as the language writes it: “4.5” in English, “4,5” in Finnish. The design prints
 * both forms, and the decimal mark is the language's, not the data's.
 */
export function formatDecimal(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`a figure is a finite number, got ${value}`);
  }

  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);

  return locale === 'fi' ? rounded.replace('.', ',') : rounded;
}

/**
 * The picker's own visits, newest first, as the frame's history rows print them. They come from
 * the device's queue, so every one of them is still waiting to be carried to the server: the
 * design's “Queued” is the row's own truth about itself.
 */
export function visitHistoryRows(
  reports: readonly VisitReport[],
  locale: Locale,
): VisitHistoryEntry[] {
  return [...reports]
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .map((report) => ({
      amountText: report.amountText,
      date: formatShortDate(report.recordedAt, locale),
      minutes: report.minutes,
      recordedAt: report.recordedAt,
      zoneName: report.zoneName ?? '',
      speciesId: report.speciesId,
      status: 'queued',
    }));
}

/**
 * The row's own line: “28 Aug · 52 min · 1.3 kg”, as the frame prints it, with the harvest left
 * out when the picker recorded none. The weight is their own typed text, never reformatted.
 */
export function historyRowMeta(row: VisitHistoryEntry): string {
  return [row.date, `${row.minutes} min`, row.amountText].filter((part) => part !== '').join(' · ');
}

/**
 * The chart's bars, in the frame's own proportions: the tallest visit fills the chart, and every
 * other bar is its share of that visit. A visit with no recorded weight draws nothing — the
 * frame's own note says the rates use only visits with a recorded weight — and a negative weight
 * is a mistake the caller has to see rather than a bar drawn backwards.
 */
export function barHeights(kilograms: readonly number[]): number[] {
  for (const value of kilograms) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`a harvest is a non-negative number of kilograms, got ${value}`);
    }
  }

  const heaviest = Math.max(0, ...kilograms);

  if (heaviest === 0) {
    return kilograms.map(() => 0);
  }

  return kilograms.map((value) => Math.round((value / heaviest) * HARVEST_BAR_MAX_HEIGHT));
}

/** The reports the API holds, as history rows; the ones still queued here are left out. */
export function syncedHistoryRows(
  reports: readonly {
    clientId: string | null;
    zoneName: string | null;
    species: string;
    amountKg: number | null;
    minutes: number | null;
    recordedAt: string;
  }[],
  queuedIds: ReadonlySet<string>,
  locale: Locale,
): VisitHistoryEntry[] {
  return reports
    .filter((report) => report.clientId === null || !queuedIds.has(report.clientId))
    .map((report) => ({
      amountText: report.amountKg === null ? '' : `${formatDecimal(report.amountKg, locale)} kg`,
      date: formatShortDate(report.recordedAt, locale),
      minutes: report.minutes ?? 0,
      recordedAt: report.recordedAt,
      speciesId: report.species,
      status: 'synced',
      zoneName: report.zoneName ?? '',
    }));
}
