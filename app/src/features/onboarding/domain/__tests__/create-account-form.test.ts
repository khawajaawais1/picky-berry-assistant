import {
  EMPTY_CREATE_ACCOUNT_FORM,
  applyIdentifierMode,
  isSubmittable,
  type CreateAccountForm,
} from '../create-account-form';

/**
 * The only rule the design states for this form is screen 03's hint
 * (“At least 8 characters, with a number.”). Everything asserted here either comes
 * from that sentence or from the frame's own controls; anything else would be an
 * invented requirement, so there is none.
 */
const complete: CreateAccountForm = {
  ...EMPTY_CREATE_ACCOUNT_FORM,
  consent: true,
  identifier: 'aino@example.fi',
  name: 'Aino Korhonen',
  password: 'berries1',
};

describe('EMPTY_CREATE_ACCOUNT_FORM', () => {
  it('starts empty, on the email identifier the frame shows, and without consent', () => {
    expect(EMPTY_CREATE_ACCOUNT_FORM).toEqual({
      consent: false,
      identifier: '',
      mode: 'email',
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

  it('requires an identifier', () => {
    expect(isSubmittable({ ...complete, identifier: '' })).toBe(false);
  });

  it('requires at least eight characters in the password', () => {
    expect(isSubmittable({ ...complete, password: 'berry1' })).toBe(false);
    expect(isSubmittable({ ...complete, password: 'berries1' })).toBe(true);
  });

  it('requires a number in the password', () => {
    expect(isSubmittable({ ...complete, password: 'berryberry' })).toBe(false);
  });

  it('accepts a password of digits alone, because the design asks for nothing more', () => {
    expect(isSubmittable({ ...complete, password: '12345678' })).toBe(true);
  });

  it('requires consent', () => {
    expect(isSubmittable({ ...complete, consent: false })).toBe(false);
  });
});

describe('applyIdentifierMode', () => {
  it('switches the mode and clears the identifier that belonged to the other one', () => {
    const phone = applyIdentifierMode(complete, 'phone');

    expect(phone.mode).toBe('phone');
    // An address typed as an email must never be submitted as a phone number.
    expect(phone.identifier).toBe('');
    expect(phone.name).toBe(complete.name);
  });

  it('keeps the identifier when the same mode is selected again', () => {
    expect(applyIdentifierMode(complete, 'email').identifier).toBe(complete.identifier);
  });
});
