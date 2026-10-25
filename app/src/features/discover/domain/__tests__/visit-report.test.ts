import {
  DEFAULT_YIELD_RATING,
  DEMO_VISIT_WINDOW,
  REPORT_SPECIES,
  REPORT_SPECIES_MORE,
  buildVisitReport,
  visitMinutes,
} from '../visit-report';
import { DEMO_ACTIVE_VISIT } from '../active-visit';
import { SPECIES } from '../species';

/**
 * Frame 10 (Core picker · Post-visit feedback, node `5:23259`) reports the visit back to the
 * picker before offering to save it: “Zone 14 · 28 Aug · 10:03–10:55 · 52 min”.
 */
describe('visitMinutes', () => {
  it('reads the frame’s own window back as the duration it prints', () => {
    // 10:03 to 10:55 is the frame's own 52 minutes (node 5:23277) — and the frame's arrival
    // is screen 09's: the two screens tell one story about one walk.
    expect(visitMinutes(DEMO_VISIT_WINDOW.arrival, DEMO_VISIT_WINDOW.departure)).toBe(52);
    expect(DEMO_VISIT_WINDOW.arrival).toBe('10:03');
  });

  it('counts across the hour', () => {
    expect(visitMinutes('09:41', '10:03')).toBe(22);
    expect(visitMinutes('10:03', '10:03')).toBe(0);
  });

  it('reads a departure earlier on the clock as the next morning, not as a mistake', () => {
    // A visit may span the end of a local day, so the window wraps instead of going negative
    // (PROJECT.md, decision 16).
    expect(visitMinutes('23:30', '00:15')).toBe(45);
  });

  it('refuses a reading it cannot read as a clock time', () => {
    expect(() => visitMinutes('10', '10:55')).toThrow(RangeError);
    expect(() => visitMinutes('10:03', '1055')).toThrow(RangeError);
    expect(() => visitMinutes('24:00', '24:30')).toThrow(RangeError);
    expect(() => visitMinutes('10:63', '11:00')).toThrow(RangeError);
  });
});

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
      ),
    ).toEqual({
      amountText: '1.3 kg',
      minutes: 52,
      recordedAt: '2026-10-09T10:55:00.000Z',
      speciesId: 'lingonberry',
      yieldRating: 4,
      zoneId: DEMO_ACTIVE_VISIT.zoneId,
    });
  });

  it('records the visit’s own length, which the frame’s summary prints', () => {
    // The frame's summary line says 52 min (node 5:23277), and screen 11's history rows print
    // the same number beside the visit.
    const report = buildVisitReport(
      { amountText: '', speciesId: 'bilberry', yieldRating: 3 },
      new Date('2026-10-09T10:55:00.000Z'),
    );

    expect(report.minutes).toBe(52);
  });

  it('records an amount the picker left empty as empty, not as a guess', () => {
    const report = buildVisitReport(
      { amountText: '   ', speciesId: 'bilberry', yieldRating: 1 },
      new Date('2026-10-09T10:55:00.000Z'),
    );

    expect(report.amountText).toBe('');
  });
});
