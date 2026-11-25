import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { SessionState } from '@/hooks/use-session';

export type SessionRestoreProps = {
  /** What `useSession` answered: still reading, holding an account, or holding none. */
  state: SessionState;
  /** The welcome screen to draw when the device holds no session. */
  children: ReactNode;
};

/**
 * The first screen a cold start reaches, read against the session the device kept.
 *
 * A picker who signed in once is not a new picker: the secure store (ADR-006) still holds the
 * token pair, so reopening the app must land on the map rather than back on onboarding. This
 * gate is the one place that turns "the store answered an account" into that destination —
 * the welcome screen itself keeps knowing nothing about sessions.
 *
 * **While the store is being read, nothing is claimed.** Drawing the welcome screen first and
 * then replacing it would flash a sign-in page at a signed-in user; a themed empty frame is
 * the honest thing to paint until the answer arrives (and it is what the web export
 * pre-renders, so the first client paint agrees with the HTML).
 *
 * An unreadable store falls through to the welcome screen: asking the picker to sign in again
 * is recoverable, while a blank screen is not.
 */
export function SessionRestore({ children, state }: SessionRestoreProps) {
  const { colors } = useAppTheme();

  if (state.loading) {
    return (
      <View style={{ backgroundColor: colors.background, flex: 1 }} testID="session-restoring" />
    );
  }

  if (state.session !== null) {
    return <Redirect href="/discover" />;
  }

  return <>{children}</>;
}
