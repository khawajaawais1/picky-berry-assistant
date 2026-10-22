import { router } from 'expo-router';

import { OnboardingWelcomeScreen } from '@/features/onboarding';

/**
 * Root route — screen 01 · Onboarding · Welcome (Figma node 5:22710).
 *
 * A route only wires a screen to a feature's public API, so there is nothing else
 * here. The primary action leads to screen 03: the design's screen 02 (“choose role”)
 * is a design exploration rather than part of this flow, and the assumption that the
 * flow enters at 03 is recorded in PROJECT.md. The sign-in action leads to the sign-in screen,
 * which the design never drew and the design owner chose a reading for (ADR-034): the frame's
 * link is a real action now rather than a label.
 */
export default function WelcomeRoute() {
  return (
    <OnboardingWelcomeScreen
      onGetStarted={() => router.push('/create-account')}
      onSignIn={() => router.push('/sign-in')}
    />
  );
}
