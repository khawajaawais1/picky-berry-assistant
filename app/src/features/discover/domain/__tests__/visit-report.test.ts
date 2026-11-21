import {
  DEFAULT_YIELD_RATING,
  REPORT_SPECIES,
  REPORT_SPECIES_MORE,
  buildVisitReport,
} from '../visit-report';
import { SPECIES } from '../species';

const VISIT = {
  endedAt: new Date('2026-10-09T10:55:00.000Z').getTime(),
  openedAt: new Date('2026-10-09T10:03:00.000Z').getTime(),
  zoneId: 'zone-laajavuori-1',
};

describe('the report screen 10 builds', () => {
  it('offers the species the design’s own two chips name, then the rest of the vocabulary', () => {
    // The frame's first two chips are the design's own (nodes 5:23281 and 5:23283). Its third
    // is “More”, and the design names exactly three berries in all — the same three its filter
    // chips set out (node 5:22959) — so “More” holds the vocabulary the app can name, the
    // whole of it and nothing the app cannot.
    expect(REPORT_SPECIES).toEqual(['lingonberry', 'bilberry']);
    expect([...REPORT_SPECIES, ...REPORT_SPECIES_MORE]).toEqual([...SPECIES]);
  });

  it('reports the species beyond the frame’s two chips like any other', () => {
    expect(
      buildVisitReport(
        { amountText: '', speciesId: 'cloudberry', yieldRating: 4 },
        new Date('2026-10-10T09:00:00.000Z'),
        VISIT,
      ),
    ).toMatchObject({ speciesId: 'cloudberry' });
  });

  it('offers no species twice, so the row cannot draw one chip twice', () => {
    expect(new Set([...REPORT_SPECIES, ...REPORT_SPECIES_MORE]).size).toBe(SPECIES.length);
  });

  it('starts on the rating the frame draws selected (“Good”, the fourth of five)', () => {
    expect(DEFAULT_YIELD_RATING).toBe(4);
  });

  it('joins the picker’s own answers to the visit they belong to', () => {
    const recordedAt = new Date('2026-10-09T10:55:00.000Z');

    expect(
      buildVisitReport(
        { amountText: '  1.3 kg ', speciesId: 'lingonberry', yieldRating: 4 },
        recordedAt,
        VISIT,
      ),
    ).toEqual({
      amountText: '1.3 kg',
      minutes: 52,
      recordedAt: '2026-10-09T10:55:00.000Z',
      speciesId: 'lingonberry',
      yieldRating: 4,
      zoneId: 'zone-laajavuori-1',
    });
  });

  it('records the visit’s own length, which the frame’s summary prints', () => {
    // The frame's summary line says 52 min (node 5:23277), and screen 11's history rows print
    // the same number beside the visit.
    const report = buildVisitReport(
      { amountText: '', speciesId: 'bilberry', yieldRating: 3 },
      new Date('2026-10-09T10:55:00.000Z'),
      VISIT,
    );

    expect(report.minutes).toBe(52);
  });

  it('records an amount the picker left empty as empty, not as a guess', () => {
    const report = buildVisitReport(
      { amountText: '   ', speciesId: 'bilberry', yieldRating: 1 },
      new Date('2026-10-09T10:55:00.000Z'),
      VISIT,
    );

    expect(report.amountText).toBe('');
  });
});
