import { fireEvent, render, screen } from '@testing-library/react-native';

import { OnboardingResetPasswordScreen } from '../reset-password-screen';

/**
 * The page an emailed reset link opens (ADR-062, ADR-065). The token is the route's input; the
 * screen spends it through the session port and keeps neither the token nor the password.
 */
const TOKEN = 'a-reset-token';
const PASSWORD = 'berries1234';

async function fillPasswords(password = PASSWORD, confirmation = password) {
  await fireEvent.changeText(screen.getByTestId('reset-password-password'), password);
  await fireEvent.changeText(screen.getByTestId('reset-password-confirmation'), confirmation);
}

async function submit() {
  await fireEvent.press(screen.getByTestId('reset-password-action'));
}

describe('OnboardingResetPasswordScreen', () => {
  it('draws the new-password form for a link that carried a token', async () => {
    await render(<OnboardingResetPasswordScreen onSignIn={jest.fn()} token={TOKEN} />);

    expect(screen.getByText('ONBOARDING · NEW PASSWORD')).toBeOnTheScreen();
    expect(screen.getByText('Reset password')).toBeOnTheScreen();
    expect(screen.getByText('Choose a new password.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Use at least 10 characters, including a number. This link can be used once.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('New password')).toBeOnTheScreen();
    expect(screen.getByLabelText('Confirm new password')).toBeOnTheScreen();
    expect(screen.getByText('At least 10 characters, with a number.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
  });

  it('opens the invalid state when the link carried no token', async () => {
    const onRequestNewLink = jest.fn();
    await render(
      <OnboardingResetPasswordScreen
        onRequestNewLink={onRequestNewLink}
        onSignIn={jest.fn()}
        token="  "
      />,
    );

    expect(screen.getByText('This reset link can’t be used.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'It may have expired or already been used. Request a new link to choose a password.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('New password')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('reset-password-action')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Request a new link' }));
    expect(onRequestNewLink).toHaveBeenCalledTimes(1);
  });

  it('cannot submit until the password meets the rule and the confirmation is filled', async () => {
    const onSubmit = jest.fn(async () => ({ ok: true }) as const);
    await render(<OnboardingResetPasswordScreen onSubmit={onSubmit} token={TOKEN} />);

    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('reset-password-password'), 'short');
    await fireEvent.changeText(screen.getByTestId('reset-password-confirmation'), 'short');
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('reset-password-password'), 'berryberryberry');
    await fireEvent.changeText(
      screen.getByTestId('reset-password-confirmation'),
      'berryberryberry',
    );
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled();

    await fillPasswords();
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeEnabled();
  });

  it('reports a confirmation that does not match, without sending anything', async () => {
    const onSubmit = jest.fn(async () => ({ ok: true }) as const);
    await render(<OnboardingResetPasswordScreen onSubmit={onSubmit} token={TOKEN} />);

    await fillPasswords(PASSWORD, `${PASSWORD}5`);
    await submit();

    expect(screen.getByText('The passwords don’t match.')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('spends the token on the password and opens the success state', async () => {
    const onSubmit = jest.fn(async () => ({ ok: true }) as const);
    const onSignIn = jest.fn();
    await render(
      <OnboardingResetPasswordScreen onSubmit={onSubmit} onSignIn={onSignIn} token={TOKEN} />,
    );

    await fillPasswords();
    await submit();

    expect(onSubmit).toHaveBeenCalledWith(PASSWORD);
    expect(await screen.findByText('Password updated.')).toBeOnTheScreen();
    expect(screen.getByText('Sign in with your new password.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('New password')).not.toBeOnTheScreen();
    // The password is not kept after the service accepts it.
    expect(screen.queryByDisplayValue(PASSWORD)).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('turns a refused link into the invalid state, with a way to request another', async () => {
    const onRequestNewLink = jest.fn();
    const onSubmit = jest.fn(async () => ({ ok: false, reason: 'refused' }) as const);
    await render(
      <OnboardingResetPasswordScreen
        onSubmit={onSubmit}
        onRequestNewLink={onRequestNewLink}
        token={TOKEN}
      />,
    );

    await fillPasswords();
    await submit();

    expect(await screen.findByText('This reset link can’t be used.')).toBeOnTheScreen();
    expect(screen.queryByText('Password updated.')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('New password')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Request a new link' }));
    expect(onRequestNewLink).toHaveBeenCalledTimes(1);
  });

  it('keeps the form and says the service could not be reached', async () => {
    const onSubmit = jest.fn(async () => ({ ok: false, reason: 'unavailable' }) as const);
    await render(<OnboardingResetPasswordScreen onSubmit={onSubmit} token={TOKEN} />);

    await fillPasswords();
    await submit();

    expect(
      await screen.findByText(
        'Picky couldn’t reach the account service. Check your connection and try again.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('New password')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeEnabled();
  });

  it('reports a call that rejects as an unreachable service', async () => {
    const onSubmit = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await render(<OnboardingResetPasswordScreen onSubmit={onSubmit} token={TOKEN} />);

    await fillPasswords();
    await submit();

    expect(
      await screen.findByText(
        'Picky couldn’t reach the account service. Check your connection and try again.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('New password')).toBeOnTheScreen();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(
      <OnboardingResetPasswordScreen onBack={onBack} token={TOKEN} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingResetPasswordScreen token={TOKEN} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
