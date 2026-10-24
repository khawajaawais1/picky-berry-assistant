import type { Zone } from '../zone-source';
import { NO_ZONE_FILTER, filterZones, isFilterActive } from '../zone-filter';

/**
 * The frame 06 search field, as a pure function over the zones the screen actually has — the
 * `ZoneSource`'s own `Zone`s.
 *
 * What it promises is narrow and the tests hold it narrow: the field searches a **place or
 * zone** by the zone's name, which is the word the map paints. It does not transliterate a
 * query, guess at a place index, or search the identifier — that is a UUID the picker never
 * sees (`docs/data-contract.md`). And the failure that matters most is the one at the end: a
 * filter that keeps a zone it should have dropped tells the picker there are berries where
 * there are none.
 */

function zone(id: string, name: string): Zone {
  return {
    id,
    h3: id,
    name,
    score: 50,
    confidence: 'medium',
    ripeness: 'ripe',
    scores: {},
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
  };
}

const ZONES: readonly Zone[] = [
  zone('a', 'Laajavuori 1'),
  zone('b', 'Laajavuori 12'),
  zone('c', 'Kilimajärvi 1'),
];

const ids = (zones: readonly Zone[]) => zones.map((candidate) => candidate.id);

describe('filterZones', () => {
  it('returns every zone, in the order it was given, when nothing is asked of it', () => {
    expect(ids(filterZones(ZONES, NO_ZONE_FILTER))).toEqual(['a', 'b', 'c']);
  });

  it('matches a zone by part of its name, in either case, with space around it', () => {
    expect(ids(filterZones(ZONES, { query: 'laaja' }))).toEqual(['a', 'b']);
    expect(ids(filterZones(ZONES, { query: '  Laajavuori 12  ' }))).toEqual(['b']);
    expect(ids(filterZones(ZONES, { query: 'KILIMAJÄRVI' }))).toEqual(['c']);
  });

  it('reads a substring, because a picker typing half a name has still named a place', () => {
    // “Laajavuori 1” names zone 1 and is also contained in “Laajavuori 12”; exact matching
    // would hide the second from a picker who typed the first.
    expect(ids(filterZones(ZONES, { query: 'Laajavuori 1' }))).toEqual(['a', 'b']);
  });

  it('does not search the identifier, which is a UUID the picker never sees', () => {
    expect(filterZones(ZONES, { query: 'cc0e7929' })).toEqual([]);
  });

  it('finds nothing when the name is not here, rather than everything', () => {
    expect(filterZones(ZONES, { query: 'Kilimajärvi 2' })).toEqual([]);
  });
});

describe('isFilterActive', () => {
  it('is false for empty and whitespace-only fields, true once something is asked', () => {
    expect(isFilterActive(NO_ZONE_FILTER)).toBe(false);
    expect(isFilterActive({ query: '   ' })).toBe(false);
    expect(isFilterActive({ query: 'a' })).toBe(true);
  });
});
