import { render, screen } from '@testing-library/react-native';

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
 * - the device's canvas is MapLibre with every gesture off and **no tile host**, so it works
 *   with no network and cannot be panned away from the pilot area;
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
    expect(screen.getByText('Laajavuori')).toBeOnTheScreen();
    expect(screen.getByText('2 zones · test data')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-map')).toHaveStyle({
      backgroundColor: themes.light.colors.mapBase,
      borderRadius: radii.lg,
      height: layout.mapHeight,
    });
  });

  it('says “one zone” in the singular, because a search can leave exactly one', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    expect(screen.getByText('1 zone · test data')).toBeOnTheScreen();
  });

  it('says it is still loading rather than drawing an empty map', async () => {
    await render(<ZoneMap status="loading" zones={[]} />);

    expect(screen.getByTestId('zone-map-status')).toHaveTextContent('Loading zones…');
    expect(screen.queryByTestId('zone-map-drawing')).not.toBeOnTheScreen();
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

  it('names the drawing, so the map is not an unnamed image', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map-drawing').props.accessibilityLabel).toBe(
      'Map of nearby berry zones',
    );
  });

  it('turns every gesture off, because the frame’s recentre control does not exist', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    const drawing = screen.getByTestId('zone-map-drawing').props;
    for (const gesture of [
      'dragPan',
      'touchZoom',
      'doubleTapZoom',
      'doubleTapHoldZoom',
      'touchRotate',
      'touchPitch',
    ]) {
      expect(drawing[gesture]).toBe(false);
    }
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('draws without a tile host, so the map needs no network', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    const style = screen.getByTestId('zone-map-drawing').props.mapStyle;

    expect(style.sources).toEqual({});
    expect(style.layers).toEqual([expect.objectContaining({ type: 'background' })]);
    // MapLibre's own ornaments are off: there is no logo or attribution to show for a style
    // the project wrote, and the map is not a source of anyone else's data yet (ADR-031).
    expect(screen.getByTestId('zone-map-drawing').props.logo).toBe(false);
    expect(screen.getByTestId('zone-map-drawing').props.attribution).toBe(false);
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

  it('keeps the height the screen gives it', async () => {
    await render(<ZoneMap height={layout.routeMapHeight} status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map')).toHaveStyle({ height: layout.routeMapHeight });
  });
});
