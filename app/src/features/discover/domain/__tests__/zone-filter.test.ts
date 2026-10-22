import { DEMO_ZONES, type DemoZone } from '../zone';
import { NO_ZONE_FILTER, filterZones, isFilterActive } from '../zone-filter';

/**
 * The frame 06 search field and species chips, as a pure function over the zones the app
 * has.
 *
 * What the two controls promise is narrow and the tests hold it narrow: the field searches a
 * **place or zone** — the frame's own words — and the chips keep the zones that report a
 * chosen species. Nothing here reads the catalogue, transliterates a query or guesses at a
 * place index, and the failure that matters most is the one at the end: a filter that keeps a
 * zone it should have dropped tells the picker there are berries where there are none.
 */
const idOf = (zone: DemoZone) => zone.id;
const ids = (zones: readonly DemoZone[]) => zones.map(idOf);

describe('filterZones', () => {
  it('returns every zone, in the order it was given, when nothing is asked of it', () => {
    expect(ids(filterZones(DEMO_ZONES, NO_ZONE_FILTER))).toEqual(['Z14', 'Z09', 'Z21']);
  });

  it('matches a zone by the number its card spells', () => {
    expect(ids(filterZones(DEMO_ZONES, { query: '14', species: [] }))).toEqual(['Z14']);
  });

  it('matches a zone by the label its map draws, in either case', () => {
    expect(ids(filterZones(DEMO_ZONES, { query: 'Z09', species: [] }))).toEqual(['Z09']);
    expect(ids(filterZones(DEMO_ZONES, { query: 'z09', species: [] }))).toEqual(['Z09']);
  });

  it('reads a zone’s number as a number, so a dropped leading zero still matches', () => {
    // The frame's own label is “Z09” and its card would spell the same zone “Zone 9”; a
    // picker typing the number the way they read it must not get an empty map.
    expect(ids(filterZones(DEMO_ZONES, { query: '9', species: [] }))).toEqual(['Z09']);
  });

  it('matches a place name, in part, because a search is not an exact identifier', () => {
    expect(ids(filterZones(DEMO_ZONES, { query: 'laaja', species: [] }))).toEqual(['Z14']);
    expect(ids(filterZones(DEMO_ZONES, { query: '  Laajavuori  ', species: [] }))).toEqual(['Z14']);
  });

  it('keeps a zone only when it reports one of the chosen species', () => {
    // Zone 14 is reported for two berries — the frame's own chips name both on frame 07 — so a
    // search for either finds it, and the demo's own order is kept.
    expect(ids(filterZones(DEMO_ZONES, { query: '', species: ['bilberry'] }))).toEqual([
      'Z14',
      'Z09',
    ]);
    expect(ids(filterZones(DEMO_ZONES, { query: '', species: ['cloudberry'] }))).toEqual(['Z21']);
    expect(
      ids(filterZones(DEMO_ZONES, { query: '', species: ['lingonberry', 'cloudberry'] })),
    ).toEqual(['Z14', 'Z21']);
  });

  it('keeps a zone that reports any of the species it is asked about', () => {
    // One zone, two species: the rule is “any of”, not “all of”, which is what a row of
    // species chips means when more than one is on.
    const both: readonly DemoZone[] = [
      { id: 'Z01', number: '01', state: 'unpicked', species: ['bilberry', 'cloudberry'] },
    ];

    expect(ids(filterZones(both, { query: '', species: ['cloudberry'] }))).toEqual(['Z01']);
    expect(ids(filterZones(both, { query: '', species: ['lingonberry'] }))).toEqual([]);
  });

  it('asks for both at once: a place and a species narrow each other', () => {
    expect(ids(filterZones(DEMO_ZONES, { query: '14', species: ['cloudberry'] }))).toEqual([]);
    expect(ids(filterZones(DEMO_ZONES, { query: '14', species: ['lingonberry'] }))).toEqual([
      'Z14',
    ]);
    // …and asking for a berry the zone *does* report keeps it: zone 14 reports two.
    expect(ids(filterZones(DEMO_ZONES, { query: '14', species: ['bilberry'] }))).toEqual(['Z14']);
  });

  it('finds nothing rather than everything when the query matches no zone', () => {
    // The defect this guards: a query that matches nothing falling back to the unfiltered
    // list, which would tell the picker every zone is a match for a place that is not here.
    expect(filterZones(DEMO_ZONES, { query: 'Kilimajärvi', species: [] })).toEqual([]);
  });
});

describe('isFilterActive', () => {
  it('is false for the state the screen opens in', () => {
    expect(isFilterActive(NO_ZONE_FILTER)).toBe(false);
    expect(isFilterActive({ query: '   ', species: [] })).toBe(false);
  });

  it('is true as soon as either control is used', () => {
    expect(isFilterActive({ query: '14', species: [] })).toBe(true);
    expect(isFilterActive({ query: '', species: ['bilberry'] })).toBe(true);
  });
});
