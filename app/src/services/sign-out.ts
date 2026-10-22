import { clearPrivacyConsent } from './privacy-consent';
import { clearReportQueue } from './report-queue';
import { clearSavedZones } from './saved-zones';
import { sessionPort } from './session';

/**
 * Signing out: what this device holds of the picker's is deleted, and then the session is dropped.
 *
 * It is a shared service rather than a route's own wiring because it is a rule about leaving, not
 * about one screen: a route file is a thin adapter with nothing to test (TESTING.md §8), and the
 * order below is exactly the part that has to be held — a deletion that fails must leave the
 * user signed in rather than signed out of an account whose data the app did not manage to
 * remove, and the failure must reach the screen instead of being swallowed (AGENTS.md §11.4).
 *
 * The records it deletes are the ones their own modules documented this surface as their caller
 * for: the picker's plan (`clearSavedZones`), the reports still waiting to sync
 * (`clearReportQueue`) and the consent they gave (`clearPrivacyConsent`). Nothing else on the
 * device is the picker's, and nothing is deleted that the app did not write.
 *
 * What signing out deliberately does **not** do is decide how the app knows a session: the shell
 * does not gate on one yet, and there is still no sign-in screen (PROJECT.md, known issue 23). So
 * this ends the session and clears the device; what a signed-out user sees next is the flow's
 * business, which is why the caller decides where to go rather than this module navigating.
 */
export async function signOut(): Promise<void> {
  await clearSavedZones();
  await clearReportQueue();
  await clearPrivacyConsent();
  // Last, so that a failure above leaves the session — and therefore the screen that shows who
  // is signed in — exactly as it was.
  await sessionPort.signOut();
}
