import { router } from 'expo-router';

import { OnboardingWelcomeScreen, SessionRestore } from '@/features/onboarding';
import { useSession } from '@/hooks/use-session';

/**
 * Root route — screen 01 · Onboarding · Welcome (Figma node 5:22710).
 *
 * A route only wires a screen to a feature's public API, so there is nothing else here — except
 * the cold-start read: the device's secure store is asked who is signed in, and a returning
 * picker is sent to the map rather than shown onboarding again (`SessionRestore`).
 *
 * The primary action leads to screen 03: the design's screen 02 (“choose role”) is a design
 * exploration rather than part of this flow, and the assumption that the flow enters at 03 is
 * recorded in PROJECT.md. The sign-in action leads to the sign-in screen, which the design never
 * drew and the design owner chose a reading for (ADR-034): the frame's link is a real action now
 * rather than a label.
 */
export default function WelcomeRoute() {
  const session = useSession();

  return (
    <SessionRestore state={session}>
      <OnboardingWelcomeScreen
        onGetStarted={() => router.push('/create-account')}
        onSignIn={() => router.push('/sign-in')}
      />
    </SessionRestore>
  );
}
