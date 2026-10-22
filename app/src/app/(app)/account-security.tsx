import { router } from 'expo-router';

import { AccountSecurityScreen } from '@/features/privacy';
import { signOut } from '@/services/sign-out';

/**
 * The screen frame 14's “Account & security” row opens (Figma node `5:23677`; the screen behind it
 * was never drawn — ADR-039).
 *
 * A route only wires a screen to a feature's public API. The frame draws a chevron on the row, so
 * the destination exists; the back control is offered only when the screen was pushed onto a stack,
 * because a deep link straight to this route has nowhere to go back to and a control that cannot
 * act must not claim a role (AGENTS.md §11.2).
 *
 * Signing out from here is the settings screen's own control with the same service behind it: the
 * deletion runs first and the session is dropped second, so a deletion that fails leaves the user
 * signed in with their records intact rather than signed out of an account the app did not manage
 * to clear. The screen shows that failure and nothing navigates on it; when the call resolves, the
 * user is back at the app's front door.
 *
 * The other wiring is the way back in: when the session this screen is holding runs out while the
 * user is looking at it, the screen stops drawing the account and offers the sign-in route
 * (`/sign-in`, ADR-041). That route is outside the shell itself, so pushing it is the same thing
 * frame 01's own link does.
 */
export default function AccountSecurityRoute() {
  return (
    <AccountSecurityScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onSignIn={() => router.push('/sign-in')}
      onSignOut={async () => {
        await signOut();
        router.replace('/');
      }}
    />
  );
}
