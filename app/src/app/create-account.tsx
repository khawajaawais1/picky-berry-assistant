import { router, useLocalSearchParams } from 'expo-router';

import { appEnvironment } from '@/config/env';
import {
  OnboardingCreateAccountScreen,
  SignInPrototype,
  isSignInVariantKey,
} from '@/features/onboarding';
import { sessionPort } from '@/services/session';

/**
 * Screen 03 · Onboarding · Create account (Figma node 5:22788).
 *
 * A route only wires a screen to a feature's public API. The back control is wired because the
 * welcome screen sits behind it, and submitting hands the address, the password and the name to
 * the **session port** (`src/services/session/`), which is where a credential becomes a session:
 * today the stand-in behind it accepts any completed form outside a production build and verifies
 * nothing, and when the account service exists the same call goes to it and this route does not
 * change (ADR-054, ADR-059).
 *
 * **The route asks for no code and opens no verification screen.** Screen 04 is retired: the
 * credential is the frame's own password field, so a successful submission is the account's
 * creation and its sign-in at once, and the flow continues to screen 05. The password is passed
 * to the port and goes no further — it is not kept in a route, a URL or a store.
 *
 * The **sign-in action leads to the sign-in screen** (ADR-034) — the other half of the pair of
 * links frames 01 and 03 draw. The **terms link opens the device notice** (`/terms-privacy`): no
 * terms document exists, and the notice is what the app can honestly show behind a consent line —
 * what this phone is holding, record by record, and the rights over each of them (ADR-039,
 * ADR-043). Until that route existed the link was drawn as an inert label; a link that lands
 * somewhere real is an action, so it now carries one.
 *
 * PROTOTYPE — `?variant=` swaps this route's rendering for one of three throwaway readings of a
 * sign-in screen, which is the paper the designer reacts to while the design has no frame for one
 * ([to-questionnaire-sign-in.md](../../to-questionnaire-sign-in.md), and the feature's
 * `components/prototype/`). Without the parameter the screen below is exactly the one measured by
 * the layout harness, and a **production** build ignores the parameter entirely, so no stray
 * prototype can ship.
 */
export default function CreateAccountRoute() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const variant = appEnvironment() === 'production' ? undefined : params.variant;

  if (isSignInVariantKey(variant)) return <SignInPrototype variant={variant} />;

  return (
    <OnboardingCreateAccountScreen
      onBack={() => router.back()}
      onReadTerms={() => router.push('/terms-privacy')}
      onSignIn={() => router.push('/sign-in')}
      onSubmit={async ({ email, password, name }) => {
        const result = await sessionPort.signIn({ displayName: name, email, password });

        if (!result.ok) {
          return false;
        }

        router.push('/location-consent');

        return true;
      }}
    />
  );
}
