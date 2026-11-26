import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes } from '@/constants/theme';

import { ZONE_SCORE_BANDS } from '../../domain/zone-score-band';
import type { Zone } from '../../domain/zone-source';
import { ZoneMap } from '../zone-map';

/**
 * Screen 06's map, after the drawn illustration was retired for the pilot's real zones
 * (ADR-053). What this holds:
 *
 * - the map draws **exactly the zones the screen passes it** — the same answer the card and
 *   the list read, which is the single-dataset rule known issue 14 recorded;
 * - a map with no polygons says **why** — loading, empty or failed — instead of drawing an
 *   empty world;
 * - the device's canvas is MapLibre over OpenFreeMap's basemap, pans and zooms, and has a
 *   recentre control to fit the zones again;
 * - the drawing carries its text alternative (known issue 35), and nothing on the map is a
 *   control the frame cannot act on.
 *
 * Asking the source is the screen's job now (`useZones`, tested in the hook and the screen);
 * this file deliberately has no `ZoneSource` at all.
 */

function zone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    h3: '8811250e25fffff',
    name: 'Laajavuori 1',
    score: 53,
    confidence: 'medium',
    ripeness: 'past',
    scores: {},
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
    ...overrides,
  };
}

describe('ZoneMap', () => {
  it('draws the zones it is given, and how many they are', async () => {
    const zones = [zone(), zone({ id: 'b', name: 'Laajavuori 2', score: 81 })];

    await render(<ZoneMap status="ready" zones={zones} />);

    expect(screen.getByTestId('zone-map-drawing')).toBeOnTheScreen();
    expect(screen.getByText('Jyväskylä')).toBeOnTheScreen();
    expect(screen.getByText('2 zones')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-map')).toHaveStyle({
      backgroundColor: themes.light.colors.mapBase,
      borderRadius: radii.lg,
      height: layout.mapHeight,
    });
  });

  it('says “one zone” in the singular, because a search can leave exactly one', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    expect(screen.getByText('1 zone')).toBeOnTheScreen();
  });

  it('keeps the street map on screen while it loads, with the loading line over it', async () => {
    await render(<ZoneMap status="loading" zones={[]} />);

    expect(screen.getByTestId('zone-map-status')).toHaveTextContent('Loading zones…');
    // A blank tint in place of the map reads as a broken screen; the basemap is drawn either way.
    expect(screen.getByTestId('zone-map-drawing')).toBeOnTheScreen();
  });

  it('frames the pilot area when there are no zones to fit, instead of the whole world', async () => {
    await render(<ZoneMap status="ready" zones={[]} />);

    expect(screen.getByTestId('zone-map-drawing')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-map-camera').props.bounds).toEqual([25.5, 62.15, 25.9, 62.35]);
    // Nothing to fit back to, and no count to claim.
    expect(screen.queryByTestId('zone-map-recentre')).not.toBeOnTheScreen();
    expect(screen.queryByText('0 zones')).not.toBeOnTheScreen();
  });

  it('distinguishes a source that returned nothing from one that failed', async () => {
    const empty = await render(<ZoneMap status="ready" zones={[]} />);
    expect(screen.getByTestId('zone-map-status')).toHaveTextContent('No zones to show');

    const failed = await render(<ZoneMap status="error" zones={[]} />);
    expect(screen.getByTestId('zone-map-status')).toHaveTextContent('Zones could not be read');

    // The two states are different sentences, which is the point: a failed read is not an
    // empty world.
    expect(empty.toJSON()).not.toEqual(failed.toJSON());
  });

  it('offers a retry only when its caller has somewhere to send the press', async () => {
    const onRetry = jest.fn();
    const { rerender } = await render(<ZoneMap onRetry={onRetry} status="error" zones={[]} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // A drawing of an action with no handler claims no role (AGENTS.md §11.2).
    await rerender(<ZoneMap status="error" zones={[]} />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  });

  it('names the drawing, so the map is not an unnamed image', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map-drawing').props.accessibilityLabel).toBe(
      'Map of nearby berry zones',
    );
  });

  it('pans and zooms, keeps north up, and offers the frame’s recentre control', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    const drawing = screen.getByTestId('zone-map-drawing').props;
    for (const gesture of ['dragPan', 'touchZoom', 'doubleTapZoom']) {
      expect(drawing[gesture]).not.toBe(false);
    }
    expect(drawing.touchRotate).toBe(false);
    expect(drawing.touchPitch).toBe(false);
    expect(screen.getByRole('button', { name: 'Recentre the map on the zones' })).toBeOnTheScreen();
  });

  it('discloses the bundled test zones only when the stub source is drawn', async () => {
    await render(<ZoneMap demo status="ready" zones={[zone(), zone({ id: 'b' })]} />);

    expect(screen.getByText('Laajavuori')).toBeOnTheScreen();
    expect(screen.getByText('2 zones · test data')).toBeOnTheScreen();
  });

  it('draws the OpenFreeMap basemap for the theme, with the OpenStreetMap credit', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map-drawing').props.mapStyle).toBe(
      'https://tiles.openfreemap.org/styles/liberty',
    );
    expect(screen.getByTestId('zone-map-attribution')).toHaveTextContent(
      '© OpenStreetMap contributors',
    );
    expect(screen.getByTestId('zone-map-drawing').props.logo).toBe(false);
  });

  it('hands MapLibre one feature per zone, carrying the band its score falls in', async () => {
    const zones = [zone({ id: 'a', score: 53 }), zone({ id: 'b', score: 12, confidence: 'low' })];

    await render(<ZoneMap status="ready" zones={zones} />);

    const data = screen.getByTestId('zone-map-source').props.data;

    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toHaveLength(2);
    expect(data.features[0]).toMatchObject({
      id: 'a',
      properties: { band: ZONE_SCORE_BANDS[2]!.min, lowConfidence: false, score: 53 },
    });
    expect(data.features[1]).toMatchObject({
      id: 'b',
      properties: { band: ZONE_SCORE_BANDS[0]!.min, lowConfidence: true, score: 12 },
    });
  });

  it('marks the selected zone and reports a zone press by its stable id', async () => {
    const onSelectZone = jest.fn();
    const zones = [zone({ id: 'a' }), zone({ id: 'b', name: 'Laajavuori 2' })];

    await render(
      <ZoneMap onSelectZone={onSelectZone} selectedZoneId="b" status="ready" zones={zones} />,
    );

    const data = screen.getByTestId('zone-map-source').props.data;
    expect(data.features[0].properties.selected).toBe(false);
    expect(data.features[1].properties.selected).toBe(true);

    await fireEvent(screen.getByTestId('zone-map-source'), 'press', {
      nativeEvent: { features: [{ id: 'b' }] },
    });
    expect(onSelectZone).toHaveBeenCalledWith('b');
  });

  it('draws the current position and lets a manual pan leave follow mode', async () => {
    const view = await render(
      <ZoneMap
        position={{
          accuracyMeters: 12,
          at: 1_786_000_000_000,
          latitude: 62.24,
          longitude: 25.76,
        }}
        positionStatus="tracking"
        status="ready"
        zones={[zone()]}
      />,
    );

    expect(screen.getByTestId('zone-map-user-location-source').props.data).toMatchObject({
      geometry: { coordinates: [25.76, 62.24], type: 'Point' },
    });
    const locate = screen.getByRole('button', { name: 'Centre map on my location' });

    await fireEvent.press(locate);
    expect(locate.props.accessibilityState).toMatchObject({ selected: true });

    await fireEvent(screen.getByTestId('zone-map-drawing'), 'regionWillChange', {
      nativeEvent: { userInteraction: true },
    });
    expect(locate.props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(locate);
    const onOpenLocationSettings = jest.fn();
    await view.rerender(
      <ZoneMap
        onOpenLocationSettings={onOpenLocationSettings}
        position={null}
        positionStatus="failed"
        status="ready"
        zones={[zone()]}
      />,
    );
    const fixAccess = screen.getByRole('button', { name: 'Fix location access' });
    expect(fixAccess.props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(fixAccess);
    expect(onOpenLocationSettings).toHaveBeenCalledWith('failed');
  });

  it('fills its parent instead of becoming a rounded card on the map-first screen', async () => {
    await render(<ZoneMap fullscreen status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map')).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId('zone-map')).not.toHaveStyle({ borderRadius: radii.lg });
  });

  it('keeps the height the screen gives it', async () => {
    await render(<ZoneMap height={layout.routeMapHeight} status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map')).toHaveStyle({ height: layout.routeMapHeight });
  });

  it('hands MapLibre the same style, data and camera when nothing changed', async () => {
    const zones = [zone()];
    const view = await render(<ZoneMap status="ready" zones={zones} />);
    const style = screen.getByTestId('zone-map-drawing').props.mapStyle;
    const data = screen.getByTestId('zone-map-source').props.data;
    const bounds = screen.getByTestId('zone-map-camera').props.bounds;

    // The search field re-renders this screen on every keystroke. The camera is memoised on
    // its props and re-fits when its bounds array is new; the map and source wrappers hand
    // their style and data to the native view, so rebuilding them is work with no new drawing.
    // An unchanged map must hand MapLibre the same objects.
    await view.rerender(<ZoneMap status="ready" zones={zones} />);

    expect(screen.getByTestId('zone-map-drawing').props.mapStyle).toBe(style);
    expect(screen.getByTestId('zone-map-source').props.data).toBe(data);
    expect(screen.getByTestId('zone-map-camera').props.bounds).toBe(bounds);
  });
});
