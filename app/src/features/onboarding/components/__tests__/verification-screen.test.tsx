import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import { STUB_CODE } from '@/services/session';

import { RESEND_COOLDOWN_SECONDS, formatCountdown } from '../../domain/verification';
import { OnboardingVerificationScreen } from '../verification-screen';

/**
 * Content and metrics come from Figma frame `04 · Onboarding · Verification`
 * (node 5:22840) — the strings are written out literally so this test fails if the
 * screen silently changes its copy.
 *
 * Its copy is the frame's except where the frame names a delivery the app does not make: the
 * sentence names the destination the code belongs to there, and the wording rule — with what each
 * branch of the account-service decision turns it back into — is ADR-048.
 */
const ADDRESS = 'aino@example.fi';

/**
 * The code cells are hidden from assistive technology, so RNTL treats them as hidden
 * elements and the queries that inspect them have to ask for them (see CodeField).
 */
const HIDDEN = { includeHiddenElements: true } as const;

/**
 * Moves the clock on one second at a time: each tick re-arms the next timeout in an
 * effect, so a single forward jump would fire one and stop there.
 */
async function advanceSeconds(seconds: number) {
  for (let index = 0; index < seconds; index += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('OnboardingVerificationScreen', () => {
  it('renders the frame’s content', async () => {
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    expect(screen.getByText('ONBOARDING · 04 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Verify your email')).toBeOnTheScreen();
    expect(screen.getByText('Confirm it’s you.')).toBeOnTheScreen();
    expect(screen.getByText('Enter the 6-digit code for aino@example.fi.')).toBeOnTheScreen();
    expect(screen.getByText('Verification code')).toBeOnTheScreen();
    expect(
      screen.getByText('The code expires in 10 minutes. Don’t share it with anyone.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Verify & continue')).toBeOnTheScreen();
    expect(screen.getByText('Change email address')).toBeOnTheScreen();
    expect(screen.getByText('Signed up by phone instead?')).toBeOnTheScreen();
    expect(screen.getByText('The same six-digit step confirms a phone number.')).toBeOnTheScreen();
  });

  it('names the destination the code belongs to, in the sentence rather than beside it', async () => {
    await render(
      <OnboardingVerificationScreen destination="+358401234567" destinationKind="phone" />,
    );

    expect(screen.getByText('Enter the 6-digit code for +358401234567.')).toBeOnTheScreen();
    // A placeholder that reached the screen would mean the value never arrived.
    expect(screen.queryByText('Enter the 6-digit code for {destination}.')).not.toBeOnTheScreen();
  });

  it('follows the identifier where the frame draws only the email state', async () => {
    // The frame (`5:22840`) draws one state, and screen 03 offers two identifiers: a number typed
    // there stands where an address would, so the title and the only way back to the field take the
    // number's own words rather than naming an address the account does not have. Which state the
    // screen is in is passed in rather than derived here (ADR-049 §2.3, §3.1–§3.2).
    await render(
      <OnboardingVerificationScreen destination="+358 40 123 4567" destinationKind="phone" />,
    );

    expect(screen.getByText('Verify your number')).toBeOnTheScreen();
    expect(screen.getByText('Change phone number')).toBeOnTheScreen();
    expect(screen.queryByText('Verify your email')).not.toBeOnTheScreen();
    expect(screen.queryByText('Change email address')).not.toBeOnTheScreen();
    // And the frame's foot card is not drawn: it asks whether the reader signed up by phone
    // **instead**, which is a question for the journey that did not — on this one it would ask the
    // picker about themselves (ADR-049 §3.3).
    expect(screen.queryByText('Signed up by phone instead?')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('The same six-digit step confirms a phone number.'),
    ).not.toBeOnTheScreen();
  });

  it('draws the email state when the destination is an address', async () => {
    // The frame's own state, unchanged — including its foot card, which is the email journey's.
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    expect(screen.getByText('Verify your email')).toBeOnTheScreen();
    expect(screen.getByText('Change email address')).toBeOnTheScreen();
    expect(screen.getByText('Signed up by phone instead?')).toBeOnTheScreen();
  });

  it('uses the frame’s measured type metrics', async () => {
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    expect(screen.getByText('Confirm it’s you.')).toHaveStyle({
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
    });
    expect(screen.getByText('Verify your email')).toHaveStyle({
      fontSize: typography.subtitle.fontSize,
    });
    expect(screen.getByText('Verification code')).toHaveStyle({ fontSize: 14, fontWeight: '600' });
    expect(screen.getByText('The same six-digit step confirms a phone number.')).toHaveStyle({
      color: themes.light.colors.textMuted,
      fontSize: typography.caption.fontSize,
    });
  });

  it('builds the code row and the action as the frame’s controls', async () => {
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    for (let index = 0; index < 6; index += 1) {
      expect(screen.getByTestId(`verification-code-cell-${index}`, HIDDEN)).toHaveStyle({
        borderRadius: radii.control,
        minHeight: layout.codeCellHeight,
      });
    }

    expect(screen.getByTestId('verification-action')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderRadius: radii.control,
      // The design's 54 px as a floor; see AppButton (ADR-019).
      minHeight: layout.actionHeight,
    });
  });

  it('shows the frame’s accent-tinted note about the phone path', async () => {
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    // The frame draws this note on the accent tint, unlike screen 03's success-tinted one.
    expect(screen.getByTestId('verification-phone-note')).toHaveStyle({
      backgroundColor: themes.light.colors.accentMuted,
      borderRadius: radii.control,
    });
  });

  it('strokes the last cell once the code is full, which is the state the frame draws', async () => {
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    const field = screen.getByLabelText('Verification code');
    await fireEvent(field, 'focus');
    await fireEvent.changeText(field, '482169');

    expect(screen.getByTestId('verification-code-cell-5', HIDDEN)).toHaveStyle({
      borderColor: themes.light.colors.accent,
      borderWidth: 2,
    });
  });

  it('will not verify an incomplete code', async () => {
    const onSubmitCode = jest.fn(async () => true);
    await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        onSubmitCode={onSubmitCode}
      />,
    );

    const action = screen.getByTestId('verification-action');
    expect(action).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Verification code'), '48216');
    expect(action).toBeDisabled();

    await fireEvent.press(action);
    expect(onSubmitCode).not.toHaveBeenCalled();
  });

  it('offers no action at all when nothing can answer for the code', async () => {
    // The screen hands the code to the route, which hands it to the account service's port
    // (`src/services/session/`). With nothing wired up there is nothing to accept a code, so
    // the frame's action must not present itself as one (AGENTS.md §11.2).
    await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

    await fireEvent.changeText(screen.getByLabelText('Verification code'), STUB_CODE);

    expect(screen.getByTestId('verification-action')).toBeDisabled();
  });

  it('hands the completed code up, and moves on without a word when it was accepted', async () => {
    // There is no account service, so the route behind this screen stands in for one with a
    // single known code (PROJECT.md, ADR-027). What the screen does is the same either way:
    // it reports the code and lets the answer decide what happens next.
    const onSubmitCode = jest.fn(async () => true);
    await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        onSubmitCode={onSubmitCode}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Verification code'), STUB_CODE);
    await fireEvent.press(screen.getByTestId('verification-action'));

    expect(onSubmitCode).toHaveBeenCalledWith(STUB_CODE);
    expect(screen.queryByTestId('verification-verify-failed')).not.toBeOnTheScreen();
  });

  it('says so when the code was refused, and takes the message away when the code is edited', async () => {
    const onSubmitCode = jest.fn(async () => false);
    await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        onSubmitCode={onSubmitCode}
      />,
    );

    const field = screen.getByLabelText('Verification code');
    await fireEvent.changeText(field, '482169');

    const action = screen.getByTestId('verification-action');
    expect(action).not.toBeDisabled();

    await fireEvent.press(action);

    // The design draws no failure state, so this is written app-side like the other
    // screens' `saveFailed` lines — and it says what happened rather than leaving the
    // press silent (AGENTS.md §2.3).
    expect(
      screen.getByText('That code isn’t right. Check the six digits and try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('verification-verify-failed')).toHaveStyle({
      color: themes.light.colors.danger,
    });

    await fireEvent.changeText(field, '48216');
    expect(screen.queryByTestId('verification-verify-failed')).not.toBeOnTheScreen();
  });

  it('says the same thing when the session behind an accepted code could not be kept', async () => {
    // A store that refuses the write rejects the promise, and the screen must not read that as
    // the flow having moved on: there is no session, so nothing may look like one.
    const onSubmitCode = jest.fn(async () => {
      throw new Error('the keychain refused the write');
    });
    await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        onSubmitCode={onSubmitCode}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Verification code'), STUB_CODE);
    await fireEvent.press(screen.getByTestId('verification-action'));

    expect(screen.getByTestId('verification-verify-failed')).toBeOnTheScreen();
  });

  it('offers no verification at all in a production build, where nothing can check a code', async () => {
    const onSubmitCode = jest.fn(async () => true);
    await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        environment="production"
        onSubmitCode={onSubmitCode}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Verification code'), STUB_CODE);

    // A shipped build has no service to ask, so the action cannot act and must not offer
    // itself — and the stand-in code is not a way in (SECURITY.md: the client never
    // decides whether a credential is valid).
    const action = screen.getByTestId('verification-action');
    expect(action).toBeDisabled();

    await fireEvent.press(action);
    expect(onSubmitCode).not.toHaveBeenCalled();
    expect(screen.queryByTestId('verification-verify-failed')).not.toBeOnTheScreen();
  });

  it('leaves the frame’s resend row out until a caller can send a code', async () => {
    jest.useFakeTimers();

    try {
      // Asking for another code is the row's whole meaning, and nothing can send one: the app's
      // own route supplies no `onResend`, so neither the action nor the wait that paces it is
      // drawn rather than counting down to a press that cannot act (AGENTS.md §11.2, ADR-048).
      await render(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);

      expect(screen.queryByText('Resend code · available in')).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Resend code' })).not.toBeOnTheScreen();

      // The wait does not run behind it either — a cooldown for a send that cannot happen.
      await advanceSeconds(RESEND_COOLDOWN_SECONDS);

      expect(screen.queryByText('Resend code · available in')).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Resend code' })).not.toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('draws the frame’s resend row mid-wait when a caller can send one, and counts it down', async () => {
    jest.useFakeTimers();

    try {
      await render(
        <OnboardingVerificationScreen
          destination={ADDRESS}
          destinationKind="email"
          onResend={() => {}}
        />,
      );

      // The frame catches the cooldown in progress (“available in 00:28”); what it does
      // not say is what the action reads once it can act, which is the same sentence
      // without the countdown.
      expect(screen.getByText(formatCountdown(RESEND_COOLDOWN_SECONDS))).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Resend code' })).not.toBeOnTheScreen();

      await advanceSeconds(1);

      expect(screen.getByText('00:59')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers the resend once the cooldown is over, and starts the wait again when used', async () => {
    jest.useFakeTimers();
    const onResend = jest.fn();

    try {
      await render(
        <OnboardingVerificationScreen
          destination={ADDRESS}
          destinationKind="email"
          onResend={onResend}
        />,
      );

      await advanceSeconds(RESEND_COOLDOWN_SECONDS);

      await fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
      expect(onResend).toHaveBeenCalledTimes(1);

      // A fresh code has just been asked for, so the wait starts again from the top.
      expect(screen.queryByRole('button', { name: 'Resend code' })).not.toBeOnTheScreen();
      expect(screen.getByText(formatCountdown(RESEND_COOLDOWN_SECONDS))).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        onBack={onBack}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('only claims the change-address action when it can act', async () => {
    const onChangeDestination = jest.fn();
    const { rerender } = await render(
      <OnboardingVerificationScreen
        destination={ADDRESS}
        destinationKind="email"
        onChangeDestination={onChangeDestination}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Change email address' }));
    expect(onChangeDestination).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingVerificationScreen destination={ADDRESS} destinationKind="email" />);
    expect(screen.queryByRole('button', { name: 'Change email address' })).not.toBeOnTheScreen();
  });
});
