import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, spacing, themes, typography } from '@/constants/theme';

import { ZONE_APPEARANCE } from '../../domain/zone';
import { DEMO_ROUTE, formatDistance } from '../../domain/route';
import { MAP_ANCHORS, MAP_HEIGHT, MAP_ROUTE_PATH } from '../../domain/zone-map-geometry';
import { RouteToZoneScreen } from '../route-to-zone-screen';

/**
 * Frame 08 as the app can be true about it today (node `5:23106`): the offline note, the same
 * map stretched to 322 px with the frame's own route over it, the distance and arrival card,
 * the next turn, and the frame's way out.
 *
 * Three things are asserted rather than assumed. The route is **drawn**: the frame's own path
 * is in the drawing, and the map is the height the frame gives it. The card's distance is the
 * **same number** screen 07's action offers — one walk, one figure. And the screen's primary
 * action is **absent**, deliberately: “Start walking” opens frame 09, which does not exist yet,
 * and a primary button that does nothing is what this repository does not ship.
 *
 * The frame's offline note is the frame's claim that map tiles have been downloaded, and this
 * app downloads none: the note is drawn as what the app can be true about — the boundaries are
 * drawn from data on the device — with the tile cache named as the thing that is still missing.
 * The header carries the “SEASON DEMO” disclosure for the rest of the frame's figures.
 */
describe('RouteToZoneScreen', () => {
  it('renders the frame’s header, its demo disclosure and what the note may claim', async () => {
    await render(<RouteToZoneScreen />);

    expect(screen.getByText('CORE PICKER · WALKING ROUTE · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('To Zone 14')).toBeOnTheScreen();
    // The frame's “Map ready offline” is a promise about a tile cache this app does not have.
    // What it says instead is what it does: the map is drawn here, and tiles are not downloaded.
    expect(screen.getByText('Map drawn on this device')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Laajavuori: zone boundaries are drawn on this device. Map tiles aren’t downloaded yet.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Map ready offline')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('Laajavuori tiles and zone boundaries are cached.'),
    ).not.toBeOnTheScreen();
  });

  it('draws the frame’s map at the height the frame gives it, with its own route', async () => {
    const view = await render(<RouteToZoneScreen />);

    expect(screen.getByTestId('zone-map')).toHaveStyle({ height: layout.routeMapHeight });
    expect(screen.getByTestId('zone-map-route')).toBeOnTheScreen();
    expect(JSON.stringify(view.toJSON())).toContain(MAP_ROUTE_PATH);

    // The same drawing, stretched: the place name sits where frame 08 draws it (y144.9), which
    // is frame 06's y135 times 322/300, and nothing moves sideways.
    const stretch = layout.routeMapHeight / MAP_HEIGHT;
    expect(screen.getByText('Laajavuori')).toHaveStyle({ top: MAP_ANCHORS.place.y * stretch });
  });

  it('prints the walk the frame’s card prints, at the frame’s own metrics', async () => {
    await render(<RouteToZoneScreen />);

    expect(screen.getByText('1.4 km')).toBeOnTheScreen();
    expect(screen.getByText('Walking distance')).toBeOnTheScreen();
    expect(screen.getByText('22 min')).toBeOnTheScreen();
    expect(screen.getByText('Estimated arrival · 10:03')).toBeOnTheScreen();
    expect(screen.getByTestId('route-distance')).toHaveStyle({
      color: themes.light.colors.accent,
      fontSize: typography.stat.fontSize,
      lineHeight: typography.stat.lineHeight,
    });
  });

  it('prints the distance screen 07’s action names, so one walk has one number', async () => {
    await render(<RouteToZoneScreen />);

    // 1.4 km is DEMO_ROUTE's distance, formatted for the language: the card, and the action on
    // the zone screen that opens this one, read one value (frame 07's card line says it too).
    expect(DEMO_ROUTE.distanceMeters).toBe(1400);
    expect(screen.getByText(formatDistance(DEMO_ROUTE.distanceMeters, 'en'))).toBeOnTheScreen();
  });

  it('names the next turn on the trail, with the direction as its own word', async () => {
    await render(<RouteToZoneScreen />);

    expect(screen.getByText('Follow the forest trail')).toBeOnTheScreen();
    expect(screen.getByText('Keep right in 180 m, toward Laajavuori')).toBeOnTheScreen();
  });

  it('draws the card’s own divider in the frame’s border colour', async () => {
    await render(<RouteToZoneScreen />);

    expect(screen.getByTestId('route-card-divider')).toHaveStyle({
      backgroundColor: themes.light.colors.border,
    });
    expect(screen.getByTestId('route-card')).toHaveStyle({ borderRadius: radii.lg });
  });

  it('keeps the frame’s supporting line, which is what the estimates are worth', async () => {
    await render(<RouteToZoneScreen />);

    expect(
      screen.getByText(
        'Stay on marked trails where possible. Route estimates may vary with forest terrain.',
      ),
    ).toBeOnTheScreen();
  });

  it('offers the way out the frame draws, and hands its press to the caller', async () => {
    const onCancel = jest.fn();
    await render(<RouteToZoneScreen onCancel={onCancel} />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel route' }));

    // The feature imports no router: it reports the press and the route decides where it goes.
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<RouteToZoneScreen onBack={onBack} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<RouteToZoneScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('offers “Start walking” now that the visit it opens exists, and hands the press to the caller', async () => {
    const onStart = jest.fn();

    await render(<RouteToZoneScreen onCancel={jest.fn()} onStart={onStart} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start walking' }));

    // The frame's primary action, drawn the moment screen 09 could receive it: the feature
    // imports no router, so the route decides where the walk goes.
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does not draw a primary action when the route has nowhere to take it', async () => {
    await render(<RouteToZoneScreen onCancel={jest.fn()} />);

    // A primary button that does nothing is the one thing this repository does not ship
    // (AGENTS.md §11.2) — and the screen then offers exactly the one control it can honour.
    expect(screen.queryByText('Start walking')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('route-start')).not.toBeOnTheScreen();
    expect(screen.queryAllByRole('button')).toHaveLength(1);
  });

  it('keeps the frame’s own row title weight for the guidance line', async () => {
    await render(<RouteToZoneScreen />);

    expect(screen.getByText('Follow the forest trail')).toHaveStyle({
      fontSize: typography.rowTitle.fontSize,
      fontWeight: typography.rowTitle.fontWeight,
    });
  });

  it('leaves the card the frame’s own inset and gap', async () => {
    await render(<RouteToZoneScreen />);

    expect(screen.getByTestId('route-card')).toHaveStyle({
      gap: spacing.cardGap,
      padding: spacing.section,
    });
    // The route is the accent stroke over the zone polygons, as the frame paints it.
    expect(ZONE_APPEARANCE.unpicked.line).toBe('success');
  });
});
