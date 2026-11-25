import type { Species } from '../species';
import { mergeZoneAnswers, selectedLayers } from '../zone-layers';
import type { Zone, ZoneScore } from '../zone-source';

const SCORES: Partial<Record<Species, ZoneScore>> = {
  bilberry: { confidence: 'medium', ripeness: 'past', score: 53 },
  cloudberry: { confidence: 'high', ripeness: 'ripe', score: 39 },
  lingonberry: { confidence: 'medium', ripeness: 'ripe', score: 70 },
};

function zone(id: string, name: string, scores = SCORES, updatedAt: string | null = null): Zone {
  const bilberry = scores.bilberry;
  return {
    id,
    h3: id,
    name,
    score: bilberry?.score ?? 0,
    confidence: bilberry?.confidence ?? 'low',
    ripeness: bilberry?.ripeness ?? 'unripe',
    scores,
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
    updatedAt,
  };
}

function answers(
  entries: Partial<Record<Species, readonly Zone[]>>,
): ReadonlyMap<Species, readonly Zone[]> {
  return new Map(Object.entries(entries) as [Species, readonly Zone[]][]);
}

describe('selectedLayers', () => {
  it('returns the chosen berries in the app’s own order', () => {
    expect(selectedLayers(['crowberry', 'bilberry', 'lingonberry'])).toEqual([
      'lingonberry',
      'bilberry',
      'crowberry',
    ]);
  });
});

describe('mergeZoneAnswers', () => {
  it('draws one ring per zone, carrying the best selected berry’s score and layer', () => {
    const merged = mergeZoneAnswers(
      answers({
        bilberry: [zone('a', 'Laajavuori 1')],
        lingonberry: [zone('a', 'Laajavuori 1')],
      }),
      ['bilberry', 'lingonberry'],
    );

    expect(merged.zones).toHaveLength(1);
    expect(merged.zones[0]).toMatchObject({
      confidence: 'medium',
      ripeness: 'ripe',
      score: 70,
    });
    expect(merged.layer.get('a')).toBe('lingonberry');
  });

  it('keeps each zone’s own best layer when the berries disagree', () => {
    const betterBilberry = {
      ...SCORES,
      bilberry: { confidence: 'high', ripeness: 'ripe', score: 81 } as ZoneScore,
    };
    const merged = mergeZoneAnswers(
      answers({
        bilberry: [zone('b', 'Laajavuori 12', betterBilberry)],
        lingonberry: [zone('b', 'Laajavuori 12', betterBilberry)],
      }),
      ['bilberry', 'lingonberry'],
    );

    expect(merged.zones[0]).toMatchObject({ confidence: 'high', score: 81 });
    expect(merged.layer.get('b')).toBe('bilberry');
  });

  it('ignores a berry the picker turned off, even when the payload scored it higher', () => {
    const merged = mergeZoneAnswers(answers({ bilberry: [zone('a', 'Laajavuori 1')] }), [
      'bilberry',
    ]);

    expect(merged.zones[0]).toMatchObject({ ripeness: 'past', score: 53 });
    expect(merged.layer.get('a')).toBe('bilberry');
  });

  it('keeps the older timestamp of two copies, and no claim when either has none', () => {
    const newer = '2026-08-03T07:02:00.000Z';
    const older = '2026-08-02T07:02:00.000Z';

    const merged = mergeZoneAnswers(
      answers({
        bilberry: [zone('a', 'Laajavuori 1', SCORES, newer)],
        lingonberry: [zone('a', 'Laajavuori 1', SCORES, older)],
      }),
      ['bilberry', 'lingonberry'],
    );
    expect(merged.zones[0]?.updatedAt).toBe(older);

    const undated = mergeZoneAnswers(
      answers({
        bilberry: [zone('a', 'Laajavuori 1', SCORES, newer)],
        lingonberry: [zone('a', 'Laajavuori 1', SCORES, null)],
      }),
      ['bilberry', 'lingonberry'],
    );
    expect(undated.zones[0]?.updatedAt).toBeNull();
  });

  it('orders zones by the first selected berry that scored them', () => {
    const merged = mergeZoneAnswers(
      answers({
        bilberry: [zone('b', 'Laajavuori 12')],
        lingonberry: [zone('a', 'Laajavuori 1'), zone('b', 'Laajavuori 12')],
      }),
      ['bilberry', 'lingonberry'],
    );

    expect(merged.zones.map((candidate) => candidate.id)).toEqual(['a', 'b']);
  });

  it('has nothing to draw when no selected berry answered', () => {
    const merged = mergeZoneAnswers(answers({}), ['lingonberry']);

    expect(merged.zones).toEqual([]);
    expect(merged.layer.size).toBe(0);
  });
});
