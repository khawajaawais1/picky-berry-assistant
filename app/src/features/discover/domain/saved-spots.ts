import { DEMO_ZONES, type DemoZone } from './zone';

/**
 * What the list behind frame 14's “Saved spots” row may say about the picker's plan.
 *
 * The design never drew that screen (ADR-030), so the words on it are the app's, and this module
 * is what keeps them honest: the record holds zone identifiers (`src/services/saved-zones.ts`),
 * the app's only zone source is the design's own demo composition, and the two do not have to
 * agree — an identifier from a build whose zones differed is still the picker's own saved zone.
 *
 * So a plan is a list of two kinds of row: a zone the app can describe, and an identifier it can
 * only name. Neither is dropped, and the plan's order (the order the picker saved them in, which
 * the record keeps) is the order shown.
 */

/** One row of the plan, as it can be drawn. */
export type SavedSpot =
  | { kind: 'zone'; zone: DemoZone }
  /** A saved identifier no zone answers to; the row can name it and nothing more. */
  | { kind: 'unknown'; zoneId: string };

/**
 * The plan, in the order the record holds it.
 *
 * Deliberately without deduplication: `saveZone` refuses to write a zone twice, so a repeated
 * identifier came from outside the app, and the list shows what the record says — the settings
 * row counts the same record, and the two must not disagree about how many spots are saved.
 */
export function savedSpots(zoneIds: readonly string[]): SavedSpot[] {
  return zoneIds.map((zoneId) => {
    const zone = DEMO_ZONES.find((candidate) => candidate.id === zoneId);

    return zone ? { kind: 'zone', zone } : { kind: 'unknown', zoneId };
  });
}
