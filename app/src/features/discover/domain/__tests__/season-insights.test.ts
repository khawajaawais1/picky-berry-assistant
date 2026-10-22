import type { VisitReport } from '@/services/report-queue';

import {
  DEMO_HARVEST_BY_VISIT,
  DEMO_HISTORY_MONTH,
  DEMO_SEASON_TOTALS,
  DEMO_VISIT_HISTORY,
  HARVEST_BAR_MAX_HEIGHT,
  barHeights,
  demoHistoryRows,
  formatDecimal,
  historyCountLabelKey,
  historyFor,
  historyMonthOf,
  historyPeriodLabelKey,
  historyRowMeta,
  outsidePeriodCount,
  visitHistoryRows,
  type VisitHistoryEntry,
} from '../season-insights';

/**
 * Frame 11 (Core picker · Visits and analytics, node `5:23343`) is the picker's own season:
 * the month's totals, a small chart of what each visit brought home, and the visits themselves.
 *
 * The figures are the design's own demo — nothing aggregates anything yet — but the *rules*
 * the screen applies to them are real, and they are here: how a number is written in each
 * language, how a bar's height follows its value, and how the chart's tallest bar fills the
 * chart.
 */
describe('formatDecimal', () => {
  it('writes the frame’s own figure the way each language writes it', () => {
    // Frame 11 draws “4.5 kg” and “1.5”; Finnish writes the same numbers with a comma.
    expect(formatDecimal(4.5, 'en')).toBe('4.5');
    expect(formatDecimal(4.5, 'fi')).toBe('4,5');
    expect(formatDecimal(1.5, 'fi')).toBe('1,5');
  });

  it('keeps whole numbers whole', () => {
    expect(formatDecimal(3, 'en')).toBe('3');
    expect(formatDecimal(3, 'fi')).toBe('3');
  });

  it('refuses a figure that is not a finite number', () => {
    expect(() => formatDecimal(Number.NaN, 'en')).toThrow(RangeError);
    expect(() => formatDecimal(Number.POSITIVE_INFINITY, 'en')).toThrow(RangeError);
  });
});

describe('the visits this device has actually saved', () => {
  const report = (overrides: Partial<VisitReport> = {}): VisitReport => ({
    amountText: '1.3 kg',
    minutes: 52,
    recordedAt: '2026-08-28T10:55:00.000Z',
    speciesId: 'lingonberry',
    yieldRating: 4,
    zoneId: 'Z14',
    ...overrides,
  });

  it('reads a queued report back as the frame’s own row', () => {
    // The queue's zone id is the design's own identity for the zone (“Z14”); the row prints
    // the number the frame prints (“Zone 14”), and its visit is queued, not synced. The row
    // carries the instant it was saved at, which is what the period chips filter on.
    expect(visitHistoryRows([report()], 'en')).toEqual([
      {
        amountText: '1.3 kg',
        date: '28 Aug',
        minutes: 52,
        recordedAt: '2026-08-28T10:55:00.000Z',
        speciesId: 'lingonberry',
        status: 'queued',
        zoneNumber: '14',
      },
    ]);
  });

  it('lists them newest first, whatever order they were saved in', () => {
    const older = report({ recordedAt: '2026-08-20T09:00:00.000Z', zoneId: 'Z09' });
    const newer = report({ recordedAt: '2026-08-28T10:55:00.000Z', zoneId: 'Z14' });

    expect(visitHistoryRows([older, newer], 'en').map((row) => row.zoneNumber)).toEqual([
      '14',
      '09',
    ]);
  });

  it('has no rows for a device that has saved nothing', () => {
    expect(visitHistoryRows([], 'fi')).toEqual([]);
  });

  it('writes the row’s own line, with the harvest left out when there is none', () => {
    // The frame's newest row reads “28 Aug · 52 min · 1.3 kg”; a report saved with an empty
    // amount prints the rows it has rather than a placeholder weight.
    expect(historyRowMeta(visitHistoryRows([report()], 'en')[0]!)).toBe('28 Aug · 52 min · 1.3 kg');
    expect(historyRowMeta(visitHistoryRows([report({ amountText: '' })], 'en')[0]!)).toBe(
      '28 Aug · 52 min',
    );
    // Only the date is the language's; the harvest is what the picker typed, and rewriting
    // their own numbers would be editing their report rather than translating the app.
    expect(historyRowMeta(visitHistoryRows([report()], 'fi')[0]!)).toBe('28.8. · 52 min · 1.3 kg');
  });
});

describe('barHeights', () => {
  it('draws the frame’s own three bars, in proportion to the tallest', () => {
    // The frame's values are 1.5, 1.7 and 1.3 kg, and its bars are 62, 70 and 54 px tall: the
    // tallest fills the chart, and the others are their share of it.
    expect(barHeights([1.5, 1.7, 1.3])).toEqual([62, 70, 54]);
  });

  it('fills the chart with the tallest bar, whatever the values are', () => {
    expect(barHeights([1, 2, 4])).toEqual([18, 35, 70]);
    expect(barHeights([0.5])).toEqual([70]);
  });

  it('draws nothing for a visit with no recorded weight, and never a negative bar', () => {
    // The frame's own note: “Harvest rates use only visits with a recorded weight.”
    expect(barHeights([0, 1.5])).toEqual([0, 70]);
    expect(() => barHeights([-1, 1])).toThrow(RangeError);
  });

  it('draws nothing at all when no visit recorded a weight', () => {
    expect(barHeights([0, 0])).toEqual([0, 0]);
    expect(barHeights([])).toEqual([]);
  });

  it('refuses a value that is not a finite number', () => {
    expect(() => barHeights([1, Number.NaN])).toThrow(RangeError);
  });
});

describe('the demo season', () => {
  it('is the frame’s own month, and its own totals', () => {
    // “A good month in the forest.” — 4.5 kg over three visits, 3 zones, 3 h in the zone with
    // a 60 min median (nodes 5:23365-5:23380).
    expect(DEMO_SEASON_TOTALS).toEqual({
      harvestedKg: 4.5,
      kgPerHour: 1.5,
      medianMinutes: 60,
      stayHours: 3,
      zonesVisited: 3,
    });
  });

  it('draws the frame’s own three visits, with their own weights and dates', () => {
    expect(DEMO_HARVEST_BY_VISIT).toEqual([
      { date: '20 Aug', kilograms: 1.5 },
      { date: '24 Aug', kilograms: 1.7 },
      { date: '28 Aug', kilograms: 1.3 },
    ]);
  });

  it('tells the visit history in the same story as screens 07 to 10', () => {
    // The frame's newest visit is the walk this flow has been telling: Zone 14, 28 Aug, 52 min,
    // 1.3 kg — the same zone, the same window and the same weight screen 10 reports.
    expect(demoHistoryRows('en')[0]).toEqual({
      amountText: '1.3 kg',
      date: '28 Aug',
      minutes: 52,
      recordedAt: '2026-08-28T10:55:00.000Z',
      speciesId: 'lingonberry',
      status: 'queued',
      zoneNumber: '14',
    });
    expect(DEMO_VISIT_HISTORY.map((visit) => visit.status)).toEqual(['queued', 'synced', 'synced']);
  });

  it('writes its sample rows in the language, so Finnish reads the design’s own dates', () => {
    expect(demoHistoryRows('fi').map((row) => historyRowMeta(row))).toEqual([
      '28.8. · 52 min · 1,3 kg',
      '24.8. · 68 min · 1,7 kg',
      '20.8. · 60 min · 1,5 kg',
    ]);
  });

  it('fills the chart to the frame’s own height (node 5:23385)', () => {
    expect(HARVEST_BAR_MAX_HEIGHT).toBe(70);
  });
});

/**
 * The frame's two period chips, as a real choice (ADR-043). They filter the history the screen
 * shows: the first is the month the design's own sample belongs to, the second is everything the
 * phone holds. The rule that matters here is the one about silence — a visit outside the chosen
 * period is counted and said out loud, never dropped from the screen without a trace.
 */
describe('the period the frame’s chips select', () => {
  const row = (recordedAt: string, zoneNumber = '14'): VisitHistoryEntry => ({
    amountText: '1.3 kg',
    date: '28 Aug',
    minutes: 52,
    recordedAt,
    speciesId: 'lingonberry',
    status: 'queued',
    zoneNumber,
  });

  const AUGUST = row('2026-08-28T10:55:00.000Z');
  const SEPTEMBER = row('2026-09-14T09:20:00.000Z', '21');

  it('reads a visit’s month from the instant the app stored, in UTC like every date it prints', () => {
    expect(historyMonthOf('2026-08-28T10:55:00.000Z')).toBe('2026-08');
    // The first minute of a month belongs to that month on every phone, because the instant is
    // read the way `formatShortDate` reads it rather than in the device's own zone.
    expect(historyMonthOf('2026-09-01T00:30:00.000Z')).toBe('2026-09');
    // An unreadable instant is a mistake the caller has to see, not a row in some month.
    expect(() => historyMonthOf('yesterday')).toThrow(RangeError);
  });

  it('names the first period after the month the frame’s own three visits are in', () => {
    expect(DEMO_HISTORY_MONTH).toBe('2026-08');
    expect(DEMO_VISIT_HISTORY.map((visit) => historyMonthOf(visit.recordedAt))).toEqual([
      DEMO_HISTORY_MONTH,
      DEMO_HISTORY_MONTH,
      DEMO_HISTORY_MONTH,
    ]);
    // The chips' own words are the frame's two labels, in its own order (nodes 5:23349, 5:23354).
    expect(historyPeriodLabelKey('designMonth')).toBe('discover.season.period.month');
    expect(historyPeriodLabelKey('all')).toBe('discover.season.period.all');
  });

  it('keeps the design’s month, or everything the app holds', () => {
    const rows = [SEPTEMBER, AUGUST];

    expect(historyFor(rows, 'designMonth')).toEqual([AUGUST]);
    expect(historyFor(rows, 'all')).toEqual(rows);
    // The frame's own rows are all in its month, so the chip the design draws selected shows
    // its own three visits and nothing older is invented to fill it.
    expect(historyFor(demoHistoryRows('en'), 'designMonth')).toHaveLength(3);
  });

  it('counts what the period leaves out, so a visit is never hidden without a trace', () => {
    const rows = [SEPTEMBER, AUGUST];

    expect(outsidePeriodCount(rows, 'designMonth')).toBe(1);
    // Nothing is outside “all”, which is why the screen draws the line only under the month chip.
    expect(outsidePeriodCount(rows, 'all')).toBe(0);
    expect(outsidePeriodCount([AUGUST], 'designMonth')).toBe(0);
  });

  it('gives the sentence the singular or the plural it needs', () => {
    // The count line and the line about what is outside it are separate entries, because the
    // sentence belongs to the language (the same pair frame 13's waiting heading has).
    expect(historyCountLabelKey(0)).toBe('discover.season.history.shown.many');
    expect(historyCountLabelKey(1)).toBe('discover.season.history.shown.one');
    expect(historyCountLabelKey(4)).toBe('discover.season.history.shown.many');
  });
});
