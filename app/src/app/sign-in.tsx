import { router } from 'expo-router';

import { OnboardingSignInScreen } from '@/features/onboarding';
import { sessionPort } from '@/services/session';

/**
 * The sign-in route — **the screen the design never drew** (PROJECT.md known issue 23).
 *
 * Frames 01 and 03 both draw “Already have an account? Sign in” and neither had a destination,
 * so the app had no way in for anyone who already has an account. The design owner chose the
 * reading this route serves — one screen of the app's own before the app shell (ADR-034) — and
 * since 2026-10-24 the credential it collects is the account's own: **email + password**
 * (ADR-054, ADR-059), with no code screen behind it.
 *
 * A route only wires a screen to a feature's public API: the address and password go to the
 * **session port** and, when it accepts them, the route lands the returning user in the app
 * rather than on screen 05 — a returning user is not signing up. The back control is offered
 * only when the screen was reached from somewhere, which keeps a deep link from drawing a control
 * that cannot act. The recovery action opens the reset request, which asks the same port for the
 * provider's link and holds no token (ADR-062).
 *
 * The route sits at the app's root rather than in `(app)`: frames 01–05 draw no core navigation,
 * and a returning user is not inside the app until the credential is accepted.
 */
export default function SignInRoute() {
  return (
    <OnboardingSignInScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onCreateAccount={() => router.push('/create-account')}
      onForgotPassword={() => router.push('/forgot-password')}
      onSignIn={async ({ email, password }) => {
        const result = await sessionPort.signIn({ email, password });

        if (!result.ok) {
          return false;
        }

        router.push('/discover');

        return true;
      }}
    />
  );
}
