import type { Species } from './species';
import type { DemoZone } from './zone';

/**
 * The two controls the frame puts above its map (node 5:22959 and 5:22955), as a pure
 * function over the zones the screen has.
 *
 * The frame draws a search field — “Search a place or zone” — and three species chips, and
 * that is exactly what this filter knows how to do: a place or a zone, and a set of species.
 * It deliberately does not know about berries a zone was not reported for, distances, or
 * ripeness, because the design asks none of those of these two controls, and a filter that
 * takes a value it cannot honour is how a screen ends up promising a search it does not
 * perform.
 *
 * Keeping it here rather than in the screen is what makes the search testable without a
 * browser: the screen's only job is to hold what was typed and hand it over.
 */

export type ZoneFilter = {
  /**
   * What stands in the frame's search field, as typed: a zone (“Z14”, “14”, “9”) or part of
   * a place name (“laaja”). Casing and surrounding space are the filter's business, not the
   * field's — the field shows what the picker typed, the filter reads it.
   */
  query: string;
  /**
   * The species chips that are on. Empty means every species, which is the state the screen
   * opens in: the frame paints the first chip as chosen while drawing every zone on its map,
   * and a chip painted chosen while nothing is filtered away would claim a filter that is not
   * in effect (see docs/design-source.md).
   */
  species: readonly Species[];
};

/** The state the screen opens in: nothing typed, no chip on. */
export const NO_ZONE_FILTER: ZoneFilter = { query: '', species: [] };

/** True once either control is doing something, which is what the screen's empty state reads. */
export function isFilterActive(filter: ZoneFilter): boolean {
  return normalizeQuery(filter.query) !== '' || filter.species.length > 0;
}

/** A query as the filter compares it: trimmed, and case-insensitive. */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * A zone identifier read as a number, so the three spellings of one zone agree: the map's
 * own “Z09”, the card's “09” and the number a picker types, “9”. Only the leading zeros and
 * the `z` are removed — the frame's identifiers are numbers, and comparing them as numbers is
 * the only reading under which “9” finds zone 09.
 */
function asNumber(value: string): string {
  return value
    .toLowerCase()
    .replace(/^z/, '')
    .replace(/^0+(?=\d)/, '');
}

/**
 * True when the picker's query names this zone: its number, its map label, or a part of its
 * place name. The identifiers compare exactly and a place name compares as a substring —
 * “laaja” is a search for Laajavuori, while “1” is not a search for zone 14.
 */
function matchesQuery(zone: DemoZone, query: string): boolean {
  if (query === '') return true;

  const number = asNumber(query);
  if (number === asNumber(zone.number) || number === asNumber(zone.id)) return true;

  return zone.place !== undefined && zone.place.toLowerCase().includes(query);
}

/**
 * The zones the map may draw and the list may show, in the order they were given: a zone
 * survives when it matches what was typed **and** reports one of the chosen species. Both
 * controls narrow the same result rather than replacing one another, which is how two filters
 * on one screen are meant to read.
 */
export function filterZones(zones: readonly DemoZone[], filter: ZoneFilter): DemoZone[] {
  const query = normalizeQuery(filter.query);

  return zones.filter(
    (zone) =>
      matchesQuery(zone, query) &&
      (filter.species.length === 0 ||
        zone.species.some((species) => filter.species.includes(species))),
  );
}
