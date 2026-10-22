/**
 * Screen 03's form, as pure data and rules.
 *
 * The design states exactly one rule for this form — its password hint — so that is
 * the only thing this module enforces beyond the controls being filled in. Email and
 * phone shape validation belongs to the API contract, not here (see PROJECT.md).
 */

/** Which identifier the account is created with; the frame offers both as chips. */
export type IdentifierMode = 'email' | 'phone';

export type CreateAccountForm = {
  name: string;
  mode: IdentifierMode;
  /** An email address or a phone number, depending on `mode`. */
  identifier: string;
  password: string;
  /** The frame's consent row; the user must give it deliberately (see the screen). */
  consent: boolean;
};

export const EMPTY_CREATE_ACCOUNT_FORM: CreateAccountForm = {
  consent: false,
  identifier: '',
  mode: 'email',
  name: '',
  password: '',
};

/**
 * The rule the hint states (“At least 8 characters, with a number.”). The wording
 * itself lives in the catalogue so it can be translated; the check lives here.
 */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Switching the identifier clears what was typed for the previous one: an address
 * entered as an email is not a phone number, and silently reinterpreting it would
 * send the wrong value to the API.
 */
export function applyIdentifierMode(
  form: CreateAccountForm,
  mode: IdentifierMode,
): CreateAccountForm {
  if (mode === form.mode) {
    return form;
  }

  return { ...form, identifier: '', mode };
}

/** Whether the form may be submitted: every control answered, and the rule met. */
export function isSubmittable(form: CreateAccountForm): boolean {
  return (
    form.name.trim().length > 0 &&
    form.identifier.trim().length > 0 &&
    form.password.length >= PASSWORD_MIN_LENGTH &&
    /\d/.test(form.password) &&
    form.consent
  );
}
