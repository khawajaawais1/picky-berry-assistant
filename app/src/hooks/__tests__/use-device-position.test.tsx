import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CONSENT_STORAGE_KEY } from '@/services/privacy-consent';
import type { PositionFix, PositionHandlers, PositionSource } from '@/services/location';

import { useDevicePosition } from '../use-device-position';

/**
 * The gate between the device and the app (ADR-045): position is read only when the picker's own
 * consent record says so, and the platform's answer is reported as what it is — never folded into
 * a yes. What is asserted below is the whole matrix, because each cell is a promise the app makes
 * to a user: consent off means nothing is read; a refusal is a refusal; a failure is not a refusal;
 * withdrawing consent stops a watch that is running and drops the fix it was holding.
 */
const CONSENT_ON = JSON.stringify({
  visitTracking: true,
  decidedAt: '2026-10-12T09:00:00.000Z',
});
const CONSENT_OFF = JSON.stringify({
  visitTracking: false,
  decidedAt: '2026-10-12T09:00:00.000Z',
});

const FIX: PositionFix = {
  accuracyMeters: 12,
  at: 1_780_000_000_000,
  latitude: 62.24,
  longitude: 25.76,
};

type FakeSource = {
  fixes: PositionHandlers | null;
  requests: jest.Mock;
  source: PositionSource;
  stops: number;
  watches: jest.Mock;
};

function fakeSource(availability: 'granted' | 'denied' | 'unavailable' | 'throws'): FakeSource {
  const fake: FakeSource = {
    fixes: null,
    requests: jest.fn(async () => {
      if (availability === 'throws') throw new Error('the platform would not answer');
      return availability;
    }),
    source: {} as PositionSource,
    stops: 0,
    watches: jest.fn(),
  };

  fake.watches.mockImplementation((handlers: PositionHandlers) => {
    fake.fixes = handlers;
    return () => {
      fake.fixes = null;
      fake.stops += 1;
    };
  });
  fake.source = { requestAvailability: fake.requests, watch: fake.watches };

  return fake;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useDevicePosition', () => {
  it('reads nothing while the consent record is still being read', async () => {
    // Unknown consent is not consent: the hook must not ask the platform anything until the
    // record has answered, or a fresh install would be asked for a permission the user has not
    // agreed to yet.
    let resolve: (value: string | null) => void = () => undefined;
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockReturnValueOnce(new Promise<string | null>((settle) => (resolve = settle)));

    const fake = fakeSource('granted');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    expect(result.current).toEqual({ fix: null, status: 'waiting' });
    expect(fake.requests).not.toHaveBeenCalled();

    await act(async () => resolve(null));
  });

  it('reads nothing when the picker has never decided', async () => {
    const fake = fakeSource('granted');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('off'));
    expect(fake.requests).not.toHaveBeenCalled();
    expect(fake.watches).not.toHaveBeenCalled();
  });

  it('reads nothing when the picker said no to tracking', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_OFF);

    const fake = fakeSource('granted');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('off'));
    expect(fake.requests).not.toHaveBeenCalled();
    expect(fake.watches).not.toHaveBeenCalled();
  });

  it('reads nothing when the consent record cannot be read at all', async () => {
    // An unreadable record is an unanswered consent. The hook's own caller reads the consent
    // hook's `error` to say so; this hook's job is to not read position on a guess.
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('device storage is unreadable'));

    const fake = fakeSource('granted');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('off'));
    expect(fake.requests).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('asks once, watches once, and hands the newest fix over as it arrives', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const fake = fakeSource('granted');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('tracking'));
    expect(fake.requests).toHaveBeenCalledTimes(1);
    expect(fake.watches).toHaveBeenCalledTimes(1);
    // Nothing has been observed yet, so nothing is claimed about where the picker is.
    expect(result.current.fix).toBeNull();

    await act(async () => fake.fixes?.onFix(FIX));

    expect(result.current).toEqual({ fix: FIX, status: 'tracking' });
  });

  it('reports the platform’s refusal as a refusal, and watches nothing', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const fake = fakeSource('denied');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(fake.watches).not.toHaveBeenCalled();
  });

  it('reports a device with no location to give as unavailable', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const fake = fakeSource('unavailable');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(fake.watches).not.toHaveBeenCalled();
  });

  it('reports a platform that would not answer as a failure, not as a no', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const fake = fakeSource('throws');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(fake.watches).not.toHaveBeenCalled();
  });

  it('reports a platform whose watch throws as a failure, not as a refusal', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const source: PositionSource = {
      requestAvailability: jest.fn(async () => 'granted'),
      // A platform that throws instead of reporting a failure is still a failure (ADR-045:
      // `denied` is a refusal, `unavailable` is a device with nothing, `failed` is neither).
      watch: jest.fn(() => {
        throw new Error('no location watcher on this platform');
      }),
    };

    const { result } = await renderHook(() => useDevicePosition({ source }));

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.fix).toBeNull();
  });

  it('drops the fix it was holding when a watch fails while it is running', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const fake = fakeSource('granted');
    const { result } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('tracking'));
    await act(async () => fake.fixes?.onFix(FIX));
    expect(result.current.fix).toEqual(FIX);

    // A watch that stopped working must not leave the app claiming the last place it saw the
    // picker: that fix is no longer evidence of where they are.
    await act(async () => fake.fixes?.onFailure());

    expect(result.current).toEqual({ fix: null, status: 'failed' });
  });

  it('reads nothing on the screen that opens after the picker withdraws consent', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const before = fakeSource('granted');
    const { result, unmount } = await renderHook(() =>
      useDevicePosition({ source: before.source }),
    );

    await waitFor(() => expect(result.current.status).toBe('tracking'));
    await unmount();
    // Leaving the screen is what stops the watch: the record is read on mount, so a withdrawal
    // written by the privacy screen takes effect the next time something asks to read position.
    expect(before.stops).toBe(1);

    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_OFF);
    const after = fakeSource('granted');
    const { result: withdrawn } = await renderHook(() =>
      useDevicePosition({ source: after.source }),
    );

    await waitFor(() => expect(withdrawn.current.status).toBe('off'));
    expect(after.requests).not.toHaveBeenCalled();
    expect(after.watches).not.toHaveBeenCalled();
  });

  it('stops watching when the screen that asked for it goes away', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_ON);

    const fake = fakeSource('granted');
    const { result, unmount } = await renderHook(() => useDevicePosition({ source: fake.source }));

    await waitFor(() => expect(result.current.status).toBe('tracking'));
    await unmount();

    expect(fake.stops).toBe(1);
    expect(fake.fixes).toBeNull();
  });
});
