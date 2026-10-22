import type { VisitReport } from '@/services/report-queue';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../zone';
import { reportZoneNumber, zoneReportCountLabelKey, zoneReportRows } from '../zone-reports';

/**
 * Frame 07's “See all 11” (node `5:23076`) names the zone's reports for the week. The design's
 * eleven are its own sample week, and there is no report stream — but the phone does hold the
 * reports the picker saved, and the rule for reading them back is this module's: which of them
 * belong to the zone being looked at, in which order, and what the count line says.
 *
 * The one thing that must never happen is a report from another zone being printed under this
 * zone's name — the rule `zoneDetailsFor` and `listingById` follow for their own records.
 */
const report = (overrides: Partial<VisitReport> = {}): VisitReport => ({
  amountText: '1.3 kg',
  minutes: 52,
  recordedAt: '2026-08-28T10:55:00.000Z',
  speciesId: 'lingonberry',
  yieldRating: 4,
  zoneId: 'Z14',
  ...overrides,
});

describe('the reports this phone holds for one zone', () => {
  it('reads the queue’s own zone id the way the frame prints it', () => {
    // The queue stores the design's identity for the zone (“Z14”); the frame prints the number
    // (“Zone 14”). One rule, so a row saved from the demo zone lands on the demo zone's list.
    expect(reportZoneNumber(report())).toBe('14');
    expect(reportZoneNumber(report({ zoneId: 'Z09' }))).toBe('09');
  });

  it('keeps the reports of the zone that was asked for, and writes them in the language', () => {
    const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);
    const rows = zoneReportRows([report({ zoneId: zone!.id })], zone!.number, 'en');

    expect(rows).toEqual([
      {
        amountText: '1.3 kg',
        date: '28 Aug',
        minutes: 52,
        recordedAt: '2026-08-28T10:55:00.000Z',
        speciesId: 'lingonberry',
        yieldRating: 4,
      },
    ]);
    // The day is the language's, as on every other row this app prints.
    expect(zoneReportRows([report()], '14', 'fi')[0]?.date).toBe('28.8.');
  });

  it('never prints another zone’s report under this zone’s name', () => {
    const other = report({ recordedAt: '2026-08-20T09:00:00.000Z', zoneId: 'Z09' });

    expect(zoneReportRows([other], '14', 'en')).toEqual([]);
    expect(zoneReportRows([other], '09', 'en')).toHaveLength(1);
  });

  it('lists them newest first, whatever order they were saved in', () => {
    const older = report({ recordedAt: '2026-08-20T09:00:00.000Z' });
    const newer = report({ recordedAt: '2026-09-14T09:20:00.000Z' });

    expect(zoneReportRows([older, newer], '14', 'en').map((row) => row.recordedAt)).toEqual([
      '2026-09-14T09:20:00.000Z',
      '2026-08-20T09:00:00.000Z',
    ]);
  });

  it('has nothing for a phone that saved no report for the zone', () => {
    expect(zoneReportRows([], '14', 'en')).toEqual([]);
  });

  it('gives the count line the singular or the plural it needs', () => {
    // The sentence belongs to the language (the same pair frame 13's waiting heading uses), so
    // the count line has two entries and no zero form of its own.
    expect(zoneReportCountLabelKey(0)).toBe('discover.zoneReports.held.many');
    expect(zoneReportCountLabelKey(1)).toBe('discover.zoneReports.held.one');
    expect(zoneReportCountLabelKey(4)).toBe('discover.zoneReports.held.many');
  });
});
