import { router } from 'expo-router';

import { PrivacySettingsScreen } from '@/features/privacy';
import { signOut } from '@/services/sign-out';

/**
 * Screen 14 · Account and offline · Privacy settings (Figma node 5:23613): the profile the fourth
 * destination opens, holding the picker's settings (2026-10-22 — the destination is the profile,
 * and the settings are inside it).
 *
 * A route only wires a screen to a feature's public API. The frame has no back control — in the
 * design this screen is a tab — and neither does the route: a tab's navigation is the bar, and
 * whatever history sits underneath it is not a way back (a deep link straight here has none at
 * all, and a control that cannot act must not claim a role, AGENTS.md §11.2).
 *
 * Five destinations, all of them real: the “Offline maps & sync” row opens frame 13's sync centre
 * (the design's own place for it), the “Saved spots” row opens the picker's plan (the screen behind
 * that row was never drawn — ADR-030), the “Account & security” and “Terms & privacy” rows open
 * the two screens the design never drew for them (ADR-039), and “Sign out” leaves — deleting what
 * this device holds of the picker's and dropping the session (`src/services/sign-out.ts`).
 *
 * Signing out therefore has two halves and the order matters: the deletion runs first and only
 * then the session is dropped, so a deletion that fails leaves the user signed in with their data
 * intact rather than signed out of an account the app did not manage to clear. The screen shows
 * that failure and nothing navigates on it; when the call resolves, the user is back at the app's
 * front door — the welcome screen — because a signed-out app has no screen of its own yet
 * (PROJECT.md, known issue 23: there is still no sign-in screen).
 */
export default function PrivacySettingsRoute() {
  return (
    <PrivacySettingsScreen
      onOpenAccountSecurity={() => router.push('/account-security')}
      onOpenSavedSpots={() => router.push('/saved-spots')}
      onOpenSync={() => router.push('/downloads')}
      onOpenTermsPrivacy={() => router.push('/terms-privacy')}
      onSignOut={async () => {
        await signOut();
        router.replace('/');
      }}
    />
  );
}
