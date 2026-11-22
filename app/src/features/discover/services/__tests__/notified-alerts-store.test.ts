import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  NOTIFIED_ALERTS_STORAGE_KEY,
  readNotifiedAlerts,
  recordNotifiedAlerts,
} from '../notified-alerts-store';

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** When this phone last showed each zone and berry, so it does not show it again too soon. */
describe('the notified-alerts record', () => {
  it('is empty before anything was shown, and for a value it cannot read', async () => {
    expect(await readNotifiedAlerts()).toEqual({});

    await AsyncStorage.setItem(NOTIFIED_ALERTS_STORAGE_KEY, '{not json');
    expect(await readNotifiedAlerts()).toEqual({});

    await AsyncStorage.setItem(NOTIFIED_ALERTS_STORAGE_KEY, JSON.stringify({ a: 3, b: 'x' }));
    expect(await readNotifiedAlerts()).toEqual({});
  });

  it('keeps what was shown, and forgets what is past the cooldown', async () => {
    await AsyncStorage.setItem(
      NOTIFIED_ALERTS_STORAGE_KEY,
      JSON.stringify({ old: '2026-08-01T09:00:00.000Z', kept: '2026-08-14T09:00:00.000Z' }),
    );

    await recordNotifiedAlerts(['z1:bilberry'], new Date('2026-08-15T09:00:00.000Z'));

    expect(await readNotifiedAlerts()).toEqual({
      kept: '2026-08-14T09:00:00.000Z',
      'z1:bilberry': '2026-08-15T09:00:00.000Z',
    });
  });
});
