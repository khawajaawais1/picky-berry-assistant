import type { VisitReport } from '@/services/report-queue';

import { queuedReportRows, waitingLabelKey } from '../queued-reports';

/**
 * Frame 13 (Account and offline · Downloads, node `5:23530`) is the design's sync centre: what is
 * on the phone and what still has to reach the server.
 *
 * The half the app can be strictly true about is the queue, so that is what this module prepares:
 * the reports this device is holding, as the frame's own card prints them.
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

describe('queuedReportRows', () => {
  it('reads a queued report back as the frame’s own row', () => {
    expect(queuedReportRows([report()], 'en')).toEqual([
      {
        amountText: '1.3 kg',
        date: '28 Aug',
        minutes: 52,
        speciesId: 'lingonberry',
        yieldRating: 4,
        zoneNumber: '14',
      },
    ]);
  });

  it('lists what is still waiting oldest first, which is the order it will be sent in', () => {
    const older = report({ recordedAt: '2026-08-20T09:00:00.000Z', zoneId: 'Z09' });
    const newer = report({ recordedAt: '2026-08-28T10:55:00.000Z', zoneId: 'Z14' });

    expect(queuedReportRows([newer, older], 'en').map((row) => row.zoneNumber)).toEqual([
      '09',
      '14',
    ]);
  });

  it('writes the row’s day in the language, and leaves the harvest as it was typed', () => {
    expect(queuedReportRows([report()], 'fi')[0]).toMatchObject({
      amountText: '1.3 kg',
      date: '28.8.',
    });
  });

  it('has no rows for a device that is holding nothing', () => {
    expect(queuedReportRows([], 'en')).toEqual([]);
  });
});

describe('waitingLabelKey', () => {
  it('counts one report and several differently, because the frame’s line is a sentence', () => {
    // The frame prints “Waiting to sync · 1 report”; the plural is the same sentence with the
    // count as its own value, so the language can inflect it.
    expect(waitingLabelKey(1)).toBe('offline.waiting.one');
    expect(waitingLabelKey(0)).toBe('offline.waiting.many');
    expect(waitingLabelKey(3)).toBe('offline.waiting.many');
  });
});
