import { registerThisDevice } from '../register-device';
import { fakePushPort } from '../testing';

/**
 * Registering this phone for push (ADR-067): only with the platform's permission, only with a
 * token the platform issued, and through the account service's `POST /me/devices`. Each outcome
 * is named, so the caller can say what happened rather than guess.
 */
describe('registerThisDevice', () => {
  it('registers the platform’s token when notifications are allowed', async () => {
    const push = fakePushPort({
      permission: 'granted',
      token: { token: 'fcm-1', platform: 'android' },
    });
    const register = jest.fn(async () => ({ ok: true }) as const);

    expect(await registerThisDevice({ push, register })).toBe('registered');
    expect(register).toHaveBeenCalledWith({ token: 'fcm-1', platform: 'android' });
  });

  it.each(['denied', 'undetermined', 'unsupported'] as const)(
    'sends nothing while the permission is %s',
    async (permission) => {
      const push = fakePushPort({ permission });
      const register = jest.fn();

      expect(await registerThisDevice({ push, register })).toBe('not-allowed');
      expect(push.token).not.toHaveBeenCalled();
      expect(register).not.toHaveBeenCalled();
    },
  );

  it('says there is no token when the platform cannot issue one', async () => {
    // A build without its Firebase or APNs configuration answers no token (ADR-067).
    const push = fakePushPort({ permission: 'granted', token: null });
    const register = jest.fn();

    expect(await registerThisDevice({ push, register })).toBe('no-token');
    expect(register).not.toHaveBeenCalled();
  });

  it('says the registration failed when the service does not keep it', async () => {
    const push = fakePushPort({ permission: 'granted' });

    expect(await registerThisDevice({ push, register: async () => ({ ok: false }) })).toBe(
      'failed',
    );
  });
});
