import type { Zone } from './zone-source';

/**
 * The search field the frame puts above its map (node `5:22955`), as a pure function over the
 * zones the screen actually has — the pilot source's `Zone`s, not the design's sample.
 *
 * The field promises **a place or a zone**, and what a zone has to be found by is its name:
 * the stub's “Laajavuori 12”, the map's own label for the same ring. The identifier is not
 * searchable because it is a UUID (`docs/data-contract.md`), and the design's “Z14” is a
 * label this repository wrote for a demo composition that no longer feeds this screen.
 *
 * The species chips are **not** part of this filter. They ask the source a different question
 * (`list({ species })`, which decides whose score the map and the card carry), not a predicate
 * over a zone it already returned. Keeping the two apart is what stops a chip from being
 * painted as a filter while the number beside the map counts something else.
 */

export type ZoneFilter = {
  /**
   * What stands in the frame's search field, as typed. Casing and surrounding space are the
   * filter's business, not the field's: the field shows what the picker typed, the filter
   * reads it.
   */
  query: string;
};

/** The state the screen opens in: nothing typed. */
export const NO_ZONE_FILTER: ZoneFilter = { query: '' };

/** True once the field is doing something, which is what the screen's count line reads. */
export function isFilterActive(filter: ZoneFilter): boolean {
  return normalizeQuery(filter.query) !== '';
}

/** A query as the filter compares it: trimmed, and case-insensitive. */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * The zones the map may draw and the list may show, in the order the source gave them: a zone
 * survives when its **name** contains what was typed. A substring, not an exact match —
 * “laajavuori 1” is a search that should find “Laajavuori 12” too, and a picker typing half a
 * name has still named a place.
 */
export function filterZones(zones: readonly Zone[], filter: ZoneFilter): readonly Zone[] {
  const query = normalizeQuery(filter.query);
  if (query === '') return zones;

  return zones.filter((zone) => normalizeQuery(zone.name).includes(query));
}
