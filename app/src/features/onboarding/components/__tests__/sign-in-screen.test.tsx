import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes } from '@/constants/theme';

import { OnboardingSignInScreen } from '../sign-in-screen';

/**
 * The screen frames 01 and 03 both point at, and that the design file never drew (PROJECT.md
 * known issue 23). The design owner chose reading A — **one identifier field, then the code
 * screen the sign-up already walks** (ADR-034) — so this screen is the app's own, built from the
 * components the design's screens are built from.
 *
 * Its copy is written out literally, the way the frames' screens are held: the words are the
 * app's rather than the design's, which makes this test the place they are reviewed. The
 * supporting line and the action name what the press does — carry the identifier to the code
 * screen — rather than a delivery, because nothing in the app sends a code yet (ADR-048).
 */
describe('OnboardingSignInScreen', () => {
  it('renders the screen’s copy', async () => {
    await render(<OnboardingSignInScreen />);

    expect(screen.getByText('ONBOARDING · SIGN IN')).toBeOnTheScreen();
    expect(screen.getByText('Sign in')).toBeOnTheScreen();
    expect(screen.getByText('Sign in with a code.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'One identifier, then six digits. No password to remember — and none to leak.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Email or phone')).toBeOnTheScreen();
    expect(screen.getByText('Continue with a code')).toBeOnTheScreen();
    expect(screen.getByText('I don’t have an account yet')).toBeOnTheScreen();
  });

  it('makes the primary action the design’s 54 px control', async () => {
    await render(<OnboardingSignInScreen onSendCode={() => {}} />);

    expect(screen.getByRole('button', { name: 'Continue with a code' })).toHaveStyle({
      minHeight: layout.actionHeight,
      borderRadius: radii.control,
      backgroundColor: themes.light.colors.accent,
    });
  });

  it('cannot continue before an identifier is typed', async () => {
    // The action is drawn where the design draws it and states that it is unavailable, which is
    // the contract every action in this app keeps (AGENTS.md §11.2).
    await render(<OnboardingSignInScreen onSendCode={() => {}} />);

    expect(screen.getByRole('button', { name: 'Continue with a code' })).toBeDisabled();
  });

  it('offers the action once an identifier is there, and hands it up with the whitespace gone', async () => {
    const onSendCode = jest.fn();
    await render(<OnboardingSignInScreen onSendCode={onSendCode} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-identifier'), '  aino@example.fi  ');
    const action = screen.getByRole('button', { name: 'Continue with a code' });

    expect(action).not.toBeDisabled();
    await fireEvent.press(action);

    expect(onSendCode).toHaveBeenCalledWith('aino@example.fi');
  });

  it('treats whitespace alone as no identifier', async () => {
    await render(<OnboardingSignInScreen onSendCode={() => {}} />);

    await fireEvent.changeText(screen.getByTestId('sign-in-identifier'), '   ');

    expect(screen.getByRole('button', { name: 'Continue with a code' })).toBeDisabled();
  });

  it('offers the way to create an account, for someone who has none', async () => {
    const onCreateAccount = jest.fn();
    await render(<OnboardingSignInScreen onCreateAccount={onCreateAccount} />);

    await fireEvent.press(screen.getByRole('button', { name: 'I don’t have an account yet' }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
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
