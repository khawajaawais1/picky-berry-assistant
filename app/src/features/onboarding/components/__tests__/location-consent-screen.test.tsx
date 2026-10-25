import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { layout, radii, spacing, themes, typography } from '@/constants/theme';
import { readPrivacyConsent, recordPrivacyConsent } from '@/services/privacy-consent';

import { OnboardingLocationConsentScreen } from '../location-consent-screen';

/**
 * Content and metrics come from Figma frame `05 · Onboarding · Location consent`
 * (node 5:22885) — the strings are written out literally so this test fails if the
 * screen silently changes its copy.
 *
 * What the row consents to is a stored record rather than this screen's own state
 * (ADR-020), because the privacy screen switches the same record off again — the promise
 * the row's own sentence makes — and it is visit tracking **while the app is open**: the
 * frame's background promise is withdrawn from the copy and put to the owner (ADR-047).
 */
const CONSENT =
  'I consent to visit tracking while the app is open. I can turn it off in Privacy settings.';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('OnboardingLocationConsentScreen', () => {
  it('renders the frame’s content', async () => {
    await render(<OnboardingLocationConsentScreen />);

    expect(screen.getByText('ONBOARDING · 05 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Find your bearings')).toBeOnTheScreen();
    expect(screen.getByText('Let the forest find you.')).toBeOnTheScreen();
    expect(
      screen.getByText('Location helps show nearby zones and recognise when you arrive and leave.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Nearby spots & directions')).toBeOnTheScreen();
    expect(screen.getByText('Precise location while you use Picky.')).toBeOnTheScreen();
    expect(screen.getByText('Automatic visit timing')).toBeOnTheScreen();
    // The frame's own line promises timing with the screen locked; the app reads a position in the
    // foreground only and says so (ADR-045, ADR-047).
    expect(
      screen.getByText('With your consent, visit timing runs only while the app is open.'),
    ).toBeOnTheScreen();
    expect(screen.getByText(CONSENT)).toBeOnTheScreen();
    expect(
      screen.getByText('Your exact GPS tracks are never shown to other people.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Continue to the map')).toBeOnTheScreen();
    expect(screen.getByText('Not now · browse without tracking')).toBeOnTheScreen();
  });

  it('names where the press leads rather than a settings step the app never takes', async () => {
    await render(<OnboardingLocationConsentScreen />);

    // The frame's own label reads “Continue to location settings”, and no such screen exists: the
    // consent is recorded here, and the platform's permission is asked **in** the app the first
    // time a screen reads a position (ADR-045). So the action says what the press does — it opens
    // the app's map, which is the illustration this screen draws above it (known issue 33, closed
    // by [ADR-050](../../../../../docs/adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)).
    expect(screen.getByRole('button', { name: 'Continue to the map' })).toBeOnTheScreen();
    expect(screen.queryByText(/location settings/i)).not.toBeOnTheScreen();
  });

  it('draws the frame’s zone map as the design’s preview, at the frame’s 342x192', async () => {
    await render(<OnboardingLocationConsentScreen />);

    // The frame's map holds the design's demo zones, not this user's, so it is presented
    // as an illustration — the two benefit rows below say the same thing in words.
    expect(screen.getByTestId('location-zone-map')).toHaveStyle({
      aspectRatio: 342 / 192,
      borderRadius: radii.lg,
    });
    expect(screen.getByTestId('location-zone-map-image').props.accessible).toBe(false);
  });

  it('uses the frame’s measured type metrics', async () => {
    await render(<OnboardingLocationConsentScreen />);

    expect(screen.getByText('Let the forest find you.')).toHaveStyle({
      fontSize: typography.title.fontSize,
      lineHeight: typography.title.lineHeight,
    });
    expect(screen.getByText('Nearby spots & directions')).toHaveStyle({
      fontSize: typography.cardTitle.fontSize,
      lineHeight: typography.cardTitle.lineHeight,
      fontWeight: '600',
    });
    expect(screen.getByText('Precise location while you use Picky.')).toHaveStyle({
      color: themes.light.colors.textMuted,
      fontSize: typography.caption.fontSize,
    });
    expect(screen.getByText('Your exact GPS tracks are never shown to other people.')).toHaveStyle({
      color: themes.light.colors.success,
      fontSize: typography.caption.fontSize,
    });
  });

  it('builds the benefits card and the action at the frame’s metrics', async () => {
    await render(<OnboardingLocationConsentScreen />);

    // Frame 05's “Card”: 342x158, 18 px radius, a 1 px border, an 18 px inset and its two
    // rows 10 px apart. NativeWind resolves a `gap-*` class to the gap's two axes, which
    // is what the style carries.
    expect(screen.getByTestId('location-benefits')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderColor: themes.light.colors.border,
      borderRadius: radii.lg,
      columnGap: spacing.cardGap,
      paddingBottom: spacing.section,
      paddingLeft: spacing.section,
      paddingRight: spacing.section,
      paddingTop: spacing.section,
      rowGap: spacing.cardGap,
    });

    // The action carries the frame's 54 px as a floor: at the largest system text size
    // its long label wraps, and the action grows around it (ADR-019 — the measurement
    // that found it is this screen's).
    expect(screen.getByTestId('location-consent-action')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderRadius: radii.control,
      minHeight: layout.actionHeight,
    });
  });

  it('starts the consent unchecked, unlike the frame, because consent must be given deliberately', async () => {
    await render(<OnboardingLocationConsentScreen />);

    // The design draws this row ticked; a pre-ticked consent box is not a valid
    // affirmative action, so the screen deliberately departs from the frame here — the
    // same departure screen 03 makes for its own consent row (PROJECT.md).
    expect(screen.getByRole('checkbox', { name: CONSENT })).not.toBeChecked();
  });

  it('shows the decision a returning user already made, and lets them continue', async () => {
    await recordPrivacyConsent(true);

    await render(<OnboardingLocationConsentScreen />);

    // The record is what the screen shows, so a user who consented and came back sees
    // their own answer rather than the design's drawn state.
    await waitFor(() => expect(screen.getByRole('checkbox', { name: CONSENT })).toBeChecked());
    expect(screen.getByTestId('location-consent-action')).not.toBeDisabled();
  });

  it('will not continue until the user has consented', async () => {
    const onContinue = jest.fn();
    await render(<OnboardingLocationConsentScreen onContinue={onContinue} />);

    expect(screen.getByTestId('location-consent-action')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('location-consent-action'));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('records a consent given by pressing the sentence', async () => {
    await render(<OnboardingLocationConsentScreen />);

    // The sentence is part of the control, not a label beside it (frontend review, 2026-10-25).
    await fireEvent.press(screen.getByText(CONSENT));

    await waitFor(() => expect(screen.getByTestId('location-consent-action')).not.toBeDisabled());
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: true });
  });

  it('records the decision, and reports it once the user has consented to visit tracking', async () => {
    const onContinue = jest.fn();
    await render(<OnboardingLocationConsentScreen onContinue={onContinue} />);

    await fireEvent.press(screen.getByRole('checkbox', { name: CONSENT }));

    await waitFor(() => expect(screen.getByTestId('location-consent-action')).not.toBeDisabled());
    // The consent lives on the device, not in this screen's state: that is what lets the
    // privacy screen switch the same record off (ADR-020).
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: true });

    await fireEvent.press(screen.getByTestId('location-consent-action'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('takes the consent back, and the action with it, when the user unticks the row', async () => {
    await render(<OnboardingLocationConsentScreen />);

    const consent = screen.getByRole('checkbox', { name: CONSENT });
    await fireEvent.press(consent);
    await waitFor(() => expect(screen.getByTestId('location-consent-action')).not.toBeDisabled());

    await fireEvent.press(consent);

    await waitFor(() => expect(screen.getByRole('checkbox', { name: CONSENT })).not.toBeChecked());
    expect(screen.getByTestId('location-consent-action')).toBeDisabled();
    // Withdrawing it is as easy as giving it, and it is written down: the record says what
    // is true now rather than keeping a gap where the consent used to be.
    await expect(readPrivacyConsent()).resolves.toMatchObject({ visitTracking: false });
  });

  it('always offers the way past the screen without tracking', async () => {
    const onSkip = jest.fn();
    const { rerender } = await render(<OnboardingLocationConsentScreen onSkip={onSkip} />);

    // Declining location must never be a dead end: the action is offered whether or not
    // the consent was given.
    await fireEvent.press(
      screen.getByRole('button', { name: 'Not now · browse without tracking' }),
    );
    expect(onSkip).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingLocationConsentScreen />);

    expect(
      screen.queryByRole('button', { name: 'Not now · browse without tracking' }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Not now · browse without tracking')).toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<OnboardingLocationConsentScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<OnboardingLocationConsentScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
