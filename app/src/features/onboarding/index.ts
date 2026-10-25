/**
 * Public API of the `onboarding` feature.
 *
 * Screens 01, 03 and 05 of the design live in this flow — welcome, account and location consent.
 * **Screen 04 (verification) is retired**: the account's credential is the email + password screen
 * 03 collects, so there is no code screen for the flow to walk (ADR-054, ADR-059). The flow also
 * holds the **sign-in screen** and the **password-reset journey**, neither of which the design
 * drew: the links on frames 01 and 03 had no destination until the design owner chose the reading
 * the sign-in screen is built from (ADR-034), and the reset screen is the app's own request step
 * while the provider owns the link (ADR-062). Everything else in this folder is an implementation
 * detail, so routes import only from here.
 */
export {
  EMPTY_CREATE_ACCOUNT_FORM,
  isSubmittable,
  type CreateAccountForm,
} from './domain/create-account-form';

/** The design's example values, which screen 03 renders as placeholders. */
export { EXAMPLE_EMAIL, EXAMPLE_NAME } from './domain/example-values';

/** Screen 05's state and its consent rule. */
export {
  EMPTY_LOCATION_CONSENT,
  canContinue,
  type LocationConsent,
} from './domain/location-consent';

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

/**
 * The password-reset request: the app-drawn step the sign-in screen's recovery action opens
 * (ADR-062). The provider owns the email, the token and the new-password page.
 */
export {
  OnboardingForgotPasswordScreen,
  type OnboardingForgotPasswordScreenProps,
} from './components/forgot-password-screen';

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
