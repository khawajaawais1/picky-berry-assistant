import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';
import { readSavedZones, saveZone } from '@/services/saved-zones';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../../domain/zone';
import { DEMO_ZONE_DETAILS } from '../../domain/zone-details';
import { ZoneDetailsScreen } from '../zone-details-screen';

/**
 * Frame 07 as the app can be true about it today (node `5:23032`): the header, the photograph,
 * the yield card, the outlook, the freshest report and the frame's own **“Save zone”** bookmark —
 * the frame's own words, in the frame's own order.
 *
 * Three things here are asserted rather than assumed. The state chip says **“Unpicked”**, the
 * word the map's legend uses for the same zone, so screen 06 and screen 07 describe the same
 * zone the same way. The **bookmark really saves**: it writes the picker's own plan on this
 * device and takes it back out, so the control shows a state the app kept rather than one a
 * screen remembered (ADR-024). And the one line on the screen that could be read as a promise —
 * the forecast — is the frame's own disclaimer, present and translated.
 *
 * The frame's figures are its own sample for the season demo, so the header carries the same
 * “SEASON DEMO” disclosure frame 06's map carries. A reader is told where the numbers come from
 * on the screen that shows them; the note in PROJECT.md is not a disclosure to a user.
 *
 * Where the frame draws an action with nothing behind it, the screen draws the design's words
 * instead and no role (its “Navigate” until a route supplies frame 08). Its “See all 11” is the
 * fourth: the list it names is app-drawn, because the design never drew it, and the row is a
 * control only when the route supplies that list (ADR-044).
 */
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ZoneDetailsScreen', () => {
  it('renders the frame’s header, naming the zone, the place and the demo they come from', async () => {
    await render(<ZoneDetailsScreen />);

    // The figures below are the design's sample, and the header says so in the words frame 06
    // uses for the same demo season.
    expect(screen.getByText('CORE PICKER · ZONE INSIGHT · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Zone 14 · Laajavuori')).toBeOnTheScreen();
  });

  it('renders the frame’s photograph', async () => {
    await render(<ZoneDetailsScreen />);

    expect(screen.getByTestId('zone-details-hero')).toBeOnTheScreen();
    expect(screen.getByLabelText('Berry season photograph')).toBeOnTheScreen();
  });

  it('leads with the yield card: the score, its confidence and the reports behind it', async () => {
    await render(<ZoneDetailsScreen />);

    const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

    expect(screen.getByText(String(zone?.score))).toBeOnTheScreen();
    expect(screen.getByText('/ 100 yield score')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('11 reports this week')).toBeOnTheScreen();
  });

  it('sets the score at the frame’s own hero metrics', async () => {
    await render(<ZoneDetailsScreen />);

    // The one type slot the frame gives a number this large; it is a token, not a literal.
    expect(screen.getByTestId('zone-yield-score')).toHaveStyle({
      fontSize: typography.metric.fontSize,
      lineHeight: typography.metric.lineHeight,
    });
  });

  it('names the zone’s state in the map legend’s vocabulary, beside its ripeness', async () => {
    await render(<ZoneDetailsScreen />);

    // “Unpicked” is frame 06's word for this zone; a second wording here is how one screen
    // would start describing the same colour differently from the other.
    expect(screen.getByText('Unpicked')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();
  });

  it('says out loud that the figures are a forecast, not a promise', async () => {
    await render(<ZoneDetailsScreen />);

    expect(
      screen.getByText('A forecast of conditions, not a guaranteed harvest.'),
    ).toBeOnTheScreen();
  });

  it('names the species the zone is reported for, the first in the frame’s accent fill', async () => {
    await render(<ZoneDetailsScreen />);

    // The frame's own row (node `5:23047`) under the photograph: what grows in this zone, the
    // main berry in the accent fill its first chip carries. They are data rather than a filter —
    // a single zone's screen has nothing for a species to filter — so they claim no role.
    expect(screen.getByTestId('zone-species-chips')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-species-chip-lingonberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('zone-species-chip-bilberry')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderColor: themes.light.colors.border,
    });
    expect(screen.getByText('Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Bilberry')).toBeOnTheScreen();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    // The frame's third chip (“More”) opens a species index the app does not have.
    expect(screen.queryByText('More')).not.toBeOnTheScreen();
  });

  it('renders today’s outlook with the weather line the frame draws', async () => {
    await render(<ZoneDetailsScreen />);

    expect(screen.getByText('Today’s outlook')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Ripe lingonberries after a warm week. Similar conditions expected tomorrow.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('18°C · Light wind · Forecast at 08:00')).toBeOnTheScreen();
  });

  it('renders the freshest report with its provenance, age and the reporter’s own reading', async () => {
    await render(<ZoneDetailsScreen />);

    expect(screen.getByText('Fresh from pickers')).toBeOnTheScreen();
    expect(screen.getByText('“Plenty of ripe clusters near the trail.”')).toBeOnTheScreen();
    expect(screen.getByText('Trusted report · 38 min ago · 4 / 5 yield')).toBeOnTheScreen();
    expect(
      screen.getByText('Scores weight freshness, trust and nearby agreement.'),
    ).toBeOnTheScreen();
  });

  it('prints the count of reports beside the list it names', async () => {
    await render(<ZoneDetailsScreen />);

    // The same week's count the yield card gives, in the frame's own words.
    expect(screen.getByText('See all 11')).toBeOnTheScreen();
    expect(DEMO_ZONE_DETAILS.reportsThisWeek).toBe(11);
  });

  it('offers the frame’s Navigate action once there is a route to open', async () => {
    const onNavigate = jest.fn();
    await render(<ZoneDetailsScreen onNavigate={onNavigate} />);

    // The frame draws the action because it is the way on to frame 08, and its own words name
    // the walk — read from that screen's own demo route, so the two cannot disagree.
    fireEvent.press(screen.getByRole('button', { name: 'Navigate · 1.4 km' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('offers no action without a destination, and none it cannot act on', async () => {
    const { rerender } = await render(<ZoneDetailsScreen />);

    // Without somewhere to go, the frame's action is not drawn: a button that does nothing is
    // what this repository does not ship. The frame's species chips are not actions either — a
    // single zone's screen has nothing for a species to narrow — and “See all 11” stays the
    // design's words while no route supplies the list it names — so the only control is the
    // bookmark, which does act (ADR-024).
    expect(screen.queryByText('Navigate · 1.4 km')).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Save zone' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('link')).toHaveLength(0);

    await rerender(<ZoneDetailsScreen onBack={jest.fn()} />);

    // The route's own back control joins it.
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('See all 11')).toBeOnTheScreen();
  });

  it('saves the zone the screen is about, and takes it back out again', async () => {
    await render(<ZoneDetailsScreen />);

    const save = screen.getByRole('button', { name: 'Save zone' });
    expect(save.props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(save);

    // The frame's own control (node 5:23081): what the picker pressed is on the device, and the
    // control's state is the record's, not a screen's own memory.
    const saved = await screen.findByRole('button', {
      name: 'Remove zone from saved zones',
    });
    expect(saved.props.accessibilityState).toMatchObject({ selected: true });
    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: expect.any(String), zoneId: DEMO_ZONE_DETAILS.zoneId },
    ]);

    await fireEvent.press(saved);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save zone' }).props.accessibilityState,
      ).toMatchObject({ selected: false }),
    );
    await expect(readSavedZones()).resolves.toEqual([]);
  });

  it('opens already saved when the zone is in the picker’s plan', async () => {
    await saveZone(DEMO_ZONE_DETAILS.zoneId);

    await render(<ZoneDetailsScreen />);

    expect(
      await screen.findByRole('button', { name: 'Remove zone from saved zones' }),
    ).toBeOnTheScreen();
  });

  it('claims no saved state while the plan is still being read', async () => {
    // A record that has not answered is not a “not saved”: the control is drawn disabled, so it
    // claims no state rather than the wrong one.
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => {}));

    await render(<ZoneDetailsScreen />);

    expect(screen.getByTestId('zone-details-save').props.accessibilityState).toMatchObject({
      disabled: true,
      selected: false,
    });

    jest.restoreAllMocks();
  });

  it('says so when the device will not keep the zone, instead of lighting the bookmark', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await render(<ZoneDetailsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save zone' }));

    expect(
      await screen.findByText('This zone could not be saved or removed on this phone.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Save zone' }).props.accessibilityState,
    ).toMatchObject({ selected: false });

    jest.restoreAllMocks();
  });

  it('offers the frame’s report list once there is one to open, and names where it leads', async () => {
    const onSeeReports = jest.fn();
    await render(<ZoneDetailsScreen onSeeReports={onSeeReports} />);

    // The visible label stays the frame's own (“See all 11”), and the accessible name says where
    // the press leads: the frame's eleven are the design's sample week and the list behind this
    // control is the picker's own record, so a screen reader user is told which of the two it is
    // (the rule frame 16's contact action follows, ADR-044).
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'See all 11 reports · opens the reports saved on this phone',
      }),
    );

    expect(onSeeReports).toHaveBeenCalledTimes(1);
    expect(screen.getByText('See all 11')).toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<ZoneDetailsScreen onBack={onBack} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<ZoneDetailsScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('paints its two chips on the success tint the frame gives them', async () => {
    await render(<ZoneDetailsScreen />);

    for (const label of ['Unpicked', 'Ripe now']) {
      expect(screen.getByText(label).parent).toHaveStyle({
        backgroundColor: themes.light.colors.successMuted,
      });
    }
  });
});
