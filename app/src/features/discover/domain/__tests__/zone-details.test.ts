import { CARD_ZONE_STATE, DEMO_ZONES } from '../zone';
import { DEMO_ZONE_DETAILS, REPORT_YIELD_MAX, SCORE_MAX, zoneDetailsFor } from '../zone-details';

/**
 * The rules behind frame 07 (node `5:23032`). Its numbers are the design's sample, so what is
 * worth asserting is not that they are true — they are not, nothing returns them yet — but
 * that they are **one story told twice**: frame 06's card and this screen describe the same
 * demo zone, with the same score and the same state, and the scales the frame prints are the
 * scales the app uses.
 */
describe('the demo zone’s details', () => {
  it('describe the zone frame 06 draws, not another one', () => {
    const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

    expect(zone).toBeDefined();
    expect(DEMO_ZONE_DETAILS.zoneId).toBe(zone?.id);
    expect(DEMO_ZONE_DETAILS.state).toBe(CARD_ZONE_STATE);
  });

  it('carry the same score frame 06’s badge and card print', () => {
    // 78 in the map's badge, 78 in the card's chip and 78 here: if these ever drift, the app
    // is telling the user two different numbers about one zone.
    const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

    expect(DEMO_ZONE_DETAILS.score).toBe(zone?.score);
  });

  it('names the state in the map legend’s vocabulary', () => {
    // The chip on this screen says “Unpicked”, which is the word the map's legend uses for
    // the same zone: one vocabulary, or the two screens describe the same colour differently.
    expect(DEMO_ZONE_DETAILS.state).toBe('unpicked');
    expect(DEMO_ZONE_DETAILS.ripeness).toBe('ripe');
  });

  it('keeps every figure inside the scale the frame prints it against', () => {
    expect(DEMO_ZONE_DETAILS.score).toBeGreaterThanOrEqual(0);
    expect(DEMO_ZONE_DETAILS.score).toBeLessThanOrEqual(SCORE_MAX);
    expect(DEMO_ZONE_DETAILS.latestReport.yield).toBeGreaterThanOrEqual(0);
    expect(DEMO_ZONE_DETAILS.latestReport.yield).toBeLessThanOrEqual(REPORT_YIELD_MAX);
  });

  it('counts at least the reports it shows, and the freshest one is inside the week', () => {
    // The card counts a week of reports and the heading offers “See all {count}”: a count of
    // zero would make both lines nonsense, and a “38 min ago” stamp outside the week it is
    // counted in would be a contradiction the user can see.
    const weekInMinutes = 7 * 24 * 60;

    expect(DEMO_ZONE_DETAILS.reportsThisWeek).toBeGreaterThan(0);
    expect(DEMO_ZONE_DETAILS.latestReport.minutesAgo).toBeLessThan(weekInMinutes);
  });

  it('gives a forecast hour as the clock reads it, not as a sentence', () => {
    // “Forecast at 08:00” is copy around a value: the hour is data, so a locale can format it.
    expect(DEMO_ZONE_DETAILS.weather.forecastHour).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('zoneDetailsFor', () => {
  it('answers for the zone it holds', () => {
    expect(zoneDetailsFor(DEMO_ZONE_DETAILS.zoneId)).toBe(DEMO_ZONE_DETAILS);
  });

  it('answers nothing for another zone, rather than another zone’s numbers', () => {
    // The failure this prevents: a deep link to a zone nobody has data for, rendering the demo
    // zone's yield as if it were that zone's.
    expect(zoneDetailsFor('Z99')).toBeUndefined();
    expect(zoneDetailsFor('')).toBeUndefined();
  });
});
