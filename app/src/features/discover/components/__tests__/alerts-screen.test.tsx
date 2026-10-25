import { render, screen, within } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';

import { AlertsScreen } from '../alerts-screen';

/**
 * Frame 12 as the app can be true about it today (node `5:23439`): the design's alert, the three
 * reasons it gives for it, and the note that says what the figures are made of — nothing. The
 * header carries the “SEASON DEMO” disclosure and the note says the alert is a sample, because
 * no weather, season or report source is connected.
 *
 * Its **alert preferences** card is drawn as the design's own sample (ADR-043): the frame names the
 * capability, and the four rows are the design's own settings, which the card says on itself. Its
 * **“View Zone 18”** action is the part still deliberately absent and asserted as absent — the
 * app's demo map has no Zone 18, and an action that opens nothing must not claim a role
 * (AGENTS.md §11.2).
 */
describe('AlertsScreen', () => {
  it('renders the frame’s header and its alert', async () => {
    await render(<AlertsScreen />);

    expect(screen.getByText('CORE PICKER · FORECAST REASONING · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('A heads-up from the forest')).toBeOnTheScreen();
    expect(screen.getByText('TODAY · 28 Aug · 09:30')).toBeOnTheScreen();
    // The frame's headline at 24/33.6 (node 5:23456): the design's own type slot.
    expect(screen.getByText('Ripe bilberries 1.8 km north')).toHaveStyle({
      fontSize: typography.heroTitle.fontSize,
    });
  });

  it('says how good it is and how sure it is, in the words the zone screen uses', async () => {
    await render(<AlertsScreen />);

    expect(screen.getByText('82 / 100 yield')).toBeOnTheScreen();
    // The same vocabulary as frame 07's zone card: one idea, one word.
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByTestId('alert-confidence')).toHaveStyle({
      backgroundColor: themes.light.colors.successMuted,
    });
    expect(screen.getByTestId('alert-score')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
    });
    expect(screen.getByText('Zone 18 · Laajavuori · Latest report 60 min ago')).toBeOnTheScreen();
  });

  it('draws the frame’s own three reasons, each with its own line', async () => {
    await render(<AlertsScreen />);

    expect(screen.getByText('Why this alert?')).toBeOnTheScreen();
    expect(screen.getByText('A warm week')).toBeOnTheScreen();
    expect(screen.getByText('Three warm days support ripening.')).toBeOnTheScreen();
    expect(screen.getByText('Rain on Sunday')).toBeOnTheScreen();
    expect(screen.getByText('Recent moisture supports berry growth.')).toBeOnTheScreen();
    expect(screen.getByText('Last picked 6 days ago')).toBeOnTheScreen();
    expect(screen.getByText('Fresh reports suggest a promising return.')).toBeOnTheScreen();
  });

  it('says the alert is a sample, since nothing weather-, season- or report-shaped is connected', async () => {
    await render(<AlertsScreen />);

    // The frame's note claims a forecast combining weather, season and trust-weighted reports.
    // Nothing combines anything, so the line says what is true and keeps the design's own
    // promise that a harvest is never guaranteed.
    expect(
      screen.getByText(
        'A sample alert. No weather, season or report source is connected yet, and a harvest is never guaranteed.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        'Forecasts combine weather, season and trust-weighted reports. Harvests aren’t guaranteed.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('draws the frame’s own alert preferences as the design’s sample, claiming no role', async () => {
    await render(<AlertsScreen />);

    // The frame's card (nodes 5:23480–5:23504), drawn rather than omitted, with its own four rows
    // and its own values — and the closing line that keeps them from reading as this phone's.
    const card = within(screen.getByTestId('alert-preferences'));

    expect(card.getByText('Your alert preferences')).toBeOnTheScreen();
    expect(card.getByText('Ripe-berry push alerts')).toBeOnTheScreen();
    expect(card.getByText('Search radius')).toBeOnTheScreen();
    expect(card.getByText('3 km')).toBeOnTheScreen();
    expect(card.getByText('Quiet hours')).toBeOnTheScreen();
    expect(card.getByText('21:00–07:00')).toBeOnTheScreen();
    expect(card.getByText('Species')).toBeOnTheScreen();
    expect(card.getByText('Bilberry + 1')).toBeOnTheScreen();
    expect(card.getByTestId('alert-preferences-sample')).toBeOnTheScreen();

    // The frame's switch is a figure: nothing delivers an alert and no permission is asked for, so
    // it is a drawing with no role rather than a control that would turn on nothing.
    expect(card.getByTestId('alert-preferences-push-figure')).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  it('does not offer to open a zone the app does not have', async () => {
    await render(<AlertsScreen />);

    // The frame's alert is about Zone 18, which is not on the app's demo map; the screen reports
    // the press it cannot honour rather than drawing an action that would open nothing.
    expect(screen.queryByRole('button', { name: 'View Zone 18' })).not.toBeOnTheScreen();
    expect(screen.queryByText('View Zone 18')).not.toBeOnTheScreen();
  });
});
