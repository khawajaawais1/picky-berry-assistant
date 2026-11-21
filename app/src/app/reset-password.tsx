import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import { OnboardingResetPasswordScreen } from '@/features/onboarding';
import { sessionPort } from '@/services/session';

/**
 * The page an emailed reset link opens — **the design never drew it** (ADR-034 §1.5, ADR-062,
 * ADR-065).
 *
 * The link carries a one-hour, single-use token in `?token=`. The route reads it and hands it to
 * the screen through a closure, so the component never reaches for the router and the token is not
 * copied into storage or a log. A link with no token renders the screen's invalid state.
 *
 * It sits at the app's root rather than in `(app)`: someone resetting a password cannot sign in,
 * and the design's onboarding frames draw no core navigation. The back control is offered only
 * when the screen was reached from somewhere; the sign-in action always works, replacing the route
 * when there is no history so a used link does not stay behind the next screen.
 */
export default function ResetPasswordRoute() {
  const canGoBack = useCanGoBack();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const resetToken = typeof token === 'string' && token.trim() !== '' ? token.trim() : null;

  const signIn = () => router.replace('/sign-in');

  return (
    <OnboardingResetPasswordScreen
      onBack={canGoBack ? () => router.back() : undefined}
      onRequestNewLink={() => router.replace('/forgot-password')}
      onSubmit={
        resetToken === null
          ? undefined
          : (password) => sessionPort.completePasswordReset(resetToken, password)
      }
      onSignIn={signIn}
      token={resetToken}
    />
  );
}
