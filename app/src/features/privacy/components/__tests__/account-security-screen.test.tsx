import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SESSION_LIFETIME_MS, sessionPort } from '@/services/session';

import { AccountSecurityScreen } from '../account-security-screen';

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
const SIGN_OUT_FAILED = 'Signing out did not finish. Nothing was removed.';
const SIGN_OUT = 'Sign out';

beforeEach(async () => {
  await sessionPort.signOut();
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
        'Signing in asks for your email and password. The app keeps no password of its own, and no account service is connected to check one yet.',
      ),
    ).toBeOnTheScreen();
  });

  it('names the account the app is holding', async () => {
    await sessionPort.signIn({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
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
      expect(
        screen.getByText(
          'No session is being held. One lasts an hour from the moment you sign in.',
        ),
      ).toBeOnTheScreen(),
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
    expect(screen.getByText('In this app’s memory, while the app is open.')).toBeOnTheScreen();
    expect(screen.getByText('How long it lasts')).toBeOnTheScreen();
    expect(screen.getByText('An hour from the moment you sign in.')).toBeOnTheScreen();
    expect(screen.getByText('What ends it')).toBeOnTheScreen();
    expect(screen.getByText('Signing out, or the hour running out.')).toBeOnTheScreen();
  });

  it('states the hour the session is good for where the app keeps it', async () => {
    // The copy above says “an hour”, and this is the number it is quoting: if the stand-in's
    // lifetime ever changes, this line of copy has to change with it rather than quietly lie
    // (ADR-013's provider issues an hour; the constant is the stand-in's, not a preference).
    await render(<AccountSecurityScreen />);

    expect(SESSION_LIFETIME_MS).toBe(60 * 60 * 1000);
    expect(screen.getByText('An hour from the moment you sign in.')).toBeOnTheScreen();
  });

  it('names what is not there, rather than leaving the gaps to be guessed', async () => {
    await render(<AccountSecurityScreen />);

    expect(screen.getByText('Not here yet')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'No account service is connected, so your name and your email address cannot be changed in the app and an account cannot be deleted.',
      ),
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

  it('signs out when the action is pressed', async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);
    const { rerender } = await render(<AccountSecurityScreen />);

    // With nowhere to go and nothing to do, the action is not drawn at all: an action that cannot
    // act claims no role (AGENTS.md §11.2).
    expect(screen.queryByRole('button', { name: SIGN_OUT })).not.toBeOnTheScreen();

    await rerender(<AccountSecurityScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: SIGN_OUT }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(SIGN_OUT_FAILED)).not.toBeOnTheScreen());
  });

  it('says nothing was removed when signing out did not finish', async () => {
    const onSignOut = jest.fn().mockRejectedValue(new Error('the store refused'));

    await render(<AccountSecurityScreen onSignOut={onSignOut} />);
    await fireEvent.press(screen.getByRole('button', { name: SIGN_OUT }));

    // The control's promise is a deletion, so a run that failed says the records are still there —
    // and the action is offerable again rather than stuck.
    expect(await screen.findByText(SIGN_OUT_FAILED)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: SIGN_OUT })).toBeOnTheScreen();
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
 * The one thing on this screen that changes while it is open: the session's own hour (ADR-041).
 *
 * It is held to what a live reading must be — the time the session really has left, floored at whole
 * minutes so it never claims more than there is — and to what the app must do when the hour is up:
 * stop drawing the account it no longer holds, say why, and offer the way back in (PROJECT.md's known
 * issue 25 was that nothing observed an expiry at all).
 */
describe('AccountSecurityScreen, as the session’s hour runs out', () => {
  /** The moment the stand-in mints a session at, under the fake clock below. */
  const START = new Date('2026-10-11T09:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Moves the clock to `moment` and lets the next second pass, so the screen re-reads at
   * `moment + 1s` — which is what makes it look again. A jump on its own would leave the interval
   * pending; a second-by-second walk would fire thousands of ticks for an hour of clock.
   */
  async function moveTo(moment: Date) {
    await act(async () => {
      jest.setSystemTime(moment);
      jest.advanceTimersByTime(1000);
    });
  }

  async function signInAtStart() {
    await sessionPort.signIn({
      displayName: 'Aino Korhonen',
      email: 'aino@example.fi',
      password: 'berries1234',
    });
  }

  it('reads the time the session has left, and follows it down', async () => {
    await signInAtStart();

    await render(<AccountSecurityScreen />);

    // Minted a moment ago, so the whole hour is left: `remainingMilliseconds` and `SESSION_LIFETIME_MS`
    // are the same rule, and this is the screen reading it rather than repeating it.
    expect(await screen.findByText('Time left')).toBeOnTheScreen();
    expect(screen.getByText(`${SESSION_LIFETIME_MS / 60_000} min`)).toBeOnTheScreen();

    // 45 seconds left is not “1 min”: the reading is floored, so it never claims time that is gone.
    await moveTo(new Date(START.getTime() + SESSION_LIFETIME_MS - 45_000));
    expect(screen.getByText('Less than a minute')).toBeOnTheScreen();
  });

  it('holds the account until the hour is actually up', async () => {
    await signInAtStart();

    await render(<AccountSecurityScreen />);
    await screen.findByText('Time left');

    // One second before the end the session is still the app's, and the row still says whose it is
    // (the tick lands at `moment + 1s`, so this reads the last live second).
    await moveTo(new Date(START.getTime() + SESSION_LIFETIME_MS - 2000));
    expect(screen.getByTestId('account-security-row')).toBeOnTheScreen();
    expect(screen.queryByText('This session has ended')).not.toBeOnTheScreen();
  });

  it('stops drawing the account, says why, and offers the way back in when the hour is up', async () => {
    await signInAtStart();
    const onSignIn = jest.fn();

    await render(<AccountSecurityScreen onSignIn={onSignIn} />);
    await screen.findByText('Time left');

    // The instant of expiry counts as expired (the session rule's own choice), so the state changes
    // on the tick that reaches it rather than a second later.
    await moveTo(new Date(START.getTime() + SESSION_LIFETIME_MS));

    expect(await screen.findByText('This session has ended')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'The hour that began when you signed in is up, so the app is holding no account.',
      ),
    ).toBeOnTheScreen();
    // The account row and the countdown are gone: the app is holding nobody, and a row naming a
    // person would be the claim this screen exists to avoid.
    expect(screen.queryByTestId('account-security-row')).not.toBeOnTheScreen();
    expect(screen.queryByText('Time left')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('offers the same way in when the app is holding no session at all', async () => {
    const onSignIn = jest.fn();

    await render(<AccountSecurityScreen onSignIn={onSignIn} />);

    expect(
      await screen.findByText(
        'No session is being held. One lasts an hour from the moment you sign in.',
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('draws no way in when it has nowhere to send the user', async () => {
    await render(<AccountSecurityScreen />);

    await screen.findByText(
      'No session is being held. One lasts an hour from the moment you sign in.',
    );

    // A control that cannot act claims no role (AGENTS.md §11.2), and the sentence above it still
    // says what the state is.
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeOnTheScreen();
  });
});
