/**
 * Screen 05's state and its one rule, as pure data.
 *
 * The screen asks for two different things and they must not be confused: the system
 * permission — which this screen does not request at all; the position seam asks the platform when
 * a screen reads a fix, and only in the foreground (ADR-045) — and the *consent* the frame's row
 * carries. The consent is collected here, in words the user reads, before anything is asked of the
 * operating system.
 *
 * **The consent is for visit tracking while the app is open**, which is what the app does. The
 * frame's row asked for the heavier thing — timing a visit “even with the screen locked” — and the
 * copy no longer promises it: the background half is the owner's decision, recorded in
 * [ADR-047](../../../../docs/adr/ADR-047-the-consent-says-what-the-app-does.md) §2 rather than
 * assumed here.
 */

export type LocationConsent = {
  /** The consent row: visit tracking while the app is open. */
  visitTracking: boolean;
};

/**
 * What the screen starts with. The frame draws its row ticked; the app deliberately ships
 * it unchecked, because a row the design pre-ticked is not a consent the user gave
 * (AGENTS.md §11.1, and the same departure screen 03 makes for its own consent row).
 */
export const EMPTY_LOCATION_CONSENT: LocationConsent = {
  visitTracking: false,
};

/**
 * Whether the screen may hand the user on. Consent is an
 * affirmative action, so the answer is the consent itself: the user's decision, never a
 * default and never the frame's drawn state.
 */
export function canContinue(consent: LocationConsent): boolean {
  return consent.visitTracking;
}
