import { formatShortDate } from '@/services/i18n';

import { DEMO_DOWNLOADS, DEMO_REGION_SIZE_MB, demoStorageShare } from '../downloads';

/**
 * The figures frame 13 draws about a region that is downloaded, which the app draws as the design's
 * sample because nothing is downloaded at all (ADR-031, known issue 30 — and ADR-042, which is what
 * put them on the screen).
 *
 * The point of asserting a *sample* is not that it is true of the world; it is that it is the
 * frame's own story, told once. Two numbers that describe one downloaded region may not disagree,
 * the moments must be instants the language can actually format (a screen that threw on a date
 * would be a worse defect than a wrong one), and the meter's fill has to be the share it claims.
 */
describe('the sample frame 13 draws as a downloaded region', () => {
  it('weighs the same on the phone as the storage it occupies reports', () => {
    expect(DEMO_REGION_SIZE_MB).toBe(DEMO_DOWNLOADS.storage.usedMb);
  });

  it('fills the storage meter with the share of it that is used', () => {
    // The frame draws 59 px of a 342 px meter, which is 86 of 500 MB rounded to the pixel: the bar
    // is computed from the two figures rather than drawn to a width of its own.
    expect(demoStorageShare()).toBeCloseTo(86 / 500, 5);
    expect(Math.round(demoStorageShare() * 342)).toBe(59);
  });

  it('names moments the language can format', () => {
    expect(formatShortDate(DEMO_DOWNLOADS.forecastSavedOn, 'en')).toBe('28 Aug');
    expect(formatShortDate(DEMO_DOWNLOADS.lastSyncOn, 'en')).toBe('28 Aug');
    // Finnish writes the same day numerically — the form is the language's, the instant the data's.
    expect(formatShortDate(DEMO_DOWNLOADS.forecastSavedOn, 'fi')).toBe('28.8.');
  });

  it('describes one region rather than two, so a row cannot drift from the frame', () => {
    // The frame's own rows: “Map tiles & 24 zones”, “12 km² · 86 MB · Downloaded”, “86 / 500 MB”.
    expect(DEMO_DOWNLOADS.areaKm2).toBe(12);
    expect(DEMO_DOWNLOADS.zoneCount).toBe(24);
    expect(DEMO_DOWNLOADS.forecastSavedAtTime).toBe('08:00');
    expect(DEMO_DOWNLOADS.lastSyncAtTime).toBe('08:12');
  });
});
