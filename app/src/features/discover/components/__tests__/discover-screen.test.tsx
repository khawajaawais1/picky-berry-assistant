import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes } from '@/constants/theme';

import { ZONE_APPEARANCE, ZONE_STATES } from '../../domain/zone';
import { DiscoverScreen } from '../discover-screen';

/**
 * Frame 06 as the app can be true about it: the header, the frame's search field and species
 * chips, the map it draws (filtered by those two controls), the legend, the zone card that
 * opens the zone screen, the frame's map/list toggle and the glyph that leads to the offline
 * centre.
 *
 * The controls are asserted by what they *do* — which zones the map is left drawing, what the
 * list holds, what the toggle switches — because that is the difference between a chip that
 * filters and a chip that is decoration (AGENTS.md §11.2). What is still deliberately absent is
 * the frame's **recentre control**, which needs a map that moves (the drawing does not), and
 * the **core navigation**, which is the app shell's (ADR-022).
 */
describe('DiscoverScreen', () => {
  it('renders the frame’s header and its blocks', async () => {
    await render(<DiscoverScreen />);

    expect(screen.getByText('CORE PICKER · SEASON DEMO / 28 AUG')).toBeOnTheScreen();
    expect(screen.getByText('Discover nearby')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-search-field')).toBeOnTheScreen();
    expect(screen.getByTestId('species-chips')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-map')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-state-legend')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-card')).toBeOnTheScreen();
    expect(screen.getByTestId('map-list-toggle')).toBeOnTheScreen();
  });

  it('names the three zone states in the order the frame’s legend does', async () => {
    await render(<DiscoverScreen />);

    expect(screen.getByText('Unpicked')).toBeOnTheScreen();
    expect(screen.getByText('Picked recently')).toBeOnTheScreen();
    expect(screen.getByText('Ripening')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zone states')).toBeOnTheScreen();
  });

  it('paints each legend swatch in the colour its zone is outlined in', async () => {
    await render(<DiscoverScreen />);

    // The pairing that makes the legend readable rather than decorative: the swatch and the
    // polygon come from one token, so they cannot show different colours.
    for (const state of ZONE_STATES) {
      expect(screen.getByTestId(`zone-state-legend-swatch-${state}`)).toHaveStyle({
        backgroundColor: themes.light.colors[ZONE_APPEARANCE[state].line],
        borderRadius: radii.xs,
        height: layout.mapLegendSwatch,
        width: layout.mapLegendSwatch,
      });
    }
  });

  it('renders the zone card with the frame’s own values', async () => {
    await render(<DiscoverScreen />);

    expect(screen.getByText('Zone 14 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori · 1.4 km walk')).toBeOnTheScreen();
    expect(screen.getByText('78 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('Unpicked · Ripe · Report updated 38 min ago')).toBeOnTheScreen();
  });

  it('promises the destination the card can reach, and only that one', async () => {
    const onOpenZone = jest.fn();
    const { rerender } = await render(<DiscoverScreen onOpenZone={onOpenZone} />);

    // The frame draws a chevron on the card because the card opens screen 07's zone details:
    // with somewhere to go, the chevron is drawn and the card is that one control, named for
    // where it leads rather than read out as every value on it.
    expect(screen.getByTestId('zone-card-chevron')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open zone 14 details' })).toBeOnTheScreen();

    await rerender(<DiscoverScreen />);

    // Without one, the chevron is not drawn and the card claims no role: a chevron on a card
    // that does nothing promises a destination the app does not have (AGENTS.md §11.2).
    // The screen's other controls are unaffected — the toggle beside the card is what switches
    // the view, and it exists whether or not the card can lead anywhere.
    expect(screen.queryByTestId('zone-card-chevron')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open zone 14 details' })).not.toBeOnTheScreen();
    expect(screen.getByTestId('zone-card')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Show zone list' })).toBeOnTheScreen();
  });

  it('hands the card’s press to the caller, which is where navigation lives', async () => {
    const onOpenZone = jest.fn();
    await render(<DiscoverScreen onOpenZone={onOpenZone} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Open zone 14 details' }));

    // The feature knows nothing about routes: it reports the press and the route decides
    // where it leads.
    expect(onOpenZone).toHaveBeenCalledTimes(1);
  });

  it('keeps every zone on the map while nothing is asked of the two controls', async () => {
    await render(<DiscoverScreen />);

    // The map's own labels for the frame's three zones, which is what the filter moves.
    expect(screen.getByText('Z09')).toBeOnTheScreen();
    expect(screen.getByText('Z21')).toBeOnTheScreen();
    expect(screen.getByText('· Z14')).toBeOnTheScreen();
    // Nothing is filtered away, so the screen says nothing about matches: the frame draws
    // no such line, and a line reading “3 zones match” would be noise on the screen it does
    // draw.
    expect(screen.queryByTestId('discover-filter-status')).not.toBeOnTheScreen();
  });

  it('searches a zone by the label the map draws, and says what the search left', async () => {
    await render(<DiscoverScreen />);

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Z09');

    expect(screen.getByText('Z09')).toBeOnTheScreen();
    expect(screen.queryByText('Z21')).not.toBeOnTheScreen();
    expect(screen.queryByText('· Z14')).not.toBeOnTheScreen();
    expect(screen.getByText('1 zone matches')).toBeOnTheScreen();
    // The card is the frame's own zone (Z14), and that zone is not in the result any more:
    // the card goes with it rather than standing over a map it does not describe.
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
  });

  it('searches a place by part of its name, which is what the frame’s field promises', async () => {
    await render(<DiscoverScreen />);

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'laaja');

    expect(screen.getByText('· Z14')).toBeOnTheScreen();
    expect(screen.queryByText('Z09')).not.toBeOnTheScreen();
  });

  it('says so, and draws no zone, when the search names a place that is not here', async () => {
    await render(<DiscoverScreen />);

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Kilimajärvi');

    expect(screen.getByText('No zone matches this search')).toBeOnTheScreen();
    expect(screen.queryByText('Z09')).not.toBeOnTheScreen();
    // The legend stays: it names the colours the map paints with, and the map is still the
    // map the picker is looking at.
    expect(screen.getByTestId('zone-state-legend')).toBeOnTheScreen();
  });

  it('filters by the species a zone was reported for, one chip at a time', async () => {
    await render(<DiscoverScreen />);

    const cloudberry = screen.getByRole('checkbox', { name: 'Cloudberry' });
    expect(cloudberry).not.toBeChecked();

    await fireEvent.press(cloudberry);

    // A chip that cannot filter is decoration, so the chips' own state and the map have to
    // agree: cloudberry is on, and the zones nobody reported it in are gone.
    expect(screen.getByRole('checkbox', { name: 'Cloudberry' })).toBeChecked();
    expect(screen.getByText('Z21')).toBeOnTheScreen();
    expect(screen.queryByText('Z09')).not.toBeOnTheScreen();
    expect(screen.queryByText('· Z14')).not.toBeOnTheScreen();
  });

  it('keeps a zone reported for two berries, and drops a chip that is turned off again', async () => {
    await render(<DiscoverScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Bilberry' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Cloudberry' }));

    // Zone 14 is reported for lingonberry and bilberry (frame 07's own two chips), so the
    // bilberry chip keeps it on the map beside zone 09.
    expect(screen.getByText('3 zones match')).toBeOnTheScreen();
    expect(screen.getByText('Z09')).toBeOnTheScreen();
    expect(screen.getByText('Z21')).toBeOnTheScreen();
    expect(screen.getByText('· Z14')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Bilberry' }));

    expect(screen.getByRole('checkbox', { name: 'Bilberry' })).not.toBeChecked();
    expect(screen.getByText('1 zone matches')).toBeOnTheScreen();
    expect(screen.queryByText('Z09')).not.toBeOnTheScreen();
    expect(screen.getByText('Z21')).toBeOnTheScreen();
  });

  it('finds nothing when the two controls ask for different things', async () => {
    await render(<DiscoverScreen />);

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Z09');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Cloudberry' }));

    // Both controls narrow the same result: zone 09 is a bilberry zone, so asking for
    // cloudberries there leaves nothing — and saying “3 zones” would tell the picker the
    // opposite of the truth.
    expect(screen.getByText('No zone matches this search')).toBeOnTheScreen();
    expect(screen.queryByText('Z09')).not.toBeOnTheScreen();
  });

  it('switches to the zone list the frame’s toggle names, and back to the map', async () => {
    await render(<DiscoverScreen />);

    expect(screen.getByText('Map selected')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));

    // The list is a view of the same zones: the map and the card step aside for it, and each
    // row names the zone, its species, its state in the legend's word and its yield.
    expect(screen.queryByTestId('zone-map')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
    expect(screen.getByTestId('zone-list')).toBeOnTheScreen();
    expect(screen.getByText('Zone 09 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('Picked recently')).toBeOnTheScreen();
    expect(screen.getByText('78 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('Zone list')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Show map' }));

    expect(screen.getByTestId('zone-map')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list')).not.toBeOnTheScreen();
  });

  it('lists only what the filter kept', async () => {
    await render(<DiscoverScreen />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Cloudberry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));

    expect(screen.getByText('Zone 21 · Cloudberry')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-list-row-Z21')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list-row-Z14')).not.toBeOnTheScreen();
  });

  it('offers the offline centre where the frame draws its download glyph', async () => {
    const onOpenDownloads = jest.fn();
    const { rerender } = await render(<DiscoverScreen onOpenDownloads={onOpenDownloads} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Offline maps and downloads' }));
    expect(onOpenDownloads).toHaveBeenCalledTimes(1);

    await rerender(<DiscoverScreen />);

    // With nowhere to send it, the glyph is not drawn and claims no role (AGENTS.md §11.2).
    expect(
      screen.queryByRole('button', { name: 'Offline maps and downloads' }),
    ).not.toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<DiscoverScreen onBack={onBack} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<DiscoverScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
