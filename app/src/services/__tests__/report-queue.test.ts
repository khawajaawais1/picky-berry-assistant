import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  REPORT_QUEUE_STORAGE_KEY,
  clearReportQueue,
  enqueueReport,
  readReportQueue,
} from '../report-queue';

/**
 * The queue behind frame 10's “Save report offline”: the picker's own report, kept on the
 * device until something can carry it to the server.
 *
 * It is a queue rather than a screen's state because the design promises exactly that
 * (“Your visit and report stay on this phone and sync when you're online”), and because the
 * offline slice's whole point is that capture does not need the network (ADR-005).
 */
const REPORT = {
  amountText: '1.3 kg',
  minutes: 52,
  recordedAt: '2026-10-09T10:55:00.000Z',
  speciesId: 'lingonberry',
  yieldRating: 4,
  zoneId: 'Z14',
} as const;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the report queue', () => {
  it('is empty until the picker has saved something', async () => {
    await expect(readReportQueue()).resolves.toEqual([]);
  });

  it('keeps its own version, so a changed shape is a new key and not a misread old one', () => {
    expect(REPORT_QUEUE_STORAGE_KEY).toBe('picky.report-queue.v1');
  });

  it('keeps a saved report on the device, with the time it was recorded', async () => {
    const queued = await enqueueReport(REPORT);

    expect(queued).toEqual([REPORT]);
    await expect(readReportQueue()).resolves.toEqual([REPORT]);
  });

  it('keeps the queue in the order it was filled', async () => {
    const later = { ...REPORT, recordedAt: '2026-10-09T12:30:00.000Z', zoneId: 'Z09' };

    await enqueueReport(REPORT);
    const queued = await enqueueReport(later);

    expect(queued.map((report) => report.zoneId)).toEqual(['Z14', 'Z09']);
  });

  it('refuses a report the app could not have made up itself', async () => {
    // Validated where it enters storage: the rating is the design's five options, the zone
    // and the species are what a zone source will supply, and the time is ISO-8601.
    await expect(enqueueReport({ ...REPORT, yieldRating: 6 as never })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, yieldRating: 0 as never })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, yieldRating: 4.5 as never })).rejects.toThrow(
      RangeError,
    );
    await expect(enqueueReport({ ...REPORT, zoneId: '' })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, speciesId: '' })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, recordedAt: 'yesterday' })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, amountText: 3 as never })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, minutes: -1 })).rejects.toThrow(RangeError);
    await expect(enqueueReport({ ...REPORT, minutes: 52.5 })).rejects.toThrow(RangeError);

    // A refused report writes nothing: the queue is not left half-filled.
    await expect(readReportQueue()).resolves.toEqual([]);
  });

  it('reads a value it cannot understand as an empty queue, never as a report', async () => {
    await AsyncStorage.setItem(REPORT_QUEUE_STORAGE_KEY, 'not json');
    await expect(readReportQueue()).resolves.toEqual([]);

    await AsyncStorage.setItem(REPORT_QUEUE_STORAGE_KEY, JSON.stringify([{ zoneId: 'Z14' }]));
    await expect(readReportQueue()).resolves.toEqual([]);

    await AsyncStorage.setItem(REPORT_QUEUE_STORAGE_KEY, JSON.stringify('nope'));
    await expect(readReportQueue()).resolves.toEqual([]);
  });

  it('drops the entries it cannot read but keeps the ones it can', async () => {
    await enqueueReport(REPORT);
    await AsyncStorage.setItem(
      REPORT_QUEUE_STORAGE_KEY,
      JSON.stringify([...(await readReportQueue()), { zoneId: 'Z09' }]),
    );

    await expect(readReportQueue()).resolves.toEqual([REPORT]);
  });

  it('can be emptied, which is the user’s way out and what signing out calls', async () => {
    await enqueueReport(REPORT);

    await clearReportQueue();

    await expect(readReportQueue()).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(REPORT_QUEUE_STORAGE_KEY)).resolves.toBeNull();
  });

  it('rejects a write that fails, so a screen never claims a report was kept', async () => {
    const setItem = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('device storage is full'));

    await expect(enqueueReport(REPORT)).rejects.toThrow('device storage is full');

    setItem.mockRestore();
  });
});
