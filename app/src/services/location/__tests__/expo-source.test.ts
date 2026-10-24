import { PermissionStatus } from 'expo';
import * as Location from 'expo-location';

import { createDevicePositionSource, toPositionFix } from '../expo-source';

/**
 * The device behind the position port (ADR-045). What is asserted here is the half of the seam
 * that is the app's own: which platform answer becomes which of the app's, what a fix carries,
 * that the **foreground** watch is the one used, and that a stop really stops. The platform's own
 * answers are the mock's, so no device is needed — which is the point of a port.
 */
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
}));

const request = jest.mocked(Location.requestForegroundPermissionsAsync);
const watch = jest.mocked(Location.watchPositionAsync);
const startUpdates = jest.mocked(Location.startLocationUpdatesAsync);

function permission(status: PermissionStatus): Location.LocationPermissionResponse {
  return {
    canAskAgain: true,
    expires: 'never',
    granted: status === PermissionStatus.GRANTED,
    status,
  };
}

function position(coords: Partial<Location.LocationObjectCoords>): Location.LocationObject {
  return {
    coords: {
      accuracy: 12,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude: 62.24,
      longitude: 25.76,
      speed: null,
      ...coords,
    },
    timestamp: 1_780_000_000_000,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toPositionFix', () => {
  it('carries the coordinates, the platform’s own instant and its stated accuracy', () => {
    expect(toPositionFix(position({}))).toEqual({
      accuracyMeters: 12,
      at: 1_780_000_000_000,
      latitude: 62.24,
      longitude: 25.76,
    });
  });

  it('says nothing about accuracy when the platform says nothing', () => {
    // A made-up accuracy is a claim about a fix the app cannot support; `null` is the honest
    // answer and the screens that show it will have to say “accuracy not stated”.
    expect(
      toPositionFix(position({ accuracy: null as unknown as number })).accuracyMeters,
    ).toBeNull();
  });
});

describe('the device position source', () => {
  it('answers with the app’s own word for a granted permission', async () => {
    request.mockResolvedValue(permission(PermissionStatus.GRANTED));

    await expect(createDevicePositionSource().requestAvailability()).resolves.toBe('granted');
  });

  it('answers a refusal as a refusal', async () => {
    request.mockResolvedValue(permission(PermissionStatus.DENIED));

    await expect(createDevicePositionSource().requestAvailability()).resolves.toBe('denied');
  });

  it('never reads an answer that is neither granted nor denied as a yes', async () => {
    // The platform saying it has not decided — or anything else — is not a permission: the only
    // safe reading is that this device has no location to give the app.
    request.mockResolvedValue(permission(PermissionStatus.UNDETERMINED));

    await expect(createDevicePositionSource().requestAvailability()).resolves.toBe('unavailable');
  });

  it('rejects when the platform will not answer at all, rather than inventing a no', async () => {
    // A refusal and a failure are different facts about the device, and the caller (the
    // position hook) reports the second one as a failure: swallowing it here would present a
    // broken platform as a user who said no.
    request.mockRejectedValue(new Error('no location module on this platform'));

    await expect(createDevicePositionSource().requestAvailability()).rejects.toThrow(
      'no location module on this platform',
    );
  });

  it('watches in the foreground at the decided budget, hands each fix over as the app’s own shape, and stops when told', async () => {
    const remove = jest.fn();
    watch.mockResolvedValue({ remove } as unknown as Location.LocationSubscription);

    const onFix = jest.fn();
    const onFailure = jest.fn();
    const stop = createDevicePositionSource().watch({ onFailure, onFix });

    expect(watch).toHaveBeenCalledTimes(1);
    const [options, callback] = watch.mock.calls[0]!;
    // ADR-063's budget, asserted as a whole: high accuracy, a 50 m distance filter, and a 60 s
    // time ceiling on Android. A change here is a decision, not a tweak.
    expect(options).toEqual({
      accuracy: Location.Accuracy.High,
      distanceInterval: 50,
      timeInterval: 60_000,
    });
    // The background task API is never the one used: this app asks for the least that lets it
    // read a position while the screen is open (ADR-045, and the owner's answer of 2026-10-12).
    expect(startUpdates).not.toHaveBeenCalled();

    callback(position({}));
    expect(onFix).toHaveBeenCalledWith({
      accuracyMeters: 12,
      at: 1_780_000_000_000,
      latitude: 62.24,
      longitude: 25.76,
    });

    stop();
    // The platform's subscription may still be in flight when the caller stops; the wait is
    // settled before the removal is asserted.
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('reports a watch that fails to start, and one that fails while it is running', async () => {
    watch.mockRejectedValueOnce(new Error('location services are off'));
    const onFailure = jest.fn();
    createDevicePositionSource().watch({ onFailure, onFix: jest.fn() });
    await Promise.resolve();
    await Promise.resolve();
    expect(onFailure).toHaveBeenCalledTimes(1);

    // The platform's own error channel, which is the second way a watch can stop working: its
    // message is deliberately not printed anywhere — a platform error can carry a device's own
    // details, and nothing here logs (SECURITY.md §11).
    watch.mockResolvedValue({ remove: jest.fn() } as unknown as Location.LocationSubscription);
    const laterFailure = jest.fn();
    createDevicePositionSource().watch({ onFailure: laterFailure, onFix: jest.fn() });
    const errorHandler = watch.mock.calls[1]![2];
    errorHandler?.('location services were turned off');
    expect(laterFailure).toHaveBeenCalledTimes(1);
  });

  it('stays silent after it has been stopped, even when the platform answers late', async () => {
    // The two answers the platform can still give after the caller stopped: its own error
    // channel, and the subscription its promise creates. A stopped watch is nobody's — reporting
    // an error would tell a screen that has gone that something is wrong, and keeping the
    // subscription would leave a watch running that no one can stop.
    let settle: (value: Location.LocationSubscription) => void = () => undefined;
    watch.mockReturnValue(
      new Promise<Location.LocationSubscription>((resolve) => (settle = resolve)),
    );

    const onFailure = jest.fn();
    const stop = createDevicePositionSource().watch({ onFailure, onFix: jest.fn() });

    const [, , errorHandler] = watch.mock.calls[0]!;
    stop();

    errorHandler?.('location services were turned off');
    expect(onFailure).not.toHaveBeenCalled();

    const remove = jest.fn();
    settle({ remove } as unknown as Location.LocationSubscription);
    await Promise.resolve();
    await Promise.resolve();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does not hand out a fix after it has been stopped', async () => {
    const remove = jest.fn();
    watch.mockResolvedValue({ remove } as unknown as Location.LocationSubscription);

    const onFix = jest.fn();
    const stop = createDevicePositionSource().watch({ onFailure: jest.fn(), onFix });
    await Promise.resolve();

    stop();
    // The platform's own callback, taken from the call it was given in: a fix that arrives after
    // the stop belongs to nobody, and handing it over would resurrect a screen that has gone.
    watch.mock.calls[0]![1](position({}));

    expect(onFix).not.toHaveBeenCalled();
  });
});
