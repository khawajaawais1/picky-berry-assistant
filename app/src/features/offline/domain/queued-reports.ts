import { formatShortDate, type Locale, type TranslationKey } from '@/services/i18n';
import type { VisitReport, YieldRating } from '@/services/report-queue';

/**
 * What frame 13 (Account and offline · Downloads, node `5:23530`) knows about this phone: the
 * reports the picker has made that have not reached the server yet.
 *
 * The frame draws a whole sync centre — a downloaded region, cached map tiles and forecast, a
 * storage meter, a retry action. None of that exists in this app (there is no tile cache, no
 * forecast source and no transport, ADR-005), so the screen built from this frame draws the one
 * part that is real: the queue behind screen 10's “Save report offline”. This module is that
 * part's vocabulary — the reports as the frame's card prints them, and the count its heading
 * states.
 */

/** One queued report as the frame's card prints it. */
export type QueuedReportRow = {
  /** The zone's number, as the frame writes it (“Zone 14”). */
  zoneNumber: string;
  /** The species the report names, as the queue's own identifier. */
  speciesId: string;
  /** The day, formatted for the language. */
  date: string;
  minutes: number;
  yieldRating: YieldRating;
  /** What the picker typed, or `''` when they recorded none. */
  amountText: string;
};

/**
 * The reports this device is holding, **oldest first** — the order they will be carried in once
 * something can carry them, which is what a queue's own screen should show.
 */
export function queuedReportRows(
  reports: readonly VisitReport[],
  locale: Locale,
): QueuedReportRow[] {
  return [...reports]
    .sort((left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt))
    .map((report) => ({
      amountText: report.amountText,
      date: formatShortDate(report.recordedAt, locale),
      minutes: report.minutes,
      speciesId: report.speciesId,
      yieldRating: report.yieldRating,
      zoneNumber: report.zoneId.replace(/^Z/, ''),
    }));
}

/**
 * The frame's heading (“Waiting to sync · 1 report”) as the key for a count.
 *
 * The count is a value and the sentence is the language's, so the singular and the plural are
 * two keys rather than one string with an “s” appended: Finnish does not inflect the same way,
 * and a heading is prose (AGENTS.md §7).
 */
export function waitingLabelKey(count: number): TranslationKey {
  return count === 1 ? 'offline.waiting.one' : 'offline.waiting.many';
}
