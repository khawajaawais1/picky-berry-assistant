import * as Location from 'expo-location';

import type { PositionAvailability, PositionFix, PositionSource } from './types';

/**
 * The device behind the position port: `expo-location`, and the app's own reading of what it says.
 *
 * This is the only file in the app that touches the platform's location API, which is the point of
 * the seam: the hook that gates capture (`src/hooks/use-device-position.ts`) is tested without a
 * device, and the visit domain is tested with scripted fixes.
 *
 * What it asks for, in the owner's own words (2026-10-12): **the foreground only.** The permission
 * is the platform's “while the app is open” one, the watch is the foreground one, and the
 * background task API is never used — background location is a separate permission with its own
 * store declarations on both platforms, and it is not decided (PROJECT.md, open questions).
 *
 * What it never does: log a fix, keep one, or send one anywhere. A fix is handed to the caller and
 * forgotten here (SECURITY.md §11, ADR-045).
 */

/**
 * The app's own reading of a platform fix — one function, so every caller sees the same shape and
 * the off-platform tests can assert it without a device.
 */
export function toPositionFix(location: Location.LocationObject): PositionFix {
  const { accuracy, latitude, longitude } = location.coords;

  return {
    accuracyMeters: typeof accuracy === 'number' ? accuracy : null,
    at: location.timestamp,
    latitude,
    longitude,
  };
}

/**
 * The platform's answer, in the app's words.
 *
 * `granted` and `denied` are the platform's two real answers. Anything else — including the
 * platform declining to decide — is `unavailable`: the only safe reading of “not a yes” is that
 * this device has no position to give the app, and reading it as either permission would be the
 * app claiming something nobody said.
 */
function availabilityOf(response: { status: string }): PositionAvailability {
  if (response.status === 'granted') return 'granted';
  if (response.status === 'denied') return 'denied';
  return 'unavailable';
}

export function createDevicePositionSource(): PositionSource {
  return {
    async requestAvailability() {
      return availabilityOf(await Location.requestForegroundPermissionsAsync());
    },

    watch({ onFailure, onFix }) {
      let stopped = false;
      let subscription: Location.LocationSubscription | null = null;

      Location.watchPositionAsync(
        // `High` rather than the platform's default (`Balanced`, ~100 m): the thing the app does
        // with a fix is decide *which zone* the picker is in, and a zone is a small patch of
        // forest — 100 m of slop would put them in a zone they are not in. The cadence (how often,
        // how far between fixes, and what the battery may cost) is the app's own choice awaiting
        // confirmation and is recorded as such (docs/demo-and-stand-ins.md, class D).
        { accuracy: Location.Accuracy.High },
        (location) => {
          if (!stopped) onFix(toPositionFix(location));
        },
        // The platform's own error channel. Its message is deliberately not printed: it can carry
        // a device's details, and nothing in this app logs a position or a location error.
        () => {
          if (!stopped) onFailure();
        },
      )
        .then((created) => {
          if (stopped) {
            // The caller stopped before the platform finished subscribing — the promise resolves
            // after the stop — so the subscription is removed as soon as it exists.
            created.remove();
            return;
          }
          subscription = created;
        })
        .catch(() => {
          if (!stopped) onFailure();
        });

      return () => {
        stopped = true;
        subscription?.remove();
        subscription = null;
      };
    },
  };
}

/**
 * The app's own source. A module singleton rather than one per call, so the object identity a hook
 * effect depends on is stable across renders.
 */
export const positionSource: PositionSource = createDevicePositionSource();
