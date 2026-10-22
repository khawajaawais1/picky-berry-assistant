import { router, useLocalSearchParams } from 'expo-router';

import { appEnvironment } from '@/config/env';
import {
  OnboardingCreateAccountScreen,
  SignInPrototype,
  isSignInVariantKey,
  rememberVerificationRequest,
} from '@/features/onboarding';

/**
 * Screen 03 · Onboarding · Create account (Figma node 5:22788).
 *
 * A route only wires a screen to a feature's public API. The back control is wired
 * because the welcome screen sits behind it, and submitting now leads to screen 04
 * (verification) with the address the code goes to and the name the account is being created
 * with. The **password** stays here: it is the account's own secret and is not screen 04's
 * business. The name travels because the session screen 04 receives carries it, which is how
 * the settings screen can say whose settings they are (ADR-029).
 *
 * The **sign-in action now leads to the sign-in screen** the design owner chose a reading for
 * (ADR-034) — the other half of the pair of links frames 01 and 03 draw. The **terms link opens
 * the device notice** (`/terms-privacy`): no terms document exists, and the notice is what the app
 * can honestly show behind a consent line — what this phone is holding, record by record, and the
 * rights over each of them (ADR-039, ADR-043). Until that route existed the link was drawn as an
 * inert label; a link that lands somewhere real is an action, so it now carries one.
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
      onSubmit={(values) => {
        rememberVerificationRequest(values.identifier, values.name);
        router.push('/verify-email');
      }}
    />
  );
}
