import { formatShortDate } from '@/services/i18n';

import {
  ALERT_CONFIDENCE,
  DEMO_ALERT,
  DEMO_ALERT_PREFERENCES,
  DEMO_ALERT_REASON_COUNT,
  confidenceLabelKey,
  formatRadius,
} from '../alert';
import { SCORE_MAX } from '../zone-details';
import { formatDistance } from '../route';
import { SPECIES } from '../species';

/**
 * Frame 12 (Core picker · Alerts and forecast, node `5:23439`) is the design's alert: what is
 * happening in the forest, why the app says so, and what it is worth.
 *
 * Nothing here observes weather, a season or other pickers' reports — there is no source for any
 * of it — so the alert is the design's own sample, and what this module holds are the *rules* the
 * screen applies to it: the scale its score is out of, the word its confidence gets, and the
 * distance it is away. Those rules are the same ones frames 07 and 08 already use, which is why
 * the alert cannot disagree with the zone screen about what “High confidence” means.
 */
describe('the design’s own alert', () => {
  it('is the frame’s own headline and figures (nodes 5:23456-5:23462)', () => {
    expect(DEMO_ALERT).toMatchObject({
      confidence: 'high',
      distanceMeters: 1800,
      place: 'Laajavuori',
      score: 82,
      zoneNumber: '18',
    });
  });

  it('scores on the same scale the zone screen prints', () => {
    expect(DEMO_ALERT.score).toBeGreaterThan(0);
    expect(DEMO_ALERT.score).toBeLessThanOrEqual(SCORE_MAX);
  });

  it('stands within the search radius the frame’s preferences set (3 km)', () => {
    expect(DEMO_ALERT.distanceMeters).toBeLessThan(3_000);
    expect(formatDistance(DEMO_ALERT.distanceMeters, 'en')).toBe('1.8 km');
    expect(formatDistance(DEMO_ALERT.distanceMeters, 'fi')).toBe('1,8 km');
  });

  it('carries the frame’s own stamp, which the language writes', () => {
    // “TODAY · 28 AUG · 09:30”: the day is the design's sample, and the app formats it.
    expect(formatShortDate(DEMO_ALERT.at, 'en')).toBe('28 Aug');
    expect(formatShortDate(DEMO_ALERT.at, 'fi')).toBe('28.8.');
    expect(DEMO_ALERT.atTime).toBe('09:30');
  });

  it('says why it is there in three reasons, as the frame draws', () => {
    expect(DEMO_ALERT_REASON_COUNT).toBe(3);
  });
});

/**
 * The frame's alert-preferences card (nodes 5:23480–5:23504), which the app draws as the design's
 * own sample: nothing delivers an alert, so its four settings describe no phone's state (ADR-043).
 * What is real is the notation they are printed with — a radius is a number the picker chose, and
 * the frame draws it in whole kilometres where its distances carry a decimal.
 */
describe('the frame’s own alert preferences', () => {
  it('is the frame’s own four settings', () => {
    expect(DEMO_ALERT_PREFERENCES).toMatchObject({
      extraSpecies: 1,
      pushAlerts: true,
      quietFrom: '21:00',
      quietTo: '07:00',
      radiusKm: 3,
      speciesId: 'bilberry',
    });
  });

  it('names its species in the vocabulary every other screen prints', () => {
    // The same identifiers screen 10's chips and frame 11's rows use; the word is the catalogue's.
    expect(SPECIES).toContain(DEMO_ALERT_PREFERENCES.speciesId);
  });

  it('prints its radius in whole kilometres, the way the frame sets it', () => {
    // “3 km” on the frame's own setting row (node 5:23492) — where the walk it would filter is
    // printed with a decimal (“1.8 km”, node 5:23456), so the two forms are both the app's.
    expect(formatRadius(DEMO_ALERT_PREFERENCES.radiusKm, 'en')).toBe('3 km');
    expect(formatRadius(DEMO_ALERT_PREFERENCES.radiusKm, 'fi')).toBe('3 km');
    // A half-kilometre radius is still the language's number, not English's full stop.
    expect(formatRadius(2.5, 'fi')).toBe('2,5 km');
    expect(() => formatRadius(-1, 'en')).toThrow(RangeError);
  });
});

describe('confidenceLabelKey', () => {
  it('names a confidence the way the zone screen names it', () => {
    // One vocabulary for one idea: frame 12's chip reads “High confidence”, and so does frame 07's.
    expect(confidenceLabelKey('high')).toBe('discover.details.confidence.high');
    expect(confidenceLabelKey('medium')).toBe('discover.details.confidence.medium');
    expect(confidenceLabelKey('low')).toBe('discover.details.confidence.low');
  });

  it('keeps every confidence the design draws, and the design’s order', () => {
    expect(ALERT_CONFIDENCE).toEqual(['high', 'medium', 'low']);
  });
});
