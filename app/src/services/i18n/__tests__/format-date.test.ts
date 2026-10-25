import { formatLongDate, formatShortDate } from '../format-date';

/**
 * The design writes a day as a day and a month (“28 Aug”), and Finnish writes the same day
 * numerically (“28.8.”). Two features print one — frame 11's visit history and frame 13's queued
 * report — which is why the form is a service rather than a screen's private helper.
 */
describe('formatShortDate', () => {
  it('writes a day the way each language writes it', () => {
    expect(formatShortDate('2026-08-28T10:55:00.000Z', 'en')).toBe('28 Aug');
    expect(formatShortDate('2026-08-28T10:55:00.000Z', 'fi')).toBe('28.8.');
  });

  it('writes every month the design writes, and no leading zero', () => {
    expect(formatShortDate('2026-01-01T00:00:00.000Z', 'en')).toBe('1 Jan');
    expect(formatShortDate('2026-12-31T23:59:00.000Z', 'en')).toBe('31 Dec');
    expect(formatShortDate('2026-01-05T00:00:00.000Z', 'fi')).toBe('5.1.');
    expect(formatShortDate('2026-11-09T00:00:00.000Z', 'fi')).toBe('9.11.');
  });

  it('reads the instant in UTC, so one stored report prints one day everywhere', () => {
    // 23:30 UTC is already the next day in Helsinki; the stored instant is the data, and the
    // app prints the day it belongs to rather than the phone's own calendar.
    expect(formatShortDate('2026-08-28T23:30:00.000Z', 'fi')).toBe('28.8.');
  });

  it('refuses an instant it cannot read as one', () => {
    expect(() => formatShortDate('yesterday', 'en')).toThrow(RangeError);
    expect(() => formatShortDate('', 'fi')).toThrow(RangeError);
  });
});

/**
 * The second form the design writes: the full day with its year, because a listing says which day
 * its berries were picked and a year matters there. Frames 16 and 17 print “28 August 2026”, and
 * the marketplace is where the app first needs a year at all.
 */
describe('formatLongDate', () => {
  it('writes the day, the month’s full name and the year in English', () => {
    expect(formatLongDate('2026-08-28T10:55:00.000Z', 'en')).toBe('28 August 2026');
    expect(formatLongDate('2026-01-01T00:00:00.000Z', 'en')).toBe('1 January 2026');
  });

  it('writes the day numerically with its year in Finnish', () => {
    // Finnish writes the full date numerically (“28.8.2026”); the English month name has no
    // Finnish counterpart the design uses anywhere.
    expect(formatLongDate('2026-08-28T10:55:00.000Z', 'fi')).toBe('28.8.2026');
    expect(formatLongDate('2026-01-05T00:00:00.000Z', 'fi')).toBe('5.1.2026');
  });

  it('reads the instant in UTC, like the short form does', () => {
    expect(formatLongDate('2026-08-28T23:30:00.000Z', 'fi')).toBe('28.8.2026');
  });

  it('refuses an instant it cannot read as one', () => {
    expect(() => formatLongDate('', 'en')).toThrow(RangeError);
  });
});
