import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { accountProfile, fakeAccountApi } from '@/features/privacy/services/testing';
import { sessionPort } from '@/services/session';
import { installFakeAuthServer } from '@/services/session/testing';

import { AlertPreferencesScreen } from '../alert-preferences-screen';

/**
 * The screen behind frame 12's “Search radius” and “Species” rows — app-drawn, because the frame
 * draws the rows and nothing behind them (ADR-067). Each change is saved to the account at once
 * (`PATCH /me`), and a change the service did not keep is said and undone on screen.
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

describe('AlertPreferencesScreen', () => {
  it('draws the account’s radius and species as chosen', async () => {
    await signedIn();
    await render(
      <AlertPreferencesScreen
        accountApi={fakeAccountApi(
          accountProfile({ alertRadiusKm: 10, speciesInterest: ['bilberry'] }),
        )}
      />,
    );

    expect(screen.getByText('Alert preferences')).toBeOnTheScreen();
    expect(await screen.findByRole('radio', { name: '10 km' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3 km' })).not.toBeChecked();
    // The species list is one multi-select filter, read as a checkbox group: the account's
    // berry is checked and the one it does not hold is not.
    expect(screen.getByRole('checkbox', { name: 'Bilberry' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Cloudberry' })).not.toBeChecked();
  });

  it('draws a radius the account holds even when the screen does not offer it', async () => {
    await signedIn();
    await render(
      <AlertPreferencesScreen accountApi={fakeAccountApi(accountProfile({ alertRadiusKm: 7 }))} />,
    );

    expect(await screen.findByRole('radio', { name: '7 km' })).toBeChecked();
  });

  it('saves a new radius to the account', async () => {
    await signedIn();
    const api = fakeAccountApi(accountProfile({ alertRadiusKm: 10 }));
    await render(<AlertPreferencesScreen accountApi={api} />);

    await fireEvent.press(await screen.findByRole('radio', { name: '25 km' }));

    expect(api.updateProfile).toHaveBeenCalledWith({ alertRadiusKm: 25 });
    await waitFor(() => expect(screen.getByRole('radio', { name: '25 km' })).toBeChecked());
  });

  it('adds and removes a species, keeping the account’s other codes', async () => {
    await signedIn();
    // `rowan` is a code the app cannot name: it is kept, never silently dropped.
    const api = fakeAccountApi(accountProfile({ speciesInterest: ['bilberry', 'rowan'] }));
    await render(<AlertPreferencesScreen accountApi={api} />);

    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Cloudberry' }));
    expect(api.updateProfile).toHaveBeenLastCalledWith({
      speciesInterest: ['bilberry', 'rowan', 'cloudberry'],
    });

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Cloudberry' })).toBeChecked());
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Bilberry' }));
    expect(api.updateProfile).toHaveBeenLastCalledWith({
      speciesInterest: ['rowan', 'cloudberry'],
    });
  });

  it('says the change was not saved and keeps what the account holds', async () => {
    await signedIn();
    const api = fakeAccountApi(accountProfile({ alertRadiusKm: 10 }));
    api.updateProfile.mockResolvedValueOnce({ ok: false, reason: 'unavailable' });
    await render(<AlertPreferencesScreen accountApi={api} />);

    await fireEvent.press(await screen.findByRole('radio', { name: '25 km' }));

    expect(await screen.findByText('The change could not be saved. Try again.')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '10 km' })).toBeChecked();
  });

  it('offers nothing to change without an account', async () => {
    await render(<AlertPreferencesScreen accountApi={fakeAccountApi()} />);

    expect(await screen.findByText('Sign in to choose what alerts are about.')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    await render(<AlertPreferencesScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
