import type { VisitReport, YieldRating } from '@/services/report-queue';

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

/** What the picker has answered on screen 10, before it is a report. */
export type ReportDraft = {
  speciesId: ReportSpecies;
  yieldRating: YieldRating;
  /** What they typed as their harvest; may be blank. */
  amountText: string;
};

/** The finalized visit a report belongs to, as the tracker published it. */
export type ReportVisit = {
  zoneId: string;
  openedAt: number;
  endedAt: number | null;
};

/**
 * The report as it is queued: the picker's own answers, the visit they belong to, and the
 * moment it was recorded. The amount is trimmed, because a field left with spaces is empty.
 */
export function buildVisitReport(
  draft: ReportDraft,
  recordedAt: Date,
  visit: ReportVisit,
): VisitReport {
  const endedAt = visit.endedAt ?? visit.openedAt;

  return {
    amountText: draft.amountText.trim(),
    // The visit's own length, which the history rows screen 11 draws want beside them.
    minutes: Math.max(0, Math.floor((endedAt - visit.openedAt) / 60_000)),
    recordedAt: recordedAt.toISOString(),
    speciesId: draft.speciesId,
    yieldRating: draft.yieldRating,
    zoneId: visit.zoneId,
  };
}
