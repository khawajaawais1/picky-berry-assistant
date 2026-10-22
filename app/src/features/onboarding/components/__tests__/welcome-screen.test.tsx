import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import { OnboardingWelcomeScreen } from '../welcome-screen';

/**
 * Content and metrics come from Figma frame `01 · Onboarding · Welcome`
 * (node 5:22710) — the strings are written out literally so this test fails if the
 * screen silently changes its copy.
 */
describe('OnboardingWelcomeScreen', () => {
  it('renders the frame’s content', async () => {
    await render(<OnboardingWelcomeScreen />);

    expect(screen.getByText('ONBOARDING · 01 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Welcome to the outdoors')).toBeOnTheScreen();
    expect(screen.getByText('picky')).toBeOnTheScreen();
    expect(screen.getByText('Find. Pick. Share. Sustain.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Find promising berry spots in Finland, follow the season, and help keep the forest map fresh.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Fresh insights')).toBeOnTheScreen();
    expect(screen.getByText('Offline ready')).toBeOnTheScreen();
    expect(screen.getByText('Private by nature')).toBeOnTheScreen();
    expect(screen.getByText('Get started')).toBeOnTheScreen();
    expect(screen.getByText('Already have an account? Sign in')).toBeOnTheScreen();
    expect(screen.getByText('Made for Finland’s berry season · EN / FI')).toBeOnTheScreen();
  });

  it('shows the seasonal photograph the frame uses as the hero', async () => {
    await render(<OnboardingWelcomeScreen />);

    expect(screen.getByTestId('welcome-hero')).toBeOnTheScreen();
  });

  it('uses the frame’s measured type metrics', async () => {
    await render(<OnboardingWelcomeScreen />);

    expect(screen.getByText('Find. Pick. Share. Sustain.')).toHaveStyle({
      fontSize: typography.headline.fontSize,
      lineHeight: typography.headline.lineHeight,
    });
    expect(screen.getByText('picky')).toHaveStyle({
      fontSize: typography.brand.fontSize,
      lineHeight: typography.brand.lineHeight,
      fontWeight: typography.brand.fontWeight,
    });
    expect(screen.getByText('ONBOARDING · 01 / 05')).toHaveStyle({
      fontSize: typography.chip.fontSize,
      lineHeight: typography.chip.lineHeight,
    });
    expect(
      screen.getByText(
        'Find promising berry spots in Finland, follow the season, and help keep the forest map fresh.',
      ),
    ).toHaveStyle({ fontSize: typography.bodySmall.fontSize });
  });

  it('gives the three feature labels the design’s success colour', async () => {
    await render(<OnboardingWelcomeScreen />);

    for (const label of ['Fresh insights', 'Offline ready', 'Private by nature']) {
      expect(screen.getByText(label)).toHaveStyle({ color: themes.light.colors.success });
    }
  });

  it('makes the primary action the design’s 54 px control', async () => {
    await render(<OnboardingWelcomeScreen onGetStarted={() => {}} />);

    const action = screen.getByRole('button', { name: 'Get started' });
    expect(action).toHaveStyle({
      minHeight: layout.actionHeight,
      borderRadius: radii.control,
      backgroundColor: themes.light.colors.accent,
    });
  });

  it('invokes onGetStarted when the primary action is pressed', async () => {
    const onGetStarted = jest.fn();
    await render(<OnboardingWelcomeScreen onGetStarted={onGetStarted} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));

    expect(onGetStarted).toHaveBeenCalledTimes(1);
  });

  it('invokes onSignIn when the sign-in action is pressed', async () => {
    const onSignIn = jest.fn();
    await render(<OnboardingWelcomeScreen onSignIn={onSignIn} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Already have an account? Sign in' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
