import { PUBLIC_ENV_VARS } from '@/config/env';

import { passwordResetAvailability } from '../password-reset';

const ENV = PUBLIC_ENV_VARS.appEnvironment;
const KEY = PUBLIC_ENV_VARS.firebaseApiKey;

/**
 * The one question the route asks before it wires a reset screen: is a provider configured, and
 * if not, is this build allowed to walk the stand-in? The three answers are what decide whether
 * the action acts, and whether the confirmation may say an email was sent.
 */
describe('passwordResetAvailability', () => {
  it('is live when a Firebase project is configured in any environment', () => {
    expect(passwordResetAvailability({ [ENV]: 'production', [KEY]: 'firebase-key' })).toBe('live');
    expect(passwordResetAvailability({ [ENV]: 'development', [KEY]: 'firebase-key' })).toBe('live');
  });

  it('is test outside production when no provider is configured', () => {
    expect(passwordResetAvailability({ [ENV]: 'development' })).toBe('test');
    expect(passwordResetAvailability({ [ENV]: 'preview' })).toBe('test');
  });

  it('is unavailable in a shipped build with no provider', () => {
    expect(passwordResetAvailability({ [ENV]: 'production' })).toBe('unavailable');
  });

  it('treats a malformed environment as the strictest one', () => {
    expect(passwordResetAvailability({ [ENV]: 'staging' })).toBe('unavailable');
  });
});
