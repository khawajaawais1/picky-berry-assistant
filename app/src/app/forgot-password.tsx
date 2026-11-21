import { router, useCanGoBack } from 'expo-router';

import { OnboardingForgotPasswordScreen } from '@/features/onboarding';
import { passwordResetAvailability, sessionPort } from '@/services/session';

/**
 * The password-reset route — **the design never drew it** (ADR-034 §1.5, ADR-062).
 *
 * A route only wires a screen to a feature's public API. The address goes to the **session port's**
 * reset request, which asks the team API (`POST /auth/password-reset`, ADR-065). The service
 * answers the same for every address, and does not deliver mail yet, so the screen says the
 * request was accepted and claims no email. The app never receives a token or a new password, and
 * the journey returns to `/sign-in`.
 *
 * It sits at the app's root rather than in `(app)`: frames 01–05 draw no core navigation, and
 * someone who cannot sign in is not inside the app. The back control is offered only when the
 * screen was reached from somewhere, which keeps a deep link from drawing a control that cannot
 * act; the sign-in action goes back when it can and otherwise replaces the route, so either way
 * there is one working way in.
 */
export default function ForgotPasswordRoute() {
  const canGoBack = useCanGoBack();
  const availability = passwordResetAvailability();

  return (
    <OnboardingForgotPasswordScreen
      availability={availability}
      onBack={canGoBack ? () => router.back() : undefined}
      onRequestReset={
        availability === 'unavailable'
          ? undefined
          : async (email) => {
              const result = await sessionPort.requestPasswordReset(email);

              return result.ok;
            }
      }
      onSignIn={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/sign-in');
      }}
    />
  );
}
