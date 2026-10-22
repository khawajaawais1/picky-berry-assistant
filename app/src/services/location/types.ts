/**
 * The position seam's own vocabulary (`src/services/location/`): what a fix is, what a platform can
 * answer about permission, and what the port promises.
 *
 * It is a separate module with no runtime imports on purpose: the app's pure domain may speak these
 * types (`features/visits` joins them to the visit lifecycle) without dragging a native module into
 * a unit test. Only `expo-source.ts` touches the platform.
 *
 * Read [ADR-045](../../../docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md) for why
 * this is a port and what the app is allowed to do with what comes out of it.
 */

/**
 * One observation of where the device is — **in memory, for as long as a screen is asking**.
 *
 * There is no field here for a trail, and that is the decision rather than the state of the code:
 * the app derives the thing it needs (which zone is the picker in) at the moment a fix arrives and
 * keeps no sequence of them (ADR-010, ADR-045). Nothing writes a fix to storage, and nothing logs
 * one (SECURITY.md §11).
 */
export type PositionFix = {
  latitude: number;
  longitude: number;
  /**
   * The radius the platform states its own confidence within, or `null` when it states none — a
   * made-up accuracy would be a claim about a fix the app cannot support.
   */
  accuracyMeters: number | null;
  /** Epoch milliseconds the platform observed the fix at, not when the app read it. */
  at: number;
};

/**
 * What a platform is willing to do, in the app's own words.
 *
 * - `granted` — the app may read the picker's position while a screen is open.
 * - `denied` — the user (or the platform's policy) said no. The app must not ask again in a loop.
 * - `unavailable` — this device has no position to give the app, or the platform would not say.
 *
 * This app asks for nothing else: background location is a separate permission on both platforms
 * and is not decided (PROJECT.md, open questions).
 */
export type PositionAvailability = 'granted' | 'denied' | 'unavailable';

export type PositionHandlers = {
  /** A new observation, which replaces the last one: fixes are not accumulated. */
  onFix: (fix: PositionFix) => void;
  /**
   * The watch stopped working — the platform's location service went away, permission was revoked,
   * or the subscription could not be created. It is a **failure**, never a refusal: the caller
   * reports it as such and drops any fix it was holding, because a fix from a watch that has died
   * is no longer evidence of where anyone is.
   */
  onFailure: () => void;
};

/**
 * Where fixes come from. The app's screens and hooks depend on this and never on `expo-location`,
 * which is what makes the gate in `use-device-position` testable and what lets a device-free test
 * drive the visit domain with scripted fixes.
 */
export type PositionSource = {
  /**
   * Asks the platform, once, whether the app may read position while a screen is open. Rejects
   * when the platform will not answer at all — a failure is not a refusal, and the caller must be
   * able to tell them apart.
   */
  requestAvailability: () => Promise<PositionAvailability>;
  /**
   * Starts watching. Returns the way to stop, which is the only control a caller has over it: the
   * watch stops when the caller stops it, and holding a stop function is what makes leaving a
   * screen enough to stop reading position.
   */
  watch: (handlers: PositionHandlers) => () => void;
};
