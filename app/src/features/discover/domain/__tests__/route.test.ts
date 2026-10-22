import { DEMO_ZONE_DETAILS } from '../zone-details';
import { DEMO_ROUTE, formatDistance, routeFor } from '../route';

/**
 * The rules behind frame 08 (node `5:23106`). Its walk is the design's sample, so what is
 * worth asserting is that the sample tells **one story with frames 06 and 07** — the same
 * zone, and the distance frame 07's own action names — and that the distance the app prints
 * is the language's notation rather than one string for every language.
 */
describe('the demo route', () => {
  it('leads to the zone frames 06 and 07 are about', () => {
    // Frame 07's card offers “Navigate · 1.4 km” and this is where that goes: a route to
    // another zone would have the app name one number and then walk another.
    expect(DEMO_ROUTE.zoneId).toBe(DEMO_ZONE_DETAILS.zoneId);
  });

  it('prints the distance frame 07’s action prints', () => {
    // “1.4 km” in the card, “1.4 km” in this screen's own card and in the action that opens it.
    expect(formatDistance(DEMO_ROUTE.distanceMeters, 'en')).toBe('1.4 km');
  });

  it('keeps its own figures inside the shape the frame draws', () => {
    // A walk of no minutes, an arrival time that is not a clock reading, or a turn in no
    // particular direction would be visible nonsense on the screen.
    expect(DEMO_ROUTE.minutes).toBeGreaterThan(0);
    expect(DEMO_ROUTE.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    expect(DEMO_ROUTE.nextTurn.meters).toBeGreaterThan(0);
    expect(DEMO_ROUTE.nextTurn.meters).toBeLessThan(DEMO_ROUTE.distanceMeters);
    expect(['left', 'right']).toContain(DEMO_ROUTE.nextTurn.direction);
  });
});

describe('formatDistance', () => {
  it('writes metres while the walk is short, as the frame’s guidance line does', () => {
    expect(formatDistance(180, 'en')).toBe('180 m');
    expect(formatDistance(999, 'en')).toBe('999 m');
  });

  it('writes kilometres at one decimal from a kilometre up', () => {
    expect(formatDistance(1000, 'en')).toBe('1.0 km');
    expect(formatDistance(1400, 'en')).toBe('1.4 km');
    expect(formatDistance(12400, 'en')).toBe('12.4 km');
  });

  it('uses the language’s own decimal mark', () => {
    // Finnish writes “1,4 km”; the number is data, the sentence and its punctuation are the
    // catalogue's, which is why this is not one string for both languages.
    expect(formatDistance(1400, 'fi')).toBe('1,4 km');
    expect(formatDistance(1000, 'fi')).toBe('1,0 km');
  });

  it('refuses a distance that is not one, rather than printing nonsense', () => {
    expect(() => formatDistance(-1, 'en')).toThrow(RangeError);
    expect(() => formatDistance(Number.NaN, 'en')).toThrow(RangeError);
    expect(() => formatDistance(Number.POSITIVE_INFINITY, 'en')).toThrow(RangeError);
  });
});

describe('routeFor', () => {
  it('answers for the zone it holds', () => {
    expect(routeFor(DEMO_ROUTE.zoneId)).toBe(DEMO_ROUTE);
  });

  it('answers nothing for another zone, rather than a walk to somewhere else', () => {
    expect(routeFor('Z99')).toBeUndefined();
    expect(routeFor('')).toBeUndefined();
  });
});
