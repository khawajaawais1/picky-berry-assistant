import { formatShortDate, type Locale, type TranslationKey } from '@/services/i18n';
import type { VisitReport } from '@/services/report-queue';

/**
 * Frame 07's “See all 11” (node `5:23076`) names the zone's reports for the week.
 *
 * **The design's eleven are its own sample week.** There is no report stream — nothing returns
 * another picker's report, and the score above the list is derived server-side from evidence the
 * app never sees (PROJECT.md's known issues, and the screen's own eyebrow says the season is the
 * design's). What the phone *does* hold is the reports the picker saved on it
 * (`services/report-queue.ts`), and this module is the rule for reading them back under one
 * zone's name: which of them belong to the zone, in which order, and what the count line says.
 *
 * It deliberately reads the queue's own zone identity rather than each report's own copy of it:
 * the queue stores what the design calls a zone (“Z14”), the frame prints a number (“Zone 14”),
 * and one function is what keeps the two spellings from drifting apart on a saved report.
 */

/** One report of the zone, as the list prints it: the language's day, the picker's own text. */
export type ZoneReportRow = {
  speciesId: string;
  /** The day the report was saved, written the way the language writes dates. */
  date: string;
  minutes: number;
  /** What the picker typed, exactly as they typed it, or `''` when they left it empty. */
  amountText: string;
  /** The rating they gave, on the design's 1–5 scale — a report's own answer, not a score. */
  yieldRating: VisitReport['yieldRating'];
  /** The instant it was saved at, which is what the list is ordered by. */
  recordedAt: string;
};

/**
 * The zone a stored report names, as the frame prints it: the queue's “Z14” is the frame's “14”.
 *
 * A report whose identifier does not carry the app's `Z` prefix is returned as it is rather than
 * guessed at: the row it produces will match no zone (the list compares the two), which is the
 * honest outcome for a record the app cannot place.
 */
export function reportZoneNumber(report: VisitReport): string {
  return report.zoneId.replace(/^Z/, '');
}

/**
 * The reports this phone holds for one zone, newest first — the list frame 07's link opens.
 *
 * Another zone's report is not printed here under any circumstance: printing one zone's report
 * under another zone's name is worse than printing none, which is the rule `zoneDetailsFor`,
 * `listingById` and the visit history all follow for their own records.
 */
export function zoneReportRows(
  reports: readonly VisitReport[],
  zoneNumber: string,
  locale: Locale,
): ZoneReportRow[] {
  return [...reports]
    .filter((report) => reportZoneNumber(report) === zoneNumber)
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .map((report) => ({
      amountText: report.amountText,
      date: formatShortDate(report.recordedAt, locale),
      minutes: report.minutes,
      recordedAt: report.recordedAt,
      speciesId: report.speciesId,
      yieldRating: report.yieldRating,
    }));
}

/**
 * The count line's singular or plural entry. The sentence belongs to the language, which is why
 * the number is a value in it rather than glued to a word here (the same pair frame 11's history
 * count and frame 13's waiting heading use).
 */
export function zoneReportCountLabelKey(count: number): TranslationKey {
  return count === 1 ? 'discover.zoneReports.held.one' : 'discover.zoneReports.held.many';
}
