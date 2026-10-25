import { themes } from '@/constants/theme';

import { CARD_ZONE_STATE, DEMO_ZONES, ZONE_APPEARANCE, ZONE_STATES } from '../zone';

/**
 * The rules the frame's map and its legend share, measured on node 5:22942: three states,
 * named in the legend's order, each drawn as the polygon the frame gives it and painted in
 * a colour the legend repeats.
 *
 * These are the assertions that keep the map and its legend from drifting apart — a state
 * that is recoloured in one place and not the other leaves the legend naming a colour that
 * is no longer on the map, and nothing else in the suite would notice.
 */
describe('the zone states', () => {
  it('is the three the frame’s legend names, in the order it names them', () => {
    expect(ZONE_STATES).toEqual(['unpicked', 'recentlyPicked', 'ripening']);
  });

  it('draws every one of them as a closed polygon', () => {
    for (const state of ZONE_STATES) {
      expect(ZONE_APPEARANCE[state].shape).toMatch(/Z$/i);
      expect(ZONE_APPEARANCE[state].shape.length).toBeGreaterThan(10);
    }
  });

  it('paints each one in a different fill and a different outline', () => {
    // Two states sharing a fill would be two zones the legend claims to distinguish and the
    // map does not; the same goes for the outline, which is exactly what the swatch shows.
    const fills = ZONE_STATES.map((state) => ZONE_APPEARANCE[state].fill);
    const lines = ZONE_STATES.map((state) => ZONE_APPEARANCE[state].line);

    expect(new Set(fills).size).toBe(ZONE_STATES.length);
    expect(new Set(lines).size).toBe(ZONE_STATES.length);
  });

  it('names tokens that exist in both colour schemes', () => {
    for (const state of ZONE_STATES) {
      const { fill, line, label } = ZONE_APPEARANCE[state];

      for (const scheme of ['light', 'dark'] as const) {
        for (const token of [fill, line, label]) {
          expect(themes[scheme].colors[token]).toMatch(/^#[0-9A-F]{6}$/i);
        }
      }
    }
  });
});

describe('the frame’s demo zones', () => {
  it('draws one zone per state, so the legend’s three colours all appear', () => {
    for (const state of ZONE_STATES) {
      expect(DEMO_ZONES.filter((zone) => zone.state === state)).toHaveLength(1);
    }
  });

  it('gives the card’s zone the score the frame prints on its badge', () => {
    const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

    expect(zone).toMatchObject({ id: 'Z14', number: '14', score: 78 });
  });

  it('carries the frame’s own two spellings of a zone: the map’s and the card’s', () => {
    // The map labels the zone `Z09`; the card says “Zone 09”. Both are the design's words,
    // which is why the number is data rather than a rule applied to the identifier.
    expect(DEMO_ZONES.every((zone) => zone.id.startsWith('Z'))).toBe(true);
    expect(DEMO_ZONES.every((zone) => !zone.number.includes('Z'))).toBe(true);
  });
});
