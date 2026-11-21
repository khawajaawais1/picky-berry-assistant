import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { sessionPort } from '@/services/session';

import { AccountSecurityScreen } from '../account-security-screen';
import { installFakeAuthServer } from '@/services/session/testing';
import { accountProfile, fakeAccountApi } from '../../services/testing';

/**
 * The screen frame 14's “Account & security” row opens (node 5:23677). **The design never drew it**
 * (ADR-039), so its copy is this repository's and its content is what the app can be true about: an
 * account surface for a flow whose password the app never stores, a session that lives in memory
 * for an hour, and no account service behind any of it (ADR-054, ADR-059).
 *
 * The screen's own risk is the opposite of a missing control: it may not *claim* more security than
 * the app has. So the session's facts are stated as they are — where it is kept, how long it lasts,
 * what ends it — and the parts that do not exist are named rather than left out.
 */
const SIGN_OUT_FAILED = 'Signing out did not finish. Some records may still be here; try again.';
const SIGN_OUT = 'Sign out';

beforeEach(async () => {
  installFakeAuthServer();
  await sessionPort.signOut();
});

describe('AccountSecurityScreen, editing the name (ADR-067)', () => {
  async function signedIn() {
    await sessionPort.register({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'en',
      consents: {},
    });
  }

  it('offers the account’s name for editing once the service has answered it', async () => {
    await signedIn();
    await render(<AccountSecurityScreen accountApi={fakeAccountApi()} />);

    expect(await screen.findByDisplayValue('Aino Korhonen')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeOnTheScreen();
  });

  it('saves a new name to the account and draws it in the account row', async () => {
    await signedIn();
    const api = fakeAccountApi();
    await render(<AccountSecurityScreen accountApi={api} />);

    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Aino K');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));

    expect(api.updateProfile).toHaveBeenCalledWith({ nickname: 'Aino K' });
    expect(await screen.findByText('Name saved.')).toBeOnTheScreen();
    expect(screen.getByTestId('account-security-row')).toHaveTextContent(/Aino K/);
  });

  it('refuses an empty name without asking the service', async () => {
    await signedIn();
    const api = fakeAccountApi();
    await render(<AccountSecurityScreen accountApi={api} />);

    await fireEvent.changeText(await screen.findByLabelText('Name'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('A name is 1–30 characters.')).toBeOnTheScreen();
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('says the name was not saved when the service refuses it', async () => {
    await signedIn();
    const api = fakeAccountApi();
    api.updateProfile.mockResolvedValueOnce({ ok: false, reason: 'unavailable' });
    await render(<AccountSecurityScreen accountApi={api} />);

    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Aino K');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('The name could not be saved. Try again.')).toBeOnTheScreen();
  });

  it('offers no name field without an account service that can save', async () => {
    await signedIn();
    await render(<AccountSecurityScreen accountApi={{ profile: async () => accountProfile() }} />);

    await screen.findByTestId('account-security-row');
    expect(screen.queryByLabelText('Name')).not.toBeOnTheScreen();
  });
});

describe('AccountSecurityScreen', () => {
  it('renders its own heading and what the screen is for', async () => {
    await render(<AccountSecurityScreen />);

    expect(screen.getByText('ACCOUNT / OFFLINE · ACCOUNT & SECURITY')).toBeOnTheScreen();
    expect(screen.getByText('Account & security')).toBeOnTheScreen();
    expect(
      screen.getByText('What the app knows about your account, and what keeps it.'),
    ).toBeOnTheScreen();
  });

  it('says the app keeps no password of its own, because it hands the credential on', async () => {
    await render(<AccountSecurityScreen />);

    // The credential is email + password at the provider (ADR-054), so the app stores no password
    // to change, reset or leak. Saying it here is the answer for anyone who goes looking for a
    // change-password control, and the second sentence names the missing service rather than
    // pretending the credential is checked today.
    expect(screen.getByText('Your email and password are the key')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Signing in sends your email and password to the Picky account service, which checks them. The app keeps no password of its own.',
      ),
    ).toBeOnTheScreen();
  });

  it('names the account the app is holding', async () => {
    await sessionPort.register({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'en',
      consents: {},
    });

    await render(<AccountSecurityScreen />);

    expect(await screen.findByTestId('account-security-row')).toBeOnTheScreen();
    expect(screen.getByText('Aino Korhonen')).toBeOnTheScreen();
    expect(screen.getByText('AK')).toBeOnTheScreen();
    expect(screen.getByText('aino@example.fi · Email verified')).toBeOnTheScreen();
  });

  it('draws no account row, and says so, while the app is holding no session', async () => {
    await render(<AccountSecurityScreen />);

    await waitFor(() =>
      expect(screen.getByText('No session is being held. Sign in to start one.')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('account-security-row')).not.toBeOnTheScreen();
  });

  it('says so when the session could not be read, rather than showing no account', async () => {
    jest
      .spyOn(sessionPort, 'current')
      .mockRejectedValueOnce(new Error('the store will not answer'));

    await render(<AccountSecurityScreen />);

    expect(await screen.findByText('Your account could not be read.')).toBeOnTheScreen();
  });

  it('states the session’s own facts: where it is kept, how long, and what ends it', async () => {
    await render(<AccountSecurityScreen />);

    expect(screen.getByText('The session')).toBeOnTheScreen();
    expect(screen.getByText('Where it is kept')).toBeOnTheScreen();
    expect(screen.getByText('In this device’s secure storage.')).toBeOnTheScreen();
    expect(screen.getByText('How long it lasts')).toBeOnTheScreen();
    expect(screen.getByText('Renewed while you use the app.')).toBeOnTheScreen();
    expect(screen.getByText('What ends it')).toBeOnTheScreen();
    expect(screen.getByText('Signing out, or the service ends it.')).toBeOnTheScreen();
  });

  it('draws no countdown, because the account service renews the session (ADR-065)', async () => {
    await sessionPort.register({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'en',
      consents: {},
    });

    await render(<AccountSecurityScreen />);

    expect(await screen.findByTestId('account-security-row')).toBeOnTheScreen();
    expect(screen.queryByText('Time left')).not.toBeOnTheScreen();
  });

  it('names what is not there, rather than leaving the gaps to be guessed', async () => {
    await render(<AccountSecurityScreen />);

    expect(screen.getByText('Not here yet')).toBeOnTheScreen();
    expect(
      screen.getByText('Your name and email address cannot be changed in the app yet.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('There is no list of your devices and no second session to end.'),
    ).toBeOnTheScreen();
  });

  it('states what signing out deletes before it is offered', async () => {
    await render(<AccountSecurityScreen />);

    expect(
      screen.getByText(
        'Signing out deletes the visit tracking consent, the saved spots and the waiting reports on this phone, and then drops the session.',
      ),
    ).toBeOnTheScreen();
  });

  it('signs out once the deletion is confirmed', async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);
    const { rerender } = await render(<AccountSecurityScreen />);

    // With nowhere to go and nothing to do, the action is not drawn at all: an action that cannot
    // act claims no role (AGENTS.md §11.2).
    expect(screen.queryByRole('button', { name: SIGN_OUT })).not.toBeOnTheScreen();

    await rerender(<AccountSecurityScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: SIGN_OUT }));

    // The first press names the deletion; only the confirmation runs it.
    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('Sign out of this phone?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(SIGN_OUT_FAILED)).not.toBeOnTheScreen());
  });

  it('reports a sign-out that did not finish, and offers it again', async () => {
    const onSignOut = jest.fn().mockRejectedValue(new Error('the store refused'));

    await render(<AccountSecurityScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: SIGN_OUT }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));

    // The run stopped part-way, so the copy cannot claim nothing went. The confirmation stays
    // open with the action offered again rather than stuck.
    expect(await screen.findByText(SIGN_OUT_FAILED)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign out and delete' })).toBeOnTheScreen();
  });

  it('asks before signing out, and names the records the press deletes', async () => {
    const onSignOut = jest.fn(async () => {});
    await render(<AccountSecurityScreen onSignOut={onSignOut} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('Sign out of this phone?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Signing out deletes the saved spots, the visit reports waiting to sync and your consent record from this phone. They cannot be recovered here.',
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out and delete' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<AccountSecurityScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<AccountSecurityScreen />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen(),
    );
  });
});

/**
 * The way back in. A session ends when the user signs out or the account service refuses to
 * renew it. Either way `current()` answers nobody, and the screen says so and offers sign-in.
 */
describe('AccountSecurityScreen, with no session', () => {
  it('offers the same way in when the app is holding no session at all', async () => {
    const onSignIn = jest.fn();

    await render(<AccountSecurityScreen onSignIn={onSignIn} />);

    expect(
      await screen.findByText('No session is being held. Sign in to start one.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('draws no way in when it has nowhere to send the user', async () => {
    await render(<AccountSecurityScreen />);

    await screen.findByText('No session is being held. Sign in to start one.');

    // A control that cannot act claims no role (AGENTS.md §11.2), and the sentence above it still
    // says what the state is.
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeOnTheScreen();
  });
});

/**
 * The account row's verification line, read from the account service when the route supplies it
 * (ADR-065, the plan's phase 5): `GET /me` says whether the address is verified, so the row no
 * longer claims it without asking.
 */
describe('AccountSecurityScreen, with the account service', () => {
  const profile = (emailVerified: boolean) => async () => accountProfile({ emailVerified });

  async function signedUp() {
    await sessionPort.register({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'en',
      consents: {},
    });
  }

  it('says the address is not verified yet when the service says so', async () => {
    await signedUp();

    await render(<AccountSecurityScreen accountApi={{ profile: profile(false) }} />);

    expect(await screen.findByText('aino@example.fi · Email not verified yet')).toBeOnTheScreen();
  });

  it('says the address is verified when the service says so', async () => {
    await signedUp();

    await render(<AccountSecurityScreen accountApi={{ profile: profile(true) }} />);

    expect(await screen.findByText('aino@example.fi · Email verified')).toBeOnTheScreen();
  });

  it('claims no verification while the service has not answered', async () => {
    await signedUp();

    await render(
      <AccountSecurityScreen accountApi={{ profile: () => new Promise(() => undefined) }} />,
    );

    expect(await screen.findByTestId('account-security-row')).toBeOnTheScreen();
    expect(screen.queryByText(/verified/)).not.toBeOnTheScreen();
  });
});

/**
 * Deleting the account (ADR-065, the plan's phase 5): `DELETE /me` with the account's password,
 * which the server checks. The password is the confirmation, so nothing is deleted by one press.
 * The route clears the device and leaves the screen once the service has deleted the account.
 */
describe('AccountSecurityScreen, deleting the account', () => {
  async function signedUp() {
    await sessionPort.register({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
      lang: 'en',
      consents: {},
    });
  }

  it('offers deletion only for a signed-in account and a route that can delete it', async () => {
    await render(<AccountSecurityScreen onDeleteAccount={async () => ({ ok: true })} />);
    await screen.findByTestId('account-security-none');
    expect(screen.queryByTestId('account-delete-action')).not.toBeOnTheScreen();

    await signedUp();
    await render(<AccountSecurityScreen />);
    await screen.findByTestId('account-security-row');
    expect(screen.queryByTestId('account-delete-action')).not.toBeOnTheScreen();
  });

  it('asks for the password before it will delete anything', async () => {
    await signedUp();
    const onDeleteAccount = jest.fn(async () => ({ ok: true }) as const);

    await render(<AccountSecurityScreen onDeleteAccount={onDeleteAccount} />);

    expect(await screen.findByText('Delete account')).toBeOnTheScreen();
    expect(screen.getByTestId('account-delete-action')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('account-delete-password'), 'berries1234');
    await fireEvent.press(screen.getByTestId('account-delete-action'));

    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith('berries1234'));
  });

  it.each<['refused' | 'unavailable' | 'device-not-cleared', string]>([
    ['refused', 'That password didn’t match. Nothing was deleted.'],
    ['unavailable', 'The account service could not answer. Nothing was deleted.'],
    [
      'device-not-cleared',
      'The account was deleted, but this phone could not clear its records. Sign out to try again.',
    ],
  ])('says what happened when deleting answers %s', async (reason, sentence) => {
    await signedUp();

    await render(<AccountSecurityScreen onDeleteAccount={async () => ({ ok: false, reason })} />);
    await fireEvent.changeText(await screen.findByTestId('account-delete-password'), 'x');
    await fireEvent.press(screen.getByTestId('account-delete-action'));

    expect(await screen.findByText(sentence)).toBeOnTheScreen();
  });
});
