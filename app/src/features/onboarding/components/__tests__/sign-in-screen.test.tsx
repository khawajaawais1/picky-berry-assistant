import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes } from '@/constants/theme';

import { OnboardingSignInScreen } from '../sign-in-screen';

/**
 * The screen frames 01 and 03 both point at, and that the design file never drew (PROJECT.md
 * known issue 23). The design owner chose the screen's shape (ADR-034); its credential was
 * re-cut on 2026-10-24 from an identifier + stand-in code to the account's own **email +
 * password** (ADR-054, ADR-059).
 *
 * Its copy is written out literally, the way the frames' screens are held: the words are the
 * app's rather than the design's, which makes this test the place they are reviewed.
 */
describe('OnboardingSignInScreen', () => {
  it('renders the screen’s copy', async () => {
    await render(<OnboardingSignInScreen />);

    expect(screen.getByText('ONBOARDING · SIGN IN')).toBeOnTheScreen();
    expect(screen.getAllByText('Sign in').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Welcome back.')).toBeOnTheScreen();
    expect(screen.getByText('Enter the email and password you signed up with.')).toBeOnTheScreen();
    expect(screen.getByText('Email address')).toBeOnTheScreen();
    expect(screen.getByText('Password')).toBeOnTheScreen();
    expect(screen.getByText('Forgot password?')).toBeOnTheScreen();
    expect(screen.getByText('I don’t have an account yet')).toBeOnTheScreen();

    // No code and no biometric prompt: the credential is the password, and the recovery
    // action opens the reset request rather than a code screen (ADR-062).
    expect(screen.queryByText(/code/i)).not.toBeOnTheScreen();
  });

  it('makes the primary action the design’s 54 px control', async () => {
    await render(<OnboardingSignInScreen onSignIn={async () => true} />);

    expect(screen.getByTestId('sign-in-action')).toHaveStyle({
      minHeight: layout.actionHeight,
      borderRadius: radii.control,
      backgroundColor: themes.light.colors.accent,
    });
  });

  it('cannot continue before both fields are filled', async () => {
    // The action is drawn where the design draws it and states that it is unavailable, which is
    // the contract every action in this app keeps (AGENTS.md §11.2).
    await render(<OnboardingSignInScreen onSignIn={async () => true} />);

    const action = screen.getByRole('button', { name: 'Sign in' });
    expect(action).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'aino@example.fi');
    expect(action).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'berries1234');
    expect(action).not.toBeDisabled();
  });

  it('hands the trimmed address and the password up', async () => {
    const onSignIn = jest.fn(async () => true);
    await render(<OnboardingSignInScreen onSignIn={onSignIn} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), '  aino@example.fi  ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), ' berries1234 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSignIn).toHaveBeenCalledWith({
      email: 'aino@example.fi',
      password: ' berries1234 ',
    });
  });

  it('treats whitespace alone as no address', async () => {
    await render(<OnboardingSignInScreen onSignIn={async () => true} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), '   ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'berries1234');

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('reports a credential the service refused, rather than leaving the press silent', async () => {
    const onSignIn = jest.fn(async () => false);
    await render(<OnboardingSignInScreen onSignIn={onSignIn} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'aino@example.fi');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'berries1234');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('That email and password didn’t match. Try again.'),
    ).toBeOnTheScreen();
  });

  it('says the same thing when the session could not be kept', async () => {
    const onSignIn = jest.fn(async () => {
      throw new Error('the keychain refused the write');
    });
    await render(<OnboardingSignInScreen onSignIn={onSignIn} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'aino@example.fi');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'berries1234');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('That email and password didn’t match. Try again.'),
    ).toBeOnTheScreen();
  });

  it('draws the action disabled in a production build, where nothing can answer it', async () => {
    await render(<OnboardingSignInScreen environment="production" onSignIn={async () => true} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'aino@example.fi');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'berries1234');

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('keeps the password masked until the user reveals it', async () => {
    await render(<OnboardingSignInScreen />);

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });

  it('offers the way to create an account, for someone who has none', async () => {
    const onCreateAccount = jest.fn();
    await render(<OnboardingSignInScreen onCreateAccount={onCreateAccount} />);

    await fireEvent.press(screen.getByRole('button', { name: 'I don’t have an account yet' }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it('offers the reset journey only when the route supplies it', async () => {
    const onForgotPassword = jest.fn();
    const { rerender } = await render(
      <OnboardingSignInScreen onForgotPassword={onForgotPassword} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(onForgotPassword).toHaveBeenCalledTimes(1);

    // A recovery label with no destination is a drawing, not an action: the route always supplies
    // one, and a caller that does not gets no role rather than a press that does nothing.
    await rerender(<OnboardingSignInScreen />);
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).not.toBeOnTheScreen();
  });

  it('draws no back control when nothing sits behind it', async () => {
    // The screen is reached from two frames' links and can be opened on its own, so the control
    // exists only when the route behind it has somewhere to go back to.
    await render(<OnboardingSignInScreen />);

    expect(screen.queryByLabelText('Back')).not.toBeOnTheScreen();
  });

  it('offers a back control when the route behind it does', async () => {
    const onBack = jest.fn();
    await render(<OnboardingSignInScreen onBack={onBack} />);

    await fireEvent.press(screen.getByLabelText('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
