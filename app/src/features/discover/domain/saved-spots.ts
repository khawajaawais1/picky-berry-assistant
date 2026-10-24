import type { SavedZone } from '@/services/saved-zones';

import { isSpecies, type Species } from './species';
import { PILOT_ZONE_SPECIES, type Zone } from './zone-source';

/**
 * What the list behind frame 14's “Saved spots” row may say about the picker's plan.
 *
 * The design never drew that screen (ADR-030), so the words on it are the app's, and this module
 * is what keeps them honest: the record holds zone identifiers and the berry each was saved under
 * (`src/services/saved-zones.ts`), and the answer is resolved against **the zone source's answer
 * for that berry** — not the design's demo zones, and not whichever chip the map happened to be
 * on (ADR-060, ADR-061). A saved zone therefore carries the same name, score and season the map
 * showed when it was saved, and the screen opens that zone's details on the same layer.
 *
 * A record written before the berry was kept has no layer. The plan shows it under the pilot
 * berry, which is the layer the plan always showed, rather than inventing a second reading of a
 * field the record never wrote. The same fallback applies to a stored value the app cannot name:
 * the storage layer cannot know the vocabulary, so this is the boundary that does.
 *
 * The record and the source do not have to agree: an identifier from a build whose zones
 * differed, or from an answer the source no longer carries, is still the picker's own saved zone.
 * So a plan is a list of two kinds of row: a zone the answer for its berry can describe, and an
 * identifier it can only name. Neither is dropped, and the plan's order (the order the picker
 * saved them in, which the record keeps) is the order shown.
 */

/** One row of the plan, as it can be drawn. */
export type SavedSpot =
  | { kind: 'zone'; zone: Zone; species: Species }
  /** A saved identifier no answer carries; the row can name it and nothing more. */
  | { kind: 'unknown'; zoneId: string };

/**
 * The berry a saved zone is read under.
 *
 * `null` is not a missing value to paper over: it is a record written before the widening, and
 * the plan's answer is the pilot layer it always used (ADR-061 decision 3).
 */
export function savedSpeciesOf(saved: SavedZone): Species {
  const stored = saved.speciesId;

  return stored !== null && isSpecies(stored) ? stored : PILOT_ZONE_SPECIES;
}

/**
 * The berries a plan needs an answer for, once each, in the record's own order.
 *
 * The screen reads the source **per berry** rather than once for the map's chip: a payload may
 * score only the species it was asked about, so a plan mixing lingonberry and bilberry cannot be
 * resolved from a bilberry answer alone.
 */
export function savedPlanSpecies(saved: readonly SavedZone[]): Species[] {
  return [...new Set(saved.map(savedSpeciesOf))];
}

/**
 * The plan, in the order the record holds it.
 *
 * Deliberately without deduplication: `saveZone` refuses to write a zone twice, so a repeated
 * identifier came from outside the app, and the list shows what the record says — the settings
 * row counts the same record, and the two must not disagree about how many spots are saved.
 */
export function savedSpots(
  saved: readonly SavedZone[],
  zonesBySpecies: ReadonlyMap<Species, readonly Zone[]>,
): SavedSpot[] {
  return saved.map((record) => {
    const species = savedSpeciesOf(record);
    const zone = zonesBySpecies.get(species)?.find((candidate) => candidate.id === record.zoneId);

    return zone ? { kind: 'zone', zone, species } : { kind: 'unknown', zoneId: record.zoneId };
  });
}
