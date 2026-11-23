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
 * What it never does: log a fix, keep one, or send one anywhere. A fix is handed to current
 * consumers and forgotten here (SECURITY.md §11, ADR-045). When Discover and the visit tracker are
 * both mounted, one native watch fans out to both and stops after the final consumer leaves
 * (ADR-070), avoiding duplicate GPS work without retaining a history.
 */

/**
 * The foreground watch's budget, decided 2026-10-24 (ADR-063).
 *
 * **High accuracy.** The platform's default (`Balanced`, roughly 100 m) is close enough to a
 * kilometre-scale zone's edge to put a picker in the patch next door; `Highest` buys no zone-level
 * answer for the battery it costs.
 *
 * **A fix at most once a minute, and only after 50 m of movement.** The distance filter keeps a
 * stay from becoming a stream; the 60 s ceiling keeps a moving walk from waking the radio more
 * often than that on Android. At walking pace 50 m is about 36 s, so a five-minute stay still
 * yields several fixes — enough to cross a kilometre-scale boundary, and far fewer than the
 * platform's `High` default (a 2 s interval).
 *
 * Both are **limits, not a promise of a periodic fix**: a picker who stands still gets no new fix,
 * which the tracker already tolerates (a visit stays open until an exit, and no ticker finalises
 * it — ADR-046), and someone who enters a zone and stops within 50 m of its edge — or leaves one
 * and stops just outside — may be seen only on their next movement. `timeInterval` is
 * **Android-only**; iOS applies `distanceInterval` alone,
 * so a walking iPhone reports every ~50 m rather than at most once a minute. Adding a poller to
 * even those out would be the ticker ADR-046 deliberately kept out of the tracker.
 */
export const POSITION_WATCH_BUDGET = {
  accuracy: Location.Accuracy.High,
  distanceIntervalMeters: 50,
  timeIntervalMs: 60_000,
} as const;

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
  const watchers = new Set<Parameters<PositionSource['watch']>[0]>();
  let requestingAvailability: Promise<PositionAvailability> | null = null;
  let subscription: Location.LocationSubscription | null = null;
  let starting: Promise<Location.LocationSubscription> | null = null;
  let generation = 0;

  const broadcastFix = (location: Location.LocationObject) => {
    const fix = toPositionFix(location);
    for (const watcher of watchers) watcher.onFix(fix);
  };

  const broadcastFailure = () => {
    for (const watcher of watchers) watcher.onFailure();
  };

  const startWatch = () => {
    if (subscription !== null || starting !== null) return;

    const startedFor = ++generation;
    starting = Location.watchPositionAsync(
      {
        accuracy: POSITION_WATCH_BUDGET.accuracy,
        distanceInterval: POSITION_WATCH_BUDGET.distanceIntervalMeters,
        timeInterval: POSITION_WATCH_BUDGET.timeIntervalMs,
      },
      (location) => {
        if (startedFor === generation) broadcastFix(location);
      },
      () => {
        if (startedFor === generation) broadcastFailure();
      },
    );
    starting
      .then((created) => {
        if (startedFor !== generation || watchers.size === 0) {
          created.remove();
          return;
        }
        subscription = created;
      })
      .catch(() => {
        if (startedFor === generation && watchers.size > 0) broadcastFailure();
      })
      .finally(() => {
        if (startedFor === generation) starting = null;
      });
  };

  return {
    requestAvailability() {
      if (requestingAvailability === null) {
        requestingAvailability = Location.requestForegroundPermissionsAsync()
          .then(availabilityOf)
          .finally(() => {
            requestingAvailability = null;
          });
      }
      return requestingAvailability;
    },

    watch({ onFailure, onFix }) {
      const watcher = { onFailure, onFix };
      let stopped = false;
      watchers.add(watcher);
      startWatch();

      return () => {
        if (stopped) return;
        stopped = true;
        watchers.delete(watcher);

        if (watchers.size === 0) {
          generation += 1;
          subscription?.remove();
          subscription = null;
          // A pending subscription is removed by the generation check when it resolves. Clearing
          // this handle lets a later, genuinely new consumer start its own foreground watch.
          starting = null;
        }
      };
    },
  };
}

/**
 * The app's own source. A module singleton rather than one per call, so the object identity a hook
 * effect depends on is stable across renders.
 */
export const positionSource: PositionSource = createDevicePositionSource();
