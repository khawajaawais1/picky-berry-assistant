import { router } from 'expo-router';

import { OnboardingSignInScreen, rememberSignInRequest } from '@/features/onboarding';

/**
 * The sign-in route — **the screen the design never drew** (PROJECT.md known issue 23).
 *
 * Frames 01 and 03 both draw “Already have an account? Sign in” and neither had a destination,
 * so the app had no way in for anyone who already has an account. The design owner chose the
 * reading this route serves — one identifier field, then the code screen the sign-up already
 * walks (ADR-034) — and the screen is app-drawn, which is why its copy lives in this repository's
 * catalogue rather than in a frame.
 *
 * A route only wires a screen to a feature's public API. Asking for the code records **which
 * journey is in flight** (a sign-in, with no name to carry) and opens screen 04, which serves
 * both journeys; the entry point of each frame's own link is on those two routes. The back
 * control is offered only when the screen was reached from somewhere, which keeps a deep link
 * from drawing a control that cannot act.
 *
 * The route sits at the app's root rather than in `(app)`: frames 01–05 draw no core navigation,
 * and a returning user is not inside the app until the code is accepted.
 */
export default function SignInRoute() {
  return (
    <OnboardingSignInScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onCreateAccount={() => router.push('/create-account')}
      onSendCode={(identifier) => {
        rememberSignInRequest(identifier);
        router.push('/verify-email');
      }}
    />
  );
}
