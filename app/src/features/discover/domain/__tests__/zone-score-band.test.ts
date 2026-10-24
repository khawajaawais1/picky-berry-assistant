import { scoreBand, ZONE_SCORE_BANDS } from '../zone-score-band';
import { zoneFeatureCollection, type Zone } from '../zone-source';

/**
 * What a zone's colour means on the map.
 *
 * The spec's A3 rule is five colour bands plus a faded low-confidence treatment
 * (docs/features/6.2-live-site-map.md). The band edges are the app's own — the spec names
 * the count, not the thresholds — so they are asserted here to the number, and the
 * off-the-edge cases are the ones a score of exactly 20 or 80 would otherwise fall through.
 */

describe('scoreBand', () => {
  it('puts a score in the band whose edges it is inside', () => {
    expect(scoreBand(0).min).toBe(0);
    expect(scoreBand(19).min).toBe(0);
    expect(scoreBand(20).min).toBe(20);
    expect(scoreBand(39).min).toBe(20);
    expect(scoreBand(40).min).toBe(40);
    expect(scoreBand(59).min).toBe(40);
    expect(scoreBand(60).min).toBe(60);
    expect(scoreBand(79).min).toBe(60);
    expect(scoreBand(80).min).toBe(80);
    expect(scoreBand(100).min).toBe(80);
  });

  it('has five bands covering the whole scale with no gap between them', () => {
    expect(ZONE_SCORE_BANDS).toHaveLength(5);

    for (let score = 0; score <= 100; score += 1) {
      expect(scoreBand(score).min).toBeLessThanOrEqual(score);
      expect(scoreBand(score).max).toBeGreaterThanOrEqual(score);
    }
  });

  it('clamps a score the contract should never send, rather than inventing a sixth band', () => {
    expect(scoreBand(-1).min).toBe(0);
    expect(scoreBand(101).min).toBe(80);
  });

  it('gives every band its own fill and line token, so a band cannot reuse another colour', () => {
    const tokens = ZONE_SCORE_BANDS.flatMap((band) => [String(band.fill), String(band.line)]);

    expect(new Set(tokens).size).toBe(tokens.length);
  });
});

describe('zoneFeatureCollection', () => {
  const zone = (overrides: Partial<Zone> = {}): Zone => ({
    id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    h3: '8811250e25fffff',
    name: 'Laajavuori 1',
    score: 53,
    confidence: 'medium',
    ripeness: 'past',
    scores: {},
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
    ...overrides,
  });

  it('hands MapLibre a closed polygon per zone, carrying the band the map paints', () => {
    const collection = zoneFeatureCollection([zone()]);

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toMatchObject({
      type: 'Feature',
      id: zone().id,
      geometry: { type: 'Polygon', coordinates: [zone().ring] },
      properties: { band: 40, lowConfidence: false, name: 'Laajavuori 1', score: 53 },
    });
  });

  it('marks a zone whose confidence is low, which is the map’s faded treatment', () => {
    const collection = zoneFeatureCollection([zone({ confidence: 'low' })]);

    expect(collection.features[0]?.properties).toMatchObject({ lowConfidence: true });
    expect(
      zoneFeatureCollection([zone({ confidence: 'high' })]).features[0]?.properties,
    ).toMatchObject({ lowConfidence: false });
  });

  it('carries no zones when there are none to carry', () => {
    expect(zoneFeatureCollection([]).features).toEqual([]);
  });
});
