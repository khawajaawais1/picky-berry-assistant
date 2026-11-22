import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryProvider } from '@/services/query-client';

import { accountProfile, fakeAccountApi } from '@/features/privacy/services/testing';
import { fakePushPort } from '@/services/push/testing';
import { sessionPort } from '@/services/session';
import { installFakeAuthServer } from '@/services/session/testing';

import { AlertsScreen } from '../alerts-screen';

/**
 * Frame 12's alert-preferences card made real (ADR-067, superseding ADR-043's sample for the card):
 * the push switch is the platform's permission, and the radius and species are the account's own,
 * read from `GET /me` and changed on the Alert preferences screen. Quiet hours has no field in the
 * contract, so the row says it is not offered yet rather than drawing the design's 21:00–07:00.
 *
 */
async function signedIn() {
  await sessionPort.register({
    displayName: 'Aino',
    email: 'aino@example.fi',
    password: 'berries1234',
    lang: 'en',
    consents: {},
  });
}

beforeEach(async () => {
  installFakeAuthServer();
  await sessionPort.signOut();
});

function live(overrides: Partial<Parameters<typeof AlertsScreen>[0]> = {}) {
  return (
    <QueryProvider>
      <AlertsScreen
        accountApi={fakeAccountApi(
          accountProfile({
            alertRadiusKm: 25,
            speciesInterest: ['cloudberry', 'bilberry', 'rowan'],
          }),
        )}
        push={fakePushPort({ permission: 'undetermined' })}
        register={jest.fn(async () => ({ ok: true }))}
        {...overrides}
      />
    </QueryProvider>
  );
}

describe('AlertsScreen, with the account service and push (ADR-067)', () => {
  it('draws the account’s own radius and species, and says what is not offered', async () => {
    await signedIn();
    await render(live());

    expect(await screen.findByText('25 km')).toBeOnTheScreen();
    // Two species the app can name; a code it cannot name is left out of the count.
    expect(screen.getByText('Cloudberry + 1')).toBeOnTheScreen();
    expect(screen.getByText('Not offered yet')).toBeOnTheScreen();
    expect(
      screen.getByText('Saved to your account. The service sends no alerts yet.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('21:00–07:00')).not.toBeOnTheScreen();
  });

  it('names one species alone, and none as none', async () => {
    await signedIn();
    const { rerender } = await render(
      live({ accountApi: fakeAccountApi(accountProfile({ speciesInterest: ['lingonberry'] })) }),
    );
    expect(await screen.findByText('Lingonberry')).toBeOnTheScreen();

    await rerender(live({ accountApi: fakeAccountApi(accountProfile({ speciesInterest: [] })) }));
    expect(await screen.findByText('None chosen')).toBeOnTheScreen();
  });

  it('opens the preferences from the radius and species rows', async () => {
    await signedIn();
    const onOpenPreferences = jest.fn();
    await render(live({ onOpenPreferences }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Search radius, 25 km' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Species, Cloudberry + 1' }));

    expect(onOpenPreferences).toHaveBeenCalledTimes(2);
  });

  it('turns alerts on by asking the platform, then registers this phone', async () => {
    await signedIn();
    const push = fakePushPort({ permission: 'undetermined', afterRequest: 'granted' });
    const register = jest.fn(async () => ({ ok: true }));
    await render(live({ push, register }));

    const toggle = await screen.findByRole('switch', { name: 'Ripe-berry push alerts' });
    expect(toggle).not.toBeChecked();
    await fireEvent(toggle, 'valueChange', true);

    expect(push.request).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('switch', { name: 'Ripe-berry push alerts' })).toBeChecked();
  });

  it('turns alerts off in the phone’s settings, because the app cannot take its permission back', async () => {
    await signedIn();
    const push = fakePushPort({ permission: 'granted' });
    await render(live({ push }));

    const toggle = await screen.findByRole('switch', { name: 'Ripe-berry push alerts' });
    await waitFor(() => expect(toggle).toBeChecked());
    await fireEvent(toggle, 'valueChange', false);

    expect(push.openSettings).toHaveBeenCalledTimes(1);
  });

  it('says alerts are off in the phone’s settings, and opens them', async () => {
    await signedIn();
    const push = fakePushPort({ permission: 'denied' });
    await render(live({ push }));

    expect(
      await screen.findByText('Notifications for Picky are off in this phone’s settings.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open phone settings' }));
    expect(push.openSettings).toHaveBeenCalledTimes(1);
  });

  it('draws no switch where there is no push, and says so', async () => {
    await signedIn();
    await render(live({ push: fakePushPort({ permission: 'unsupported' }) }));

    expect(
      await screen.findByText('This phone cannot receive push alerts from Picky yet.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  it('says when this phone could not be registered', async () => {
    await signedIn();
    const push = fakePushPort({ permission: 'undetermined', token: null });
    await render(live({ push }));

    await fireEvent(
      await screen.findByRole('switch', { name: 'Ripe-berry push alerts' }),
      'valueChange',
      true,
    );

    expect(
      await screen.findByText(
        'Alerts are allowed, but this phone could not be registered yet. It tries again on the next start.',
      ),
    ).toBeOnTheScreen();
  });

  it('says the settings could not be read rather than drawing the design’s', async () => {
    await signedIn();
    const accountApi = fakeAccountApi();
    accountApi.profile.mockRejectedValueOnce(new Error('offline'));
    await render(live({ accountApi }));

    expect(await screen.findByText('Your alert settings could not be read.')).toBeOnTheScreen();
    expect(screen.queryByText('3 km')).not.toBeOnTheScreen();
  });
});
