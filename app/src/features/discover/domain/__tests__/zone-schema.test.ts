import { parseZoneList, parseZoneListStrict } from '../zone-schema';
import type { Zone } from '../zone-source';

/**
 * The `ZoneSource` port's response, as the hook reads it through zod.
 *
 * There are two boundaries in this feature and they are not the same one: `parseZones` reads
 * the GeoJSON document an adapter receives, and this schema reads **the zones an adapter
 * returns**. The second is what a future `GET /zones` adapter will hand the map without the
 * parser ever seeing it, so it is the place the contract is checked again.
 *
 * The failure direction is ADR-036 §1.2's: a response the app cannot read is **no zones at
 * all**, never the zones it could half-understand.
 */

const ZONE: Zone = {
  id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  h3: '8811250e25fffff',
  name: 'Laajavuori 1',
  score: 53,
  confidence: 'medium',
  ripeness: 'past',
  scores: {
    bilberry: { score: 53, confidence: 'medium', ripeness: 'past' },
    lingonberry: { score: 70, confidence: 'high', ripeness: 'ripe' },
  },
  ring: [
    [25.689711, 62.25623],
    [25.69564, 62.253184],
    [25.703822, 62.254551],
    [25.689711, 62.25623],
  ],
};

describe('parseZoneList', () => {
  it('reads a zone the map can draw', () => {
    const [zone] = parseZoneList([ZONE]);

    expect(zone).toEqual(ZONE);
  });

  it('accepts the timestamp the map prints, and refuses one it cannot read', () => {
    const [zone] = parseZoneList([{ ...ZONE, updatedAt: '2026-08-03T07:02:00+03:00' }]);

    expect(zone?.updatedAt).toBe('2026-08-03T07:02:00+03:00');

    // A bare day and a local time with no offset are not the instant the contract names; the
    // adapter that produced one is broken, and the screen would otherwise print a day the
    // payload never named. The failure direction is still “no zones at all”.
    expect(parseZoneList([{ ...ZONE, updatedAt: '2026-08-03' }])).toEqual([]);
    expect(parseZoneList([{ ...ZONE, updatedAt: '2026-08-03T07:02:00' }])).toEqual([]);
  });

  it('accepts a species map that carries only the berries the response scored', () => {
    const [zone] = parseZoneList([{ ...ZONE, scores: { cloudberry: ZONE.scores.lingonberry } }]);

    expect(zone?.scores).toEqual({ cloudberry: ZONE.scores.lingonberry });
  });

  it('does not carry a field the port never promised', () => {
    // `stub` and `forest_type` are the GeoJSON file's words; an adapter that echoes them
    // onto a zone would let a component depend on something the contract does not include.
    const [zone] = parseZoneList([{ ...ZONE, stub: true, forestType: 'forest_broadleaf' }]);

    expect(zone).toEqual(ZONE);
    expect(zone).not.toHaveProperty('stub');
    expect(zone).not.toHaveProperty('forestType');
  });

  it('refuses a score the map cannot band', () => {
    const outOfRange = { ...ZONE, score: 130 };
    const fractional = { ...ZONE, score: 53.5 };
    const unknownConfidence = { ...ZONE, confidence: 'certain' };
    const unknownRipeness = { ...ZONE, ripeness: 'gone' };

    for (const zone of [outOfRange, fractional, unknownConfidence, unknownRipeness]) {
      expect(parseZoneList([zone])).toEqual([]);
    }
  });

  it('refuses a ring it cannot draw instead of drawing a shape it made up', () => {
    const open = [...ZONE.ring.slice(0, 3)];
    const tooShort = [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
    ];
    const outOfRange = [
      [25.689711, 62.25623],
      [200.5, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ];

    for (const ring of [open, tooShort, outOfRange]) {
      expect(parseZoneList([{ ...ZONE, ring }])).toEqual([]);
    }
  });

  it('refuses a zone with no identifier or no name to print', () => {
    expect(parseZoneList([{ ...ZONE, id: '' }])).toEqual([]);
    expect(parseZoneList([{ ...ZONE, name: '   ' }])).toEqual([]);
    expect(parseZoneList([{ ...ZONE, name: undefined }])).toEqual([]);
  });

  it('refuses a species score it cannot read', () => {
    const badScore = { ...ZONE, scores: { bilberry: { score: 130, confidence: 'medium' } } };

    expect(parseZoneList([badScore])).toEqual([]);
  });

  it('treats a response that is not a list of zones as no zones at all', () => {
    expect(parseZoneList(null)).toEqual([]);
    expect(parseZoneList({})).toEqual([]);
    expect(parseZoneList(ZONE)).toEqual([]);
    expect(parseZoneList('zones')).toEqual([]);
    expect(parseZoneList(undefined)).toEqual([]);
  });

  it('drops the whole response when one zone in it is unreadable', () => {
    // Not the readable zone alone: a map missing one of the zones the source sent lies by
    // omission, which is the failure direction ADR-036 §1.2 records.
    expect(parseZoneList([ZONE, { ...ZONE, id: 'other', score: -1 }])).toEqual([]);
  });
});

describe('parseZoneListStrict', () => {
  it('tells a response it could not read from one that was empty', () => {
    // `parseZoneList` answers an empty list for both, which is the right answer at the map and
    // the wrong one when deciding whether a stored entry may be hydrated: an unreadable cache
    // must be dropped, where an empty answer is a real answer the app can restore.
    expect(parseZoneListStrict([{ ...ZONE, score: 130 }])).toBeNull();
    expect(parseZoneListStrict('zones')).toBeNull();
    expect(parseZoneListStrict([])).toEqual([]);
  });

  it('reads the same list `parseZoneList` would', () => {
    expect(parseZoneListStrict([ZONE])).toEqual(parseZoneList([ZONE]));
  });
});
