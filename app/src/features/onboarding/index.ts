/**
 * Public API of the `onboarding` feature.
 *
 * Screens 01–05 of the design live in this flow: welcome, role, account, verification
 * and location consent. It also holds the **sign-in screen**, which the design never drew: the
 * links on frames 01 and 03 had no destination until the design owner chose the reading it is
 * built from (ADR-034). Everything else in this folder is an implementation detail, so routes
 * import only from here.
 */
export {
  EMPTY_CREATE_ACCOUNT_FORM,
  applyIdentifierMode,
  isSubmittable,
  type CreateAccountForm,
  type IdentifierMode,
} from './domain/create-account-form';

/** The design's example values, which screen 04 falls back to on a cold start. */
export { EXAMPLE_EMAIL, EXAMPLE_NAME } from './domain/example-values';

/** Screen 05's state and its consent rule. */
export {
  EMPTY_LOCATION_CONSENT,
  canContinue,
  type LocationConsent,
} from './domain/location-consent';

/**
 * The hand-off between the screens that ask for a code and screen 04: where the code was just
 * sent, the name the account is shown under (which screen 04 hands to the session port —
 * ADR-029), and which journey asked (a sign-up that continues to screen 05 or a sign-in that
 * ends in the app — ADR-034). `peek` reads it, `remember`/`rememberSignIn` record it, and
 * `forget` drops it once the flow behind it is over.
 */
export {
  forgetVerificationRequest,
  peekVerificationRequest,
  rememberSignInRequest,
  rememberVerificationRequest,
  type VerificationPurpose,
  type VerificationRequest,
} from './domain/pending-verification';

export {
  OnboardingCreateAccountScreen,
  type OnboardingCreateAccountScreenProps,
} from './components/create-account-screen';

export {
  OnboardingLocationConsentScreen,
  type OnboardingLocationConsentScreenProps,
} from './components/location-consent-screen';

/**
 * The sign-in screen: the app's own, because the design file has no frame for one (ADR-034).
 */
export {
  OnboardingSignInScreen,
  type OnboardingSignInScreenProps,
} from './components/sign-in-screen';

export {
  OnboardingVerificationScreen,
  type OnboardingVerificationScreenProps,
} from './components/verification-screen';

export {
  OnboardingWelcomeScreen,
  type OnboardingWelcomeScreenProps,
} from './components/welcome-screen';

/**
 * PROTOTYPE — throwaway scaffolding for a design question, exported because a route may only
 * import from a feature's public API: three readings of a sign-in screen with no design frame yet,
 * mounted on `/create-account` behind `?variant=`
 * (see [to-questionnaire-sign-in.md](../../../to-questionnaire-sign-in.md)). Delete this export with
 * `components/prototype/` once the question is answered.
 */
export {
  SignInPrototype,
  isSignInVariantKey,
  type SignInPrototypeProps,
  type SignInVariantKey,
} from './components/prototype/sign-in-variants';
