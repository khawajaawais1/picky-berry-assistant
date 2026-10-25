import { formatShortDate, type Locale, type TranslationKey } from '@/services/i18n';
import type { VisitReport } from '@/services/report-queue';

/**
 * What frame 11 (Core picker · Visits and analytics, node `5:23343`) knows about one picker's
 * season: the month's totals, a small chart of what each visit brought home, and the visits
 * themselves.
 *
 * There is no analytics service, so the totals and the chart are the design's own demo — the same
 * story frames 07 to 10 tell, continued: the newest visit is the walk to Zone 14 on 28 Aug, 52
 * minutes in the zone, 1.3 kg brought home, queued for the server. That demo is disclosed on the
 * screen the way frame 06 discloses its own (`discover.season.eyebrow`).
 *
 * The history is different in kind: it is the picker's **own record**, so it is the device's
 * report queue read back (`src/services/report-queue.ts`) — the user-visible half of what
 * screen 10 saves — listed newest first above the design's sample visits, which are the same
 * story the rest of the demo tells.
 *
 * The frame's two period chips are a real choice (ADR-043): they filter that list, and this module
 * owns the rules — which month a visit belongs to, what the chosen period keeps, and how many rows
 * it leaves out — so the screen never has to decide for itself what “August 2026” means.
 */

/** The tallest bar in the chart, in pixels: the frame's own 70 (node 5:23388 onwards). */
export const HARVEST_BAR_MAX_HEIGHT = 70;

/** One visit as the design's chart draws it: what was brought home, and the day. */
export type HarvestByVisit = {
  /** The design's own short date (“20 Aug”); a value of its own once visits are real. */
  date: string;
  kilograms: number;
};

/** The frame's own three visits, in the order its chart draws them (oldest first). */
export const DEMO_HARVEST_BY_VISIT: readonly HarvestByVisit[] = [
  { date: '20 Aug', kilograms: 1.5 },
  { date: '24 Aug', kilograms: 1.7 },
  { date: '28 Aug', kilograms: 1.3 },
];

/** The month's totals, as the frame's two cards print them. */
export const DEMO_SEASON_TOTALS = {
  harvestedKg: 4.5,
  /** Kilograms per hour in the zone — the frame's “1.5 kg / hour”. */
  kgPerHour: 1.5,
  medianMinutes: 60,
  stayHours: 3,
  zonesVisited: 3,
} as const;

/** How a visit ended as far as the user is concerned: saved here, or already sent on. */
export type VisitSyncStatus = 'queued' | 'synced';

/** One row of the design's visit history. */
export type VisitHistoryEntry = {
  zoneNumber: string;
  speciesId: string;
  /** The design's own short date and weight, as its rows print them. */
  date: string;
  minutes: number;
  amountText: string;
  status: VisitSyncStatus;
  /**
   * The instant the visit was recorded at, which is what the period chips filter on. It is the
   * instant itself rather than its printed day, because a row the app saved on the last day of
   * one month and a row the design drew in another have to be compared the same way.
   */
  recordedAt: string;
};

/**
 * A sample visit as the frame gives it: an instant and a weight the language formats, so the
 * design's own “28 Aug · 52 min · 1.3 kg” is “28.8. · 52 min · 1,3 kg” in Finnish.
 */
export type DemoVisit = {
  zoneNumber: string;
  speciesId: string;
  /** The design's own day, as the instant it stands for. */
  recordedAt: string;
  minutes: number;
  kilograms: number;
  status: VisitSyncStatus;
};

/**
 * The frame's own three visits (nodes 5:23400, 5:23406 and 5:23412). Its newest row — Zone 14,
 * 28 Aug, 52 min, 1.3 kg, “Queued” — is the visit screens 08 to 10 have been telling; the two
 * behind it are the design's older samples.
 */
export const DEMO_VISIT_HISTORY: readonly DemoVisit[] = [
  {
    kilograms: 1.3,
    minutes: 52,
    recordedAt: '2026-08-28T10:55:00.000Z',
    speciesId: 'lingonberry',
    status: 'queued',
    zoneNumber: '14',
  },
  {
    kilograms: 1.7,
    minutes: 68,
    recordedAt: '2026-08-24T09:30:00.000Z',
    speciesId: 'bilberry',
    status: 'synced',
    zoneNumber: '17',
  },
  {
    kilograms: 1.5,
    minutes: 60,
    recordedAt: '2026-08-20T08:45:00.000Z',
    speciesId: 'bilberry',
    status: 'synced',
    zoneNumber: '09',
  },
];

/**
 * The month the frame's own three visits belong to, as its first chip names it (“August 2026”,
 * node 5:23349): the period the design's sample month is, and the one its chips draw selected.
 */
export const DEMO_HISTORY_MONTH = '2026-08';

/**
 * The two periods the frame's chips offer (ADR-043): the month its own sample belongs to, or
 * everything the phone is holding. What the app can be true about is which rows are in the chosen
 * period and how many are outside it — it aggregates nothing, so the chips filter the history and
 * say what they are showing rather than standing for an analytics window nothing keeps.
 */
export const VISIT_HISTORY_PERIODS = ['designMonth', 'all'] as const;

export type VisitHistoryPeriod = (typeof VISIT_HISTORY_PERIODS)[number];

/** The word each period is called by, which is the frame's own two chip labels. */
export function historyPeriodLabelKey(period: VisitHistoryPeriod): TranslationKey {
  return period === 'designMonth' ? 'discover.season.period.month' : 'discover.season.period.all';
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
): VisitHistoryEntry[] {
  return period === 'all'
    ? [...rows]
    : rows.filter((row) => historyMonthOf(row.recordedAt) === DEMO_HISTORY_MONTH);
}

/**
 * How many rows the chosen period leaves out. The screen prints it, so a visit that is not on the
 * list is never hidden without a trace — with “All visits” one tap away, and nothing outside it.
 */
export function outsidePeriodCount(
  rows: readonly VisitHistoryEntry[],
  period: VisitHistoryPeriod,
): number {
  return rows.length - historyFor(rows, period).length;
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

/** The design's sample visits as the screen's rows: the same shape as the picker's own. */
export function demoHistoryRows(locale: Locale): VisitHistoryEntry[] {
  return DEMO_VISIT_HISTORY.map((visit) => ({
    amountText: `${formatDecimal(visit.kilograms, locale)} kg`,
    date: formatShortDate(visit.recordedAt, locale),
    minutes: visit.minutes,
    recordedAt: visit.recordedAt,
    speciesId: visit.speciesId,
    status: visit.status,
    zoneNumber: visit.zoneNumber,
  }));
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
      // The queue's zone id is the design's own identity for a zone (“Z14”); the row prints the
      // number the design prints (“Zone 14”).
      zoneNumber: report.zoneId.replace(/^Z/, ''),
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
