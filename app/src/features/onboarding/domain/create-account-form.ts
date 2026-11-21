/**
 * Screen 03's form, as pure data and rules.
 *
 * The design states exactly one rule for this form — its password hint — so that is
 * the only thing this module enforces beyond the controls being filled in. Email shape
 * validation belongs to the API contract, not here (see PROJECT.md).
 *
 * **The form is email-only since 2026-10-24.** The frame draws an email/phone chip pair, but
 * the account's credential is the plan's email + password and phone sign-in is deferred
 * (ADR-054 §5), so the chips are gone and the address is the only identifier screen 03
 * collects. See ADR-059 for the departure and what it retired.
 */

export type CreateAccountForm = {
  name: string;
  /** The address the account is created with, as typed. */
  email: string;
  password: string;
  /** The frame's consent row; the user must give it deliberately (see the screen). */
  consent: boolean;
};

export const EMPTY_CREATE_ACCOUNT_FORM: CreateAccountForm = {
  consent: false,
  email: '',
  name: '',
  password: '',
};

/**
 * The rule the hint states (“At least 10 characters, with a number.”), with the bounds the team
 * API enforces on `POST /auth/register` (ADR-065): password 10–128 characters, nickname at most
 * 30. A form the server would refuse is not submittable. The wording lives in the catalogue so it
 * can be translated; the check lives here.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 30;

/** Whether a password meets the design's hint and the API's length bounds. */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /\d/.test(password)
  );
}

/** Whether the form may be submitted: every control answered, and the rules met. */
export function isSubmittable(form: CreateAccountForm): boolean {
  const name = form.name.trim();

  return (
    name.length > 0 &&
    name.length <= NAME_MAX_LENGTH &&
    form.email.trim().length > 0 &&
    isPasswordValid(form.password) &&
    form.consent
  );
}

/**
 * The version of what screen 03's consent row agrees to (ADR-068). No written terms or privacy
 * policy exist yet (PROJECT.md, open questions 15–16): the row's link opens the app's own device
 * notice (`/terms-privacy`, ADR-039), so that notice is what the picker agreed to, and its version
 * is the one recorded for both. **Bump it whenever the notice's wording changes**, and replace it
 * with the real documents' versions when the owner publishes them.
 */
export const CONSENT_NOTICE_VERSION = 'device-notice-2026-11-21';

/**
 * The consents `POST /auth/register` records. The API refuses a registration without both
 * versions (`422 CONSENT_REQUIRED`). Background location is never claimed: the app reads no
 * position in the background (ADR-056).
 */
export function registrationConsents(): { terms_version: string; privacy_policy_version: string } {
  return { terms_version: CONSENT_NOTICE_VERSION, privacy_policy_version: CONSENT_NOTICE_VERSION };
}
