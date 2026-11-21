import { passwordResetAvailability } from '../password-reset';

afterEach(() => {
  delete process.env.EXPO_PUBLIC_APP_ENV;
  delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
});

/**
 * The one question the route asks before it wires a reset screen. Accounts live in the team API
 * (ADR-065), and the API has no reset endpoint yet, so no build can honestly offer a reset. A
 * Firebase key no longer helps: Firebase holds none of these accounts, so a request there would
 * report success for a link that can never arrive.
 */
describe('passwordResetAvailability', () => {
  it.each(['development', 'preview', 'production'])(
    'is unavailable in a %s build, because the account service has no reset yet',
    (environment) => {
      process.env.EXPO_PUBLIC_APP_ENV = environment;

      expect(passwordResetAvailability()).toBe('unavailable');
    },
  );

  it('stays unavailable when a Firebase key is configured, since Firebase holds no accounts', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'firebase-key';

    expect(passwordResetAvailability()).toBe('unavailable');
  });
});
