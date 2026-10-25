import { parseZones, zoneSpecies, type Zone } from '../zone-source';

/**
 * The shape `data/test_zones.geojson` publishes, as the app reads it.
 *
 * Everything here is written out literally because this module is the app's **boundary**:
 * the payload is external input (SECURITY.md §4), and what it does with a field it cannot
 * read is the thing that decides whether a screen shows no zones or a zone it half
 * understands. ADR-036 §1.2 proposes the direction — a payload the app cannot read is no
 * zones at all — and these cases hold the app to it.
 */

const RING: readonly (readonly [number, number])[] = [
  [25.689711, 62.25623],
  [25.69564, 62.253184],
  [25.703822, 62.254551],
  [25.689711, 62.25623],
];

const scores = {
  bilberry: { score: 53, confidence: 'medium', ripeness: 'past' },
  lingonberry: { score: 70, confidence: 'medium', ripeness: 'ripe' },
  cloudberry: { score: 39, confidence: 'high', ripeness: 'ripe' },
  crowberry: { score: 43, confidence: 'low', ripeness: 'ripening' },
};

/** One feature in the published shape, overridable field by field. */
function feature(
  overrides: Record<string, unknown> = {},
  properties: Record<string, unknown> = {},
) {
  return {
    type: 'Feature',
    id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    geometry: { type: 'Polygon', coordinates: [RING] },
    properties: {
      h3: '8811250e25fffff',
      name: 'Laajavuori 1',
      species: 'bilberry',
      score: 53,
      confidence: 'medium',
      ripeness: 'past',
      updated_at: '2026-08-03T07:02:00+03:00',
      forest_type: 'forest_broadleaf',
      scores,
      stub: true,
      ...properties,
    },
    ...overrides,
  };
}

function collection(...features: unknown[]) {
  return { type: 'FeatureCollection', features };
}

const names = (zones: readonly Zone[]) => zones.map((zone) => zone.name);

describe('parseZones', () => {
  it('reads a feature into the zone the map draws', () => {
    const [zone] = parseZones(collection(feature()), 'bilberry');

    expect(zone).toMatchObject({
      id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
      h3: '8811250e25fffff',
      name: 'Laajavuori 1',
      ring: RING,
      updatedAt: '2026-08-03T07:02:00+03:00',
    });
  });

  it('speaks for the species the map asked about, not the one the file was built for', () => {
    // The stub declares `species: bilberry`, but it carries all four species' scores. A map
    // asked for lingonberry must paint lingonberry's score; painting the file's own default
    // is how two screens would disagree about the same zone.
    const [bilberry] = parseZones(collection(feature()), 'bilberry');
    const [lingonberry] = parseZones(collection(feature()), 'lingonberry');

    expect(bilberry).toMatchObject({ score: 53, confidence: 'medium', ripeness: 'past' });
    expect(lingonberry).toMatchObject({ score: 70, confidence: 'medium', ripeness: 'ripe' });
  });

  it('carries the timestamp the map draws and drops the fields it does not', () => {
    const [zone] = parseZones(collection(feature()), 'bilberry');

    // `updated_at` is the one metadata field a screen now prints (the map's freshness line),
    // so it survives as the app's own name. `stub` and `forest_type` are the file's and are
    // still dropped: echoing an unknown field is how a payload the app does not understand
    // reaches a component that assumes it does.
    expect(zone).toHaveProperty('updatedAt', '2026-08-03T07:02:00+03:00');
    expect(zone).not.toHaveProperty('stub');
    expect(zone).not.toHaveProperty('forestType');
  });

  it('keeps a zone whose timestamp it cannot read, and states no freshness for it', () => {
    // A timestamp is metadata, not geometry or a score: losing the zone because its date is
    // malformed would hide a zone the map can draw. The app drops the claim instead — the
    // screen omits the line rather than printing a day the payload did not name.
    const noTimestamp = feature({}, { updated_at: undefined });
    const bareDate = feature({}, { updated_at: '2026-08-03' });
    const localTime = feature({}, { updated_at: '2026-08-03T07:02:00' });
    const nonsense = feature({}, { updated_at: 'last Tuesday' });

    for (const candidate of [noTimestamp, bareDate, localTime, nonsense]) {
      const [zone] = parseZones(collection(candidate), 'bilberry');

      expect(zone?.name).toBe('Laajavuori 1');
      expect(zone?.updatedAt).toBeNull();
    }
  });

  it('leaves out a zone that has no score for the species asked about', () => {
    const withoutLingonberry = feature({}, { scores: { bilberry: scores.bilberry } });

    expect(parseZones(collection(withoutLingonberry), 'lingonberry')).toEqual([]);
    expect(names(parseZones(collection(withoutLingonberry), 'bilberry'))).toEqual(['Laajavuori 1']);
  });

  it('drops a ring it cannot draw instead of drawing a shape it made up', () => {
    const twoVertices = feature({
      geometry: { type: 'Polygon', coordinates: [[RING[0], RING[1]]] },
    });
    const infinite = feature({
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [25.689711, 62.25623],
            [Number.POSITIVE_INFINITY, 62.253184],
            [25.703822, 62.254551],
            [25.689711, 62.25623],
          ],
        ],
      },
    });
    const outOfRange = feature({
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [25.689711, 62.25623],
            [200.5, 62.253184],
            [25.703822, 62.254551],
            [25.689711, 62.25623],
          ],
        ],
      },
    });

    expect(parseZones(collection(twoVertices, infinite, outOfRange), 'bilberry')).toEqual([]);
  });

  it('drops a feature with no identifier or no name to print', () => {
    const unnamed = feature({}, { name: undefined });
    const unidentified = feature({ id: undefined });
    const blankId = feature({ id: '   ' });

    expect(parseZones(collection(unnamed, unidentified, blankId), 'bilberry')).toEqual([]);
  });

  it('drops a score it cannot read rather than painting a band for it', () => {
    const outOfRange = feature(
      {},
      {
        scores: { bilberry: { score: 130, confidence: 'medium', ripeness: 'past' } },
      },
    );
    const unknownConfidence = feature(
      {},
      {
        scores: { bilberry: { score: 53, confidence: 'certain', ripeness: 'past' } },
      },
    );
    const unknownRipeness = feature(
      {},
      {
        scores: { bilberry: { score: 53, confidence: 'medium', ripeness: 'gone' } },
      },
    );

    expect(
      parseZones(collection(outOfRange, unknownConfidence, unknownRipeness), 'bilberry'),
    ).toEqual([]);
  });

  it('treats a payload that is not a feature collection as no zones at all', () => {
    // The failure direction §1.2 proposes: not one zone rescued from a document the app
    // cannot read, because a map with half a payload's zones is a map that lies by omission.
    expect(parseZones(null, 'bilberry')).toEqual([]);
    expect(parseZones({}, 'bilberry')).toEqual([]);
    expect(parseZones({ type: 'FeatureCollection' }, 'bilberry')).toEqual([]);
    expect(parseZones({ type: 'FeatureCollection', features: {} }, 'bilberry')).toEqual([]);
    expect(parseZones([feature()], 'bilberry')).toEqual([]);
  });
});

/**
 * The species row frame 07 draws is the zone's own `scores`, not the design's two chips: the
 * payload is the only thing that can say what a zone was reported for. The berry the screen is
 * reading leads, so the accent chip and the score in the card are about the same berry.
 */
describe('zoneSpecies', () => {
  const zone = parseZones(collection(feature()), 'bilberry')[0]!;

  it('puts the berry the screen is reading first, then the rest in the app’s order', () => {
    expect(zoneSpecies(zone, 'lingonberry')).toEqual([
      'lingonberry',
      'bilberry',
      'cloudberry',
      'crowberry',
    ]);
    expect(zoneSpecies(zone, 'bilberry')).toEqual([
      'bilberry',
      'lingonberry',
      'cloudberry',
      'crowberry',
    ]);
  });

  it('leaves out a species the payload did not score', () => {
    const partial = parseZones(
      collection(feature({}, { scores: { bilberry: scores.bilberry } })),
      'bilberry',
    )[0]!;

    expect(zoneSpecies(partial, 'bilberry')).toEqual(['bilberry']);
  });

  it('never invents the berry it was asked for when the zone has no score for it', () => {
    const partial = parseZones(
      collection(feature({}, { scores: { lingonberry: scores.lingonberry } })),
      'lingonberry',
    )[0]!;

    expect(zoneSpecies(partial, 'bilberry')).toEqual(['lingonberry']);
  });
});
