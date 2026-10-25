import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEMO_SEED_STORAGE_KEY, seedDemoData } from '../demo-seed';
import { enqueueReport, readReportQueue } from '../report-queue';
import { readSavedZones } from '../saved-zones';

/**
 * The preview seed is deliberately narrow: only a native, non-production first launch with an
 * empty plan and queue. The tests hold each gate and the one-time marker, because a seed that
 * overwrites a picker's records or reappears after sign-out is worse than an empty screen.
 */
describe('seedDemoData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('seeds two saved spots and two queued reports in a preview build', async () => {
    await expect(seedDemoData({ environment: 'preview', platform: 'ios' })).resolves.toBe(true);

    expect(await readSavedZones()).toHaveLength(2);
    expect(await readReportQueue()).toHaveLength(2);
    expect(await AsyncStorage.getItem(DEMO_SEED_STORAGE_KEY)).toBe('1');
  });

  it('runs only once, so signing out does not bring the samples back', async () => {
    await seedDemoData({ environment: 'preview', platform: 'ios' });
    await AsyncStorage.removeItem('picky.saved-zones.v1');
    await AsyncStorage.removeItem('picky.report-queue.v1');

    await expect(seedDemoData({ environment: 'preview', platform: 'ios' })).resolves.toBe(false);

    expect(await readSavedZones()).toEqual([]);
    expect(await readReportQueue()).toEqual([]);
  });

  it('never seeds a production build', async () => {
    await expect(seedDemoData({ environment: 'production', platform: 'ios' })).resolves.toBe(false);

    expect(await readSavedZones()).toEqual([]);
    expect(await readReportQueue()).toEqual([]);
  });

  it('never seeds the web export or the browser harness', async () => {
    await expect(seedDemoData({ environment: 'preview', platform: 'web' })).resolves.toBe(false);

    expect(await readSavedZones()).toEqual([]);
    expect(await readReportQueue()).toEqual([]);
  });

  it('does not overwrite records the picker already has', async () => {
    await enqueueReport({
      amountText: '0.4',
      minutes: 20,
      recordedAt: '2026-10-01T12:00:00Z',
      speciesId: 'bilberry',
      yieldRating: 2,
      zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    });

    await expect(seedDemoData({ environment: 'preview', platform: 'ios' })).resolves.toBe(false);

    expect(await readSavedZones()).toEqual([]);
    expect(await readReportQueue()).toHaveLength(1);
  });
});
