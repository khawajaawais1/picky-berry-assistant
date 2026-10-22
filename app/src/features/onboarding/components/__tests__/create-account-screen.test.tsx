import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import {
  EMPTY_CREATE_ACCOUNT_FORM,
  type CreateAccountForm,
} from '../../domain/create-account-form';
import { OnboardingCreateAccountScreen } from '../create-account-screen';

/**
 * Content and metrics come from Figma frame `03 · Onboarding · Create account`
 * (node 5:22788) — the strings are written out literally so this test fails if the
 * screen silently changes its copy.
 */
const COMPLETE: CreateAccountForm = {
  ...EMPTY_CREATE_ACCOUNT_FORM,
  consent: true,
  identifier: 'aino@example.fi',
  name: 'Aino Korhonen',
  password: 'berries1',
};

const CONSENT = 'I agree to the Terms of use and acknowledge the Privacy notice.';

/** Fills the form the way a user would, so behaviour is exercised through the UI. */
async function fillForm(values: CreateAccountForm = COMPLETE) {
  await fireEvent.changeText(screen.getByLabelText('Your name'), values.name);
  await fireEvent.changeText(screen.getByLabelText('Email address'), values.identifier);
  await fireEvent.changeText(screen.getByLabelText('Password'), values.password);
  if (values.consent) {
    await fireEvent.press(screen.getByRole('checkbox', { name: CONSENT }));
  }
}

describe('OnboardingCreateAccountScreen', () => {
  it('renders the frame’s content', async () => {
    await render(<OnboardingCreateAccountScreen />);

    expect(screen.getByText('ONBOARDING · 03 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Create your account')).toBeOnTheScreen();
    expect(screen.getByText('A little introduction.')).toBeOnTheScreen();
    expect(
      screen.getByText('Save your spots and keep your picking history together.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Email')).toBeOnTheScreen();
    expect(screen.getByText('Phone number')).toBeOnTheScreen();
    expect(screen.getByText('Your name')).toBeOnTheScreen();
    expect(screen.getByText('Email address')).toBeOnTheScreen();
    expect(screen.getByText('Password')).toBeOnTheScreen();
    expect(screen.getByText('At least 8 characters, with a number.')).toBeOnTheScreen();
    expect(screen.getByText(CONSENT)).toBeOnTheScreen();
    expect(screen.getByText('Read terms & privacy')).toBeOnTheScreen();
    expect(screen.getByText('Create account')).toBeOnTheScreen();
    expect(screen.getByText('Already registered? Sign in')).toBeOnTheScreen();
    expect(screen.getByText('Your data stays yours')).toBeOnTheScreen();
    expect(
      screen.getByText('Saved spots default to private. Your GPS trails are never public.'),
    ).toBeOnTheScreen();
  });

  it('hints each field with the example the frame shows', async () => {
    await render(<OnboardingCreateAccountScreen />);

    expect(screen.getByPlaceholderText('Aino Korhonen')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('aino@example.fi')).toBeOnTheScreen();
  });

  it('uses the frame’s measured type metrics', async () => {
    await render(<OnboardingCreateAccountScreen />);

    expect(screen.getByText('A little introduction.')).toHaveStyle({
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
    });
    expect(screen.getByText('Create your account')).toHaveStyle({
      fontSize: typography.subtitle.fontSize,
    });
    expect(screen.getByText('Password')).toHaveStyle({ fontSize: 14, fontWeight: '600' });
    expect(screen.getByText('At least 8 characters, with a number.')).toHaveStyle({
      color: themes.light.colors.textMuted,
      fontSize: typography.metadata.fontSize,
    });
  });

  it('builds its fields as the design’s 54 px controls', async () => {
    await render(<OnboardingCreateAccountScreen />);

    for (const field of ['field-name', 'field-identifier', 'field-password']) {
      expect(screen.getByTestId(field)).toHaveStyle({
        backgroundColor: themes.light.colors.surface,
        borderColor: themes.light.colors.border,
        borderRadius: radii.control,
        // The design's 54 px control, as a floor: the value inside grows with the system text
        // size, and a field that kept the frame's height would clip it (ADR-019).
        minHeight: layout.actionHeight,
      });
    }
  });

  it('draws the design’s chip pair with the email chosen, as the frame shows it', async () => {
    await render(<OnboardingCreateAccountScreen />);

    expect(screen.getByRole('radio', { name: 'Email' })).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderRadius: radii.pill,
      height: layout.chipHeight,
    });
    expect(screen.getByRole('radio', { name: 'Phone number' })).not.toBeChecked();
  });

  it('draws the action, the sign-in action and the privacy note at the frame’s metrics', async () => {
    await render(<OnboardingCreateAccountScreen />);

    // The design's 54 px action is a floor: at the largest system text size a wrapped
    // label has to be able to grow the action rather than be cut off (ADR-019).
    expect(screen.getByTestId('create-account-action')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderRadius: radii.control,
      minHeight: layout.actionHeight,
    });
    expect(screen.getByTestId('create-account-privacy-note')).toHaveStyle({
      backgroundColor: themes.light.colors.successMuted,
      borderRadius: radii.control,
    });
    expect(screen.getByText('Already registered? Sign in')).toHaveStyle({
      color: themes.light.colors.accent,
      fontWeight: '600',
    });
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<OnboardingCreateAccountScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingCreateAccountScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('keeps the password masked until the user reveals it', async () => {
    await render(<OnboardingCreateAccountScreen />);

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });

  it('starts the consent unchecked, unlike the frame, because consent must be given deliberately', async () => {
    await render(<OnboardingCreateAccountScreen />);

    // The design draws this control ticked; a pre-ticked consent box is not a valid
    // affirmative action, so the screen deliberately departs from the frame here.
    expect(screen.getByRole('checkbox', { name: CONSENT })).not.toBeChecked();
  });

  it('will not submit an incomplete form', async () => {
    const onSubmit = jest.fn();
    await render(<OnboardingCreateAccountScreen onSubmit={onSubmit} />);

    const action = screen.getByTestId('create-account-action');
    expect(action).toBeDisabled();

    await fireEvent.press(action);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires consent before the form can be submitted', async () => {
    const onSubmit = jest.fn();
    await render(<OnboardingCreateAccountScreen onSubmit={onSubmit} />);

    await fillForm({ ...COMPLETE, consent: false });

    expect(screen.getByTestId('create-account-action')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('create-account-action'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reports the entered values once the form is complete', async () => {
    const onSubmit = jest.fn();
    await render(<OnboardingCreateAccountScreen onSubmit={onSubmit} />);

    await fillForm();
    await fireEvent.press(screen.getByTestId('create-account-action'));

    expect(onSubmit).toHaveBeenCalledWith(COMPLETE);
  });

  it('switches the identifier field to a phone number and drops what was typed', async () => {
    await render(<OnboardingCreateAccountScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email address'), 'aino@example.fi');
    await fireEvent.press(screen.getByRole('radio', { name: 'Phone number' }));

    // The chip and the field end up sharing the frame's copy: one “Phone number” is
    // the choice, the other is the field, which is how the design reads too.
    const sameName = screen.getAllByLabelText('Phone number');
    expect(sameName).toHaveLength(2);

    const identifierField = sameName.find((element) => 'keyboardType' in element.props);
    expect(identifierField?.props.value).toBe('');
    expect(identifierField?.props.keyboardType).toBe('phone-pad');
    expect(screen.queryByText('Email address')).not.toBeOnTheScreen();
  });

  it('only claims the link and sign-in actions when they can act', async () => {
    const onReadTerms = jest.fn();
    const onSignIn = jest.fn();
    const { rerender } = await render(
      <OnboardingCreateAccountScreen onReadTerms={onReadTerms} onSignIn={onSignIn} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Read terms & privacy' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Already registered? Sign in' }));

    expect(onReadTerms).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingCreateAccountScreen />);
    expect(screen.queryByRole('button', { name: 'Read terms & privacy' })).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Already registered? Sign in' }),
    ).not.toBeOnTheScreen();
  });
});
