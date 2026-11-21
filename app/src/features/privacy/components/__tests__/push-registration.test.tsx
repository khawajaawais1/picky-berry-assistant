import { render, waitFor } from '@testing-library/react-native';

import { fakePushPort } from '@/services/push/testing';
import { sessionPort } from '@/services/session';
import { installFakeAuthServer } from '@/services/session/testing';

import { fakeAccountApi } from '../../services/testing';
import { PushRegistration } from '../push-registration';

/**
 * The shell's push registration (ADR-067): on each start, and for each account signed in, this
 * phone's token is handed to `POST /me/devices` — once the platform allows alerts. It never asks
 * for the permission and draws nothing.
 */
beforeEach(async () => {
  installFakeAuthServer();
  await sessionPort.signOut();
});

describe('PushRegistration', () => {
  it('registers this phone, with the app’s version, for the signed-in account', async () => {
    await sessionPort.register({
      displayName: 'Aino',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'en',
      consents: {},
    });
    const api = fakeAccountApi();

    await render(
      <PushRegistration
        accountApi={api}
        appVersion="0.1.0"
        push={fakePushPort({
          permission: 'granted',
          token: { token: 'fcm-1', platform: 'android' },
        })}
      />,
    );

    await waitFor(() =>
      expect(api.registerDevice).toHaveBeenCalledWith({
        token: 'fcm-1',
        platform: 'android',
        appVersion: '0.1.0',
      }),
    );
  });

  it('registers nothing while no one is signed in', async () => {
    const api = fakeAccountApi();
    const push = fakePushPort({ permission: 'granted' });

    await render(<PushRegistration accountApi={api} push={push} />);

    await waitFor(() => expect(push.permission).not.toHaveBeenCalled());
    expect(api.registerDevice).not.toHaveBeenCalled();
  });
});
