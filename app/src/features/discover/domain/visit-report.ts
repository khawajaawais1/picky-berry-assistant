import type { VisitReport, YieldRating } from '@/services/report-queue';

import { DEMO_ACTIVE_VISIT } from './active-visit';
import { SPECIES, type Species } from './species';

/**
 * What frame 10 (Core picker · Post-visit feedback, node `5:23259`) reports back to the picker
 * before offering to save it: the visit's own window, the species the report is about, how
 * plentiful the berries were, and what was brought home.
 *
 * The visit itself is the design's own sample — “Zone 14 · 28 Aug · 10:03–10:55 · 52 min”, and
 * its arrival is screen 09's (the visit the picker was in). Nothing here reads a clock or a
 * store: the screen passes in the moment the report was recorded, so the whole module is a
 * pure function of its inputs and the visit's identity stays one value in one place.
 */

/**
 * The species the frame's own two chips name, in its order (nodes 5:23281 and 5:23283).
 *
 * These are the two chips the screen draws first; the frame's third chip is “More”, whose
 * content is `REPORT_SPECIES_MORE` — cloudberry and crowberry.
 */
export const REPORT_SPECIES = ['lingonberry', 'bilberry'] as const;

/**
 * What the frame's third chip (“More”) holds: the rest of the app's species vocabulary
 * (`domain/species.ts`), in the vocabulary's own order.
 *
 * The design names three berries in its own chips (node 5:22959); the app's vocabulary adds the
 * pilot's fourth, crowberry, so “More” reveals two rather than one. It is still not an index
 * the app lacks: it is the vocabulary the app can already name, revealed. Nothing here is a
 * species the app has no word for, which is what lets the chip
 * claim a role instead of being drawn as a label nothing opens (AGENTS.md §11.2).
 */
export const REPORT_SPECIES_MORE: readonly Species[] = SPECIES.filter(
  (species) => !(REPORT_SPECIES as readonly Species[]).includes(species),
);

/**
 * The species a report can be about: any the app can name, not only the frame's two chips.
 *
 * A stored report carries one of these, and the vocabulary is the app's rather than one
 * screen's, so a report about a berry the frame's row does not draw is still a report the
 * history and the sync centre can print.
 */
export type ReportSpecies = Species;

/**
 * The rating the frame draws selected: the fourth of its five, “Good” (node `5:23299`). A
 * report can be saved without the picker touching the row, and the design's own answer to
 * “How plentiful were the berries?” is not an empty one.
 */
export const DEFAULT_YIELD_RATING: YieldRating = 4;

/** The frame's own visit, as its summary line prints it (node `5:23277`). */
export const DEMO_VISIT_WINDOW = {
  arrival: '10:03',
  departure: '10:55',
} as const;

const CLOCK_READING = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(reading: string): number {
  const match = CLOCK_READING.exec(reading);

  if (!match) {
    throw new RangeError(`a visit window is written as HH:MM, got “${reading}”`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * How long a visit lasted, from the two clock readings the summary prints.
 *
 * A visit may span the end of a local day (PROJECT.md, decision 16), so a departure earlier on
 * the clock than the arrival is read as the next morning rather than as a mistake: 23:30 to
 * 00:15 is forty-five minutes in the zone, not a negative duration.
 */
export function visitMinutes(arrival: string, departure: string): number {
  const from = toMinutes(arrival);
  const to = toMinutes(departure);

  return to >= from ? to - from : to + 24 * 60 - from;
}

/** What the picker has answered on screen 10, before it is a report. */
export type ReportDraft = {
  speciesId: ReportSpecies;
  yieldRating: YieldRating;
  /** What they typed as their harvest; may be blank. */
  amountText: string;
};

/**
 * The report as it is queued: the picker's own answers, the visit they belong to, and the
 * moment it was recorded. The amount is trimmed, because a field left with spaces is empty.
 */
export function buildVisitReport(draft: ReportDraft, recordedAt: Date): VisitReport {
  return {
    amountText: draft.amountText.trim(),
    // The visit's own length, which the frame's summary prints (52 min): a real visit knows when
    // it began and ended, and the history rows screen 11 draws want that number beside them.
    minutes: visitMinutes(DEMO_VISIT_WINDOW.arrival, DEMO_VISIT_WINDOW.departure),
    recordedAt: recordedAt.toISOString(),
    speciesId: draft.speciesId,
    yieldRating: draft.yieldRating,
    zoneId: DEMO_ACTIVE_VISIT.zoneId,
  };
}
