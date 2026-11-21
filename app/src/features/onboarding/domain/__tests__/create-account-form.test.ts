import {
  EMPTY_CREATE_ACCOUNT_FORM,
  isPasswordValid,
  isSubmittable,
  type CreateAccountForm,
  CONSENT_NOTICE_VERSION,
  registrationConsents,
} from '../create-account-form';

/**
 * Screen 03's hint states the password rule (“At least 10 characters, with a number.”).
 * The length bounds are the team API's (`POST /auth/register`: password 10–128, nickname
 * at most 30), because the frontend follows the served contract (ADR-065). A form the
 * server would refuse must not be submittable.
 */
const complete: CreateAccountForm = {
  ...EMPTY_CREATE_ACCOUNT_FORM,
  consent: true,
  email: 'aino@example.fi',
  name: 'Aino Korhonen',
  password: 'berrypick1',
};

describe('EMPTY_CREATE_ACCOUNT_FORM', () => {
  it('starts empty, on the email the frame shows, and without consent', () => {
    expect(EMPTY_CREATE_ACCOUNT_FORM).toEqual({
      consent: false,
      email: '',
      name: '',
      password: '',
    });
  });

  it('is not submittable', () => {
    expect(isSubmittable(EMPTY_CREATE_ACCOUNT_FORM)).toBe(false);
  });
});

describe('isSubmittable', () => {
  it('accepts a complete form', () => {
    expect(isSubmittable(complete)).toBe(true);
  });

  it('requires a name that is more than whitespace', () => {
    expect(isSubmittable({ ...complete, name: '   ' })).toBe(false);
  });

  it('requires an email address', () => {
    expect(isSubmittable({ ...complete, email: '' })).toBe(false);
    expect(isSubmittable({ ...complete, email: '   ' })).toBe(false);
  });

  it('requires at least ten characters in the password, the API’s minimum', () => {
    expect(isSubmittable({ ...complete, password: 'berries12' })).toBe(false);
    expect(isSubmittable({ ...complete, password: 'berries123' })).toBe(true);
  });

  it('refuses a password longer than the API’s 128 characters', () => {
    expect(isSubmittable({ ...complete, password: `${'a'.repeat(127)}1` })).toBe(true);
    expect(isSubmittable({ ...complete, password: `${'a'.repeat(128)}1` })).toBe(false);
  });

  it('refuses a name longer than the API’s 30-character nickname', () => {
    expect(isSubmittable({ ...complete, name: 'a'.repeat(30) })).toBe(true);
    expect(isSubmittable({ ...complete, name: `  ${'a'.repeat(30)}  ` })).toBe(true);
    expect(isSubmittable({ ...complete, name: 'a'.repeat(31) })).toBe(false);
  });

  it('requires a number in the password', () => {
    expect(isSubmittable({ ...complete, password: 'berryberryberry' })).toBe(false);
  });

  it('accepts a password of digits alone, because the design asks for nothing more', () => {
    expect(isSubmittable({ ...complete, password: '1234567890' })).toBe(true);
  });

  it('requires consent', () => {
    expect(isSubmittable({ ...complete, consent: false })).toBe(false);
  });
});

describe('isPasswordValid', () => {
  it('is the rule both account creation and reset use', () => {
    expect(isPasswordValid('berries123')).toBe(true);
    expect(isPasswordValid('berries12')).toBe(false);
    expect(isPasswordValid('berryberryberry')).toBe(false);
    expect(isPasswordValid(`${'a'.repeat(128)}1`)).toBe(false);
  });
});

describe('registrationConsents', () => {
  it('names the version of what the consent row agreed to, both of which the API requires', () => {
    // `POST /auth/register` refuses a registration without both versions (422 CONSENT_REQUIRED),
    // which is what “Your account wasn’t created” was, every time (ADR-068).
    const consents = registrationConsents();

    expect(consents.terms_version).toBe(CONSENT_NOTICE_VERSION);
    expect(consents.privacy_policy_version).toBe(CONSENT_NOTICE_VERSION);
    expect(CONSENT_NOTICE_VERSION.trim()).not.toBe('');
  });

  it('claims no background location, which the app never reads (ADR-056)', () => {
    expect(registrationConsents()).not.toHaveProperty('background_location');
  });
});
