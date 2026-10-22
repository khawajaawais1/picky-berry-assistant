import { render, screen } from '@testing-library/react-native';

import { layout, radii, spacing, themes, typography } from '@/constants/theme';

import { DEMO_ZONES, ZONE_APPEARANCE } from '../../domain/zone';
import {
  MAP_ANCHORS,
  MAP_BASE_LAYERS,
  MAP_HEIGHT,
  MAP_ROUTE_PATH,
  MAP_WIDTH,
} from '../../domain/zone-map-geometry';
import { ZoneMap } from '../zone-map';

/**
 * Content, accessible names and roles of the Discover map, from frame 06 (node 5:22966).
 * The strings are written out literally so this test fails when the screen's copy changes
 * silently; the metrics are held to the tokens the frame's measurements became.
 *
 * The three assertions that matter most here are the ones a map full of colour is easy to
 * get wrong: every zone tells a screen reader **which state it is in** (colour alone cannot),
 * the frame's position marker never claims to be the device's own position, and nothing on
 * the map is a control, because nothing on it can act yet.
 */
describe('ZoneMap', () => {
  it('names the places the frame draws on it', async () => {
    await render(<ZoneMap />);

    expect(screen.getByText('Laajavuori')).toBeOnTheScreen();
    expect(screen.getByText('Tuomiojärvi')).toBeOnTheScreen();
    expect(screen.getByText('━━  200 m   ·   Season demo')).toBeOnTheScreen();
  });

  it('tells a screen reader which state each zone is in', async () => {
    await render(<ZoneMap />);

    // The zone's own name is the visible text; its state exists only as colour on the map,
    // so the accessible name is where it has to be said.
    expect(screen.getByLabelText('Zone Z09, Picked recently')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zone Z21, Ripening')).toBeOnTheScreen();
    expect(screen.getByText('Z09')).toBeOnTheScreen();
    expect(screen.getByText('Z21')).toBeOnTheScreen();
  });

  it('carries the zone card’s zone as the score badge the frame draws', async () => {
    await render(<ZoneMap />);

    expect(screen.getByTestId('zone-map-score-badge')).toBeOnTheScreen();
    expect(screen.getByText('78')).toBeOnTheScreen();
    expect(screen.getByText('· Z14')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zone Z14, yield score 78 out of 100')).toBeOnTheScreen();
  });

  it('draws only the zones the screen hands it, and says nothing about the others', async () => {
    // The screen's filter decides which zones are still in play; the map is what shows that,
    // so a zone the picker filtered away must not survive on the drawing or in its accessible
    // names — a label left behind is a zone the map claims to have found.
    const view = await render(<ZoneMap zones={[DEMO_ZONES[1]!]} />);

    expect(screen.getByText('Z09')).toBeOnTheScreen();
    expect(screen.queryByText('Z21')).not.toBeOnTheScreen();
    expect(screen.queryByText('· Z14')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('zone-map-score-badge')).not.toBeOnTheScreen();
    // One polygon for the one zone left, beside the four terrain layers.
    expect(JSON.stringify(view.toJSON()).match(/RNSVGPath/g)).toHaveLength(
      MAP_BASE_LAYERS.length + 1,
    );
  });

  it('draws every zone when the screen hands it none to filter by', async () => {
    const view = await render(<ZoneMap />);

    expect(JSON.stringify(view.toJSON()).match(/RNSVGPath/g)).toHaveLength(
      MAP_BASE_LAYERS.length + 3,
    );
  });

  it('gives the drawing its own text alternative, so the map is not an unnamed image', async () => {
    // The decision this component is built on (known issue 35): the map is **content**, not
    // decoration — it is the screen's primary presentation of the zones, and WCAG 1.1.1 asks a
    // text alternative of it — so the drawing is *named* rather than hidden. The name is the one
    // the catalogue already had (`discover.map.label`, on the container as the region's own
    // label): in the built web export the container's label reaches nothing, because a
    // role-less `div` computes to `generic` and Chromium ignores `aria-label` there, while the
    // `<svg>` is the node a browser exposes as `img` — measured on `/discover`, which read as a
    // bare `- img` until this prop arrived. Both spellings are passed on purpose: the platform
    // reads `accessibilityLabel`, the web target reads `aria-label` (the same double spelling
    // `AppCheckbox` and `ChoiceChips` use for their states). What the browser's tree shows is
    // held in `e2e/accessibility.spec.ts`, where the export can be read.
    await render(<ZoneMap />);

    const drawing = screen.getByTestId('zone-map-drawing');

    expect(drawing.props.accessibilityLabel).toBe('Map of nearby berry zones');
    expect(drawing.props['aria-label']).toBe('Map of nearby berry zones');
    // The words on the map stay where they are: the drawing is named, and nothing about the
    // labels beside it is hidden or replaced by that name.
    expect(screen.getByText('Laajavuori')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zone Z09, Picked recently')).toBeOnTheScreen();
  });

  it('does not claim to be the device’s own position', async () => {
    await render(<ZoneMap />);

    // The frame's marker is part of the composition, so its name describes the marker
    // rather than promising “you are here”, which the app cannot know yet.
    expect(screen.getByLabelText('Position marker on the map')).toBeOnTheScreen();
  });

  it('draws the frame’s base layers and the three zone polygons in one viewBox', async () => {
    const view = await render(<ZoneMap />);
    const drawing = JSON.stringify(view.toJSON());

    // Four terrain layers plus one polygon per state, all inside one drawing whose
    // viewBox is the frame's own size (`MAP_WIDTH` x `MAP_HEIGHT`), so the shapes and the
    // labels share one coordinate system.
    expect(screen.getByTestId('zone-map-drawing')).toBeOnTheScreen();
    expect(drawing.match(/RNSVGPath/g)).toHaveLength(MAP_BASE_LAYERS.length + 3);
    expect(drawing).toContain(ZONE_APPEARANCE.ripening.shape);
    expect(drawing).toContain(ZONE_APPEARANCE.unpicked.shape);
  });

  it('is a 342x300 composition at the card radius, and paints it with tokens', async () => {
    const view = await render(<ZoneMap />);

    expect(screen.getByTestId('zone-map')).toHaveStyle({
      // The frame's own fill, under a woodland path that covers only part of the box.
      backgroundColor: themes.light.colors.mapBase,
      borderRadius: radii.lg,
      height: layout.mapHeight,
    });
    // …and every layer is painted in its own token. `react-native-svg` hands the native
    // side an ARGB integer rather than the hex string, so the assertion translates the
    // token the same way instead of looking for text that is not there.
    const drawing = JSON.stringify(view.toJSON());
    const argb = (hex: string) => `{"type":0,"payload":${parseInt(`ff${hex.slice(1)}`, 16)}}`;

    for (const token of ['mapWoodland', 'mapWater', 'mapTrail', 'mapTrailLine'] as const) {
      expect(drawing).toContain(argb(themes.light.colors[token]));
    }
  });

  it('anchors the map’s own scale line to the bottom edge, where it has room to grow', async () => {
    await render(<ZoneMap />);

    // At the largest system text size a two-line scale line would be cut off by the frame's
    // bottom edge; anchored to that edge it grows upward instead (ADR-019's concern).
    expect(screen.getByText('━━  200 m   ·   Season demo')).toHaveStyle({
      bottom: spacing.gap,
      left: MAP_ANCHORS.scale.x,
      maxWidth: MAP_WIDTH - MAP_ANCHORS.scale.x,
      position: 'absolute',
    });
  });

  it('stretches one drawing and its anchors to the height the screen gives it', async () => {
    // Frames 06, 08 and 09 draw the same map at 300, 322 and 210 px high, and the frames' own
    // node boxes say the drawing is stretched rather than redrawn. This is that, stated as the
    // design states it: the place name frame 08 draws at y144.9 is frame 06's y135 times 322/300.
    await render(<ZoneMap height={layout.routeMapHeight} />);

    const stretch = layout.routeMapHeight / MAP_HEIGHT;

    expect(screen.getByTestId('zone-map')).toHaveStyle({ height: layout.routeMapHeight });
    expect(screen.getByText('Laajavuori')).toHaveStyle({ top: MAP_ANCHORS.place.y * stretch });
    // …and only the vertical: the horizontal factor is the container's width, so a taller map
    // must not move anything sideways.
    expect(screen.getByText('━━  200 m   ·   Season demo')).toHaveStyle({
      left: MAP_ANCHORS.scale.x,
    });
  });

  it('draws the frame’s route only on the screen that has one', async () => {
    const plain = await render(<ZoneMap />);
    expect(screen.queryByTestId('zone-map-route')).not.toBeOnTheScreen();
    expect(JSON.stringify(plain.toJSON())).not.toContain(MAP_ROUTE_PATH);

    const routed = await render(<ZoneMap route />);

    expect(screen.getByTestId('zone-map-route')).toBeOnTheScreen();
    expect(JSON.stringify(routed.toJSON())).toContain(MAP_ROUTE_PATH);
    // The route the frame strokes in the accent colour, over the zones (node 5:23133).
    expect(JSON.stringify(routed.toJSON())).toContain(
      `{"type":0,"payload":${parseInt(`ff${themes.light.colors.accent.slice(1)}`, 16)}}`,
    );
  });

  it('offers no control, because none of the frame’s controls can act yet', async () => {
    await render(<ZoneMap />);

    // The frame draws a recentre button. Drawing it here would announce an action that does
    // nothing (AGENTS.md §11.2, PROJECT.md).
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('uses the frame’s own map type metrics', async () => {
    await render(<ZoneMap />);

    expect(screen.getByText('Laajavuori')).toHaveStyle({
      fontSize: typography.mapLabel.fontSize,
      lineHeight: typography.mapLabel.lineHeight,
    });
    expect(screen.getByText('Tuomiojärvi')).toHaveStyle({
      fontSize: typography.mapAnnotation.fontSize,
    });
  });
});
