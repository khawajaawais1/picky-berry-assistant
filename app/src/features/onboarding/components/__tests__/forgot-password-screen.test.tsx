import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout } from '@/constants/theme';

import { OnboardingForgotPasswordScreen } from '../forgot-password-screen';

/**
 * The password-reset journey the design never drew (ADR-062, answering ADR-034 §1.5).
 *
 * The screen keeps the app-drawn sign-in screen's framing — the 76 px key tile, the onboarding
 * header and the design's 54 px controls — and its words are this repository's, so this test is
 * where they are reviewed. What the screen may not do is claim a delivery: no sign-in service is
 * connected, the stand-in sends nothing, and the confirmation says so on a test build (ADR-048).
 */
const EMAIL = 'aino@example.fi';
const REQUESTED =
  'If an account uses aino@example.fi, the sign-in service’s reset link is the next step for that address. The app never stores your password.';
const TEST_BUILD =
  'No sign-in service is connected here, so no reset email is sent. In the finished app, the link would go to this address.';

async function requestReset(email = EMAIL) {
  await fireEvent.changeText(screen.getByTestId('forgot-password-email'), email);
  await fireEvent.press(screen.getByRole('button', { name: 'Request reset link' }));
}

describe('OnboardingForgotPasswordScreen', () => {
  it('renders the request journey’s copy', async () => {
    await render(<OnboardingForgotPasswordScreen onSignIn={jest.fn()} />);

    expect(screen.getByText('ONBOARDING · PASSWORD RESET')).toBeOnTheScreen();
    expect(screen.getByText('Reset password')).toBeOnTheScreen();
    expect(screen.getByText('Forgot your password?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Enter the email your account uses. Reset links belong to the sign-in service; the app never stores your password.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Email address')).toBeOnTheScreen();
    expect(screen.getByText('Request reset link')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();

    // No code, no password field, no reset token: the provider owns the reset and the app never
    // sees either end of it (ADR-054, ADR-062).
    expect(screen.queryByText(/code/i)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Password')).not.toBeOnTheScreen();
  });

  it('keeps the sign-in screen’s 76 px key tile as its framing', async () => {
    await render(<OnboardingForgotPasswordScreen />);

    expect(screen.getByTestId('forgot-password-symbol')).toHaveStyle({
      height: layout.symbolTile,
      width: layout.symbolTile,
    });
  });

  it('cannot request a link before an address is entered', async () => {
    const onRequestReset = jest.fn(async () => true);
    await render(<OnboardingForgotPasswordScreen onRequestReset={onRequestReset} />);

    expect(screen.getByRole('button', { name: 'Request reset link' })).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('forgot-password-email'), '   ');
    expect(screen.getByRole('button', { name: 'Request reset link' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Request reset link' }));
    expect(onRequestReset).not.toHaveBeenCalled();
  });

  it('hands the trimmed address up, and no password', async () => {
    const onRequestReset = jest.fn(async () => true);
    await render(<OnboardingForgotPasswordScreen onRequestReset={onRequestReset} />);

    await fireEvent.changeText(screen.getByTestId('forgot-password-email'), `  ${EMAIL}  `);
    await fireEvent.press(screen.getByRole('button', { name: 'Request reset link' }));

    expect(onRequestReset).toHaveBeenCalledWith(EMAIL);
  });

  it('states the next step after the request, without claiming a delivery', async () => {
    const onRequestReset = jest.fn(async () => true);
    await render(<OnboardingForgotPasswordScreen onRequestReset={onRequestReset} />);

    await requestReset();

    expect(await screen.findByText('Reset request accepted.')).toBeOnTheScreen();
    expect(screen.getByText(REQUESTED)).toBeOnTheScreen();
    expect(screen.getByText('Test build')).toBeOnTheScreen();
    expect(screen.getByText(TEST_BUILD)).toBeOnTheScreen();

    // The form is gone: the address it asked for is the state, not something to type again.
    expect(screen.queryByTestId('forgot-password-email')).not.toBeOnTheScreen();
    expect(screen.queryByText('Request reset link')).not.toBeOnTheScreen();
  });

  it('says nothing about whether an account exists', async () => {
    const onRequestReset = jest.fn(async () => true);
    await render(<OnboardingForgotPasswordScreen onRequestReset={onRequestReset} />);

    await requestReset('nobody@example.fi');

    // The same state for an address with no account: the screen is not an account-existence
    // oracle, and the provider is the only thing that could answer.
    expect(await screen.findByText('Reset request accepted.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'If an account uses nobody@example.fi, the sign-in service’s reset link is the next step for that address. The app never stores your password.',
      ),
    ).toBeOnTheScreen();
  });

  it('reports a request the service refused, rather than moving on silently', async () => {
    const onRequestReset = jest.fn(async () => false);
    await render(<OnboardingForgotPasswordScreen onRequestReset={onRequestReset} />);

    await requestReset();

    expect(
      await screen.findByText('The reset link couldn’t be requested. Try again.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Reset request accepted.')).not.toBeOnTheScreen();
    expect(screen.getByTestId('forgot-password-email')).toBeOnTheScreen();
  });

  it('reports a request that could not finish at all', async () => {
    const onRequestReset = jest.fn(async () => {
      throw new Error('the network refused the request');
    });
    await render(<OnboardingForgotPasswordScreen onRequestReset={onRequestReset} />);

    await requestReset();

    expect(
      await screen.findByText('The reset link couldn’t be requested. Try again.'),
    ).toBeOnTheScreen();
  });

  it('draws the action disabled in a production build, where nothing can answer it', async () => {
    await render(
      <OnboardingForgotPasswordScreen environment="production" onRequestReset={async () => true} />,
    );

    await fireEvent.changeText(screen.getByTestId('forgot-password-email'), EMAIL);

    expect(screen.getByRole('button', { name: 'Request reset link' })).toBeDisabled();
  });

  it('offers a different address from the confirmation, and keeps what was typed', async () => {
    await render(<OnboardingForgotPasswordScreen onRequestReset={async () => true} />);

    await requestReset();
    await fireEvent.press(screen.getByRole('button', { name: 'Use a different address' }));

    expect(screen.getByDisplayValue(EMAIL)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Request reset link' })).toBeOnTheScreen();
  });

  it('offers the way back to sign in from both states', async () => {
    const onSignIn = jest.fn();
    const { rerender } = await render(
      <OnboardingForgotPasswordScreen onRequestReset={async () => true} onSignIn={onSignIn} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);

    await requestReset();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(2);

    await rerender(<OnboardingForgotPasswordScreen onRequestReset={async () => true} />);
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeOnTheScreen();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<OnboardingForgotPasswordScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingForgotPasswordScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
