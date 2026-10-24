import { router } from 'expo-router';

import { OnboardingForgotPasswordScreen } from '@/features/onboarding';
import { sessionPort } from '@/services/session';

/**
 * The password-reset route — **the design never drew it** (ADR-034 §1.5, ADR-062).
 *
 * A route only wires a screen to a feature's public API. The address goes to the **session port's**
 * reset request, which is the seam the provider adapter will sit behind; the app never receives a
 * token or a new password, so the journey ends at the provider's own page and returns to
 * `/sign-in` (ADR-054, ADR-062).
 *
 * It sits at the app's root rather than in `(app)`: frames 01–05 draw no core navigation, and
 * someone who cannot sign in is not inside the app. The back control is offered only when the
 * screen was reached from somewhere, which keeps a deep link from drawing a control that cannot
 * act; the sign-in action goes back when it can and otherwise replaces the route, so either way
 * there is one working way in.
 */
export default function ForgotPasswordRoute() {
  return (
    <OnboardingForgotPasswordScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onRequestReset={async (email) => {
        const result = await sessionPort.requestPasswordReset(email);

        return result.ok;
      }}
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
