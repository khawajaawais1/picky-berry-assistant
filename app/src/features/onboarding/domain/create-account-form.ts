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
 * The rule the hint states (“At least 8 characters, with a number.”). The wording
 * itself lives in the catalogue so it can be translated; the check lives here.
 */
const PASSWORD_MIN_LENGTH = 8;

/** Whether the form may be submitted: every control answered, and the rule met. */
export function isSubmittable(form: CreateAccountForm): boolean {
  return (
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= PASSWORD_MIN_LENGTH &&
    /\d/.test(form.password) &&
    form.consent
  );
}
