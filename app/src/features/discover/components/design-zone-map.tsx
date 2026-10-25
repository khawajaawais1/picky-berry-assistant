import { memo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/atoms';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import {
  DEMO_ZONES,
  ZONE_APPEARANCE,
  ZONE_STATES,
  type DemoZone,
  type ZoneState,
} from '../domain/zone';
import { ZONE_STATE_LABEL_KEY } from './zone-state-copy';
import {
  MAP_ANCHORS,
  MAP_BASE_LAYERS,
  MAP_BASE_PATHS,
  MAP_HEIGHT,
  MAP_ROUTE_PATH,
  MAP_ROUTE_STROKE,
  MAP_WIDTH,
  POSITION_DOT_SIZE,
  POSITION_HALO_SIZE,
  type MapAnchor,
} from '../domain/zone-map-geometry';

export type DesignZoneMapProps = {
  /**
   * The height the drawing is stretched to. The design draws the same map three times — 300
   * on frame 06's Discover screen, 322 on frame 08's route and 210 on frame 09's visit — and
   * its own node boxes say the drawing is *stretched* rather than redrawn: every shape and
   * label inside it moves by the same factor (322/300 and 210/300, to the tenth of a pixel),
   * measured on nodes 5:22966, 5:23125 and 5:23204.
   */
  height?: number;
  /** Frame 08's walking route, drawn over the zones when the screen has a route to show. */
  route?: boolean;
  /**
   * The zones to draw, in the order the screen's filter left them. Every zone of the frame's
   * demo composition by default, which is what frames 08 and 09 want: they draw the same map
   * the picker was already looking at.
   *
   * A zone the picker has filtered away is simply not drawn — polygon, label, badge and all —
   * because a label left on the map would be a zone the app claims to have found.
   */
  zones?: readonly DemoZone[];
};

/** The fill and stroke the frame gives each base layer (nodes 5:22967–5:22970). */
const BASE_PAINT: Record<
  (typeof MAP_BASE_LAYERS)[number],
  { fill?: 'mapWoodland' | 'mapWater'; stroke?: 'mapTrail' | 'mapTrailLine'; width?: number }
> = {
  woodlands: { fill: 'mapWoodland' },
  water: { fill: 'mapWater' },
  trailCasing: { stroke: 'mapTrail', width: 6 },
  trailLines: { stroke: 'mapTrailLine', width: 1 },
};

/**
 * The design's map (frame 06, node 5:22966), drawn by the app from its own geometry — not a
 * tile provider (ADR-021). Since 2026-10-22 it is **no longer screen 06's map**: the Discover
 * screen draws the pilot's real zones with MapLibre (ADR-053), and this drawing remains on
 * frames 08 (route) and 09 (visit), which have no geographic route or visit zone to draw yet.
 *
 * The shapes are the design's own geometry, generated into `domain/zone-map-geometry.ts`;
 * the drawing is `react-native-svg`, which paints the same paths on iOS, Android and the
 * web export the layout harness measures. The words on the map are components rather than
 * part of a drawing, so each comes from the catalogue, carries an accessible name and is
 * measured in both languages — which the exported illustration on screen 05 could not be
 * (docs/design-source.md).
 *
 * The drawing carries the map's **text alternative** (`discover.map.label`) rather than being
 * hidden: it is the screen's primary presentation of the zones, not decoration, and in the built
 * web export the container's label reached nothing at all while the `<svg>` was the node exposed
 * — as an unnamed image (known issue 35, corrected).
 *
 * Three deliberate limits, all recorded in PROJECT.md:
 *
 * - **Nothing on it is a control.** The frame draws a recentre button; here the map does not
 *   pan, zoom or follow the device — its paths are the frame's 342×300 coordinates, not latitude
 *   and longitude — so a recentre control could not act and is not drawn (AGENTS.md §11.2). The frame's position marker is part of the composition and says so in
 *   its accessible name rather than claiming “you are here”.
 * - **Which zones are on it is the screen's decision, not the drawing's** (`zones`): the
 *   discover screen's search field and species chips are the filter, and the map is where the
 *   result is seen.
 * - **A zone's state is carried by colour.** A screen reader is told the state (each zone
 *   label's accessible name spells it out) and the legend names the three colours in words,
 *   but a sighted user tells the zones apart by hue. A state glyph on the polygon is the fix
 *   when a frame draws one.
 * - **The map does not grow with its text.** The drawing keeps the frame's 342x300
 *   composition; the labels keep their own size and are anchored to it, and the map's own
 *   scale line is anchored to the bottom edge so it grows upward instead of being clipped.
 */
export const DesignZoneMap = memo(function DesignZoneMap({
  height = layout.mapHeight,
  route = false,
  zones,
}: DesignZoneMapProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  // The drawing scales with its container; the labels do not, because their size belongs to
  // the platform's text setting rather than to the width of the screen. Their anchors scale,
  // so the two stay in step — on the design's 390 px screen the factor is exactly 1. The two
  // factors are separate because the frame's map is stretched vertically on frames 08 and 09.
  const [width, setWidth] = useState(MAP_WIDTH);
  const xScale = width / MAP_WIDTH;
  const yScale = height / MAP_HEIGHT;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const drawn = zones ?? DEMO_ZONES;
  const zoneIn = (state: ZoneState) => drawn.find((zone) => zone.state === state);
  // The same anchors place both the text the frame draws on the map and the two marks it
  // draws beside it, so the helper carries the two style shapes rather than one of them.
  const placed = (anchor: MapAnchor, style?: TextStyle & ViewStyle): TextStyle & ViewStyle => ({
    left: anchor.x * xScale,
    // A label may not bleed out of the map: the box it is given stops at the map's edge, so
    // at the largest system text size it wraps instead of being clipped by the frame.
    maxWidth: Math.max(MAP_WIDTH - anchor.x, 1) * xScale,
    position: 'absolute',
    top: anchor.y * yScale,
    ...style,
  });

  const recentlyPicked = zoneIn('recentlyPicked');
  const ripening = zoneIn('ripening');
  const unpicked = zoneIn('unpicked');

  return (
    <View
      accessibilityLabel={t('discover.map.label')}
      className="w-full overflow-hidden"
      onLayout={onLayout}
      style={{
        // The frame's own fill, not the woodland: the woodland path covers only part of the
        // map, and the ground it leaves uncovered is a lighter green in the design (sampled
        // on node 5:22966 — over a third of its map pixels are this colour).
        backgroundColor: colors.mapBase,
        borderRadius: radii.lg,
        height,
      }}
      testID="zone-map"
    >
      <Svg
        // The drawing is **content, not decoration** (known issue 35): it is this screen's
        // primary presentation of the zones, so WCAG 1.1.1's text alternative belongs on it
        // rather than hiding it — and it is the node a browser exposes, as `img`. Measured on
        // `/discover` in the built web export: the container's own label reached *nothing*
        // (a role-less `div` computes to `generic`, where Chromium ignores `aria-label`), while
        // this `<svg>` read as a bare `- img`, and the map's words arrive beside it as text.
        // Both spellings are passed on purpose — the platform reads `accessibilityLabel`, the
        // web target reads `aria-label` — the same double spelling `AppCheckbox` and
        // `ChoiceChips` use for their states. What the browser's tree shows, and that no
        // unnamed image is left anywhere in the app, is held by the accessibility-tree walk
        // (`e2e/a11y-tree.ts`) and by the map's own check in `e2e/accessibility.spec.ts`.
        accessibilityLabel={t('discover.map.label')}
        accessibilityRole="image"
        accessible
        aria-label={t('discover.map.label')}
        height={height}
        // `none` rather than the default `meet`: the design stretches one drawing to fit the
        // box its frame gives it (322 on frame 08, 210 on frame 09) instead of letterboxing
        // it, which is what keeps the shapes and the frame's own label anchors in step.
        preserveAspectRatio="none"
        testID="zone-map-drawing"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        width="100%"
      >
        {MAP_BASE_LAYERS.map((layer) => (
          <Path
            d={MAP_BASE_PATHS[layer]}
            fill={BASE_PAINT[layer].fill ? colors[BASE_PAINT[layer].fill] : 'none'}
            key={layer}
            stroke={BASE_PAINT[layer].stroke ? colors[BASE_PAINT[layer].stroke] : undefined}
            strokeWidth={BASE_PAINT[layer].width}
          />
        ))}

        {/* One polygon per state, drawn only while that state's zone is still in play: the
            frame gives each state its own shape, so filtering a zone out is filtering its
            shape out. */}
        {ZONE_STATES.filter((state) => zoneIn(state) !== undefined).map((state) => (
          <Path
            d={ZONE_APPEARANCE[state].shape}
            fill={colors[ZONE_APPEARANCE[state].fill]}
            key={state}
            stroke={colors[ZONE_APPEARANCE[state].line]}
            strokeWidth={2}
          />
        ))}

        {/* The frame's own route layer (node 5:23133), over the zones and under the
            labels: the screen it belongs to is the one that tells the walker where to go. */}
        {route ? (
          <Path
            d={MAP_ROUTE_PATH}
            fill="none"
            stroke={colors.accent}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={MAP_ROUTE_STROKE}
            testID="zone-map-route"
          />
        ) : null}
      </Svg>

      <AppText style={placed(MAP_ANCHORS.place)} tone="success" variant="mapLabel">
        {t('discover.map.place')}
      </AppText>

      <AppText
        style={placed(MAP_ANCHORS.lake, { color: colors.mapLakeLabel })}
        variant="mapAnnotation"
      >
        {t('discover.map.lake')}
      </AppText>

      {[
        {
          anchor: MAP_ANCHORS.recentlyPickedZone,
          state: 'recentlyPicked' as const,
          zone: recentlyPicked,
        },
        { anchor: MAP_ANCHORS.ripeningZone, state: 'ripening' as const, zone: ripening },
      ].map(({ anchor, state, zone }) =>
        zone ? (
          <AppText
            accessibilityLabel={interpolate(t('discover.zone.a11y'), {
              id: zone.id,
              state: t(ZONE_STATE_LABEL_KEY[state]),
            })}
            key={zone.id}
            style={placed(anchor, {
              color: colors[ZONE_APPEARANCE[state].label],
              fontWeight: '600',
            })}
            variant="mapLabel"
          >
            {zone.id}
          </AppText>
        ) : null,
      )}

      {unpicked ? (
        <View
          accessibilityLabel={interpolate(t('discover.zone.score.a11y'), {
            id: unpicked.id,
            score: String(unpicked.score ?? 0),
          })}
          className="flex-row items-center gap-xs rounded-pill px-cardGap py-setting"
          style={placed(MAP_ANCHORS.scoreBadge, { backgroundColor: colors.surface })}
          testID="zone-map-score-badge"
        >
          <AppText style={styles.score} tone="success" variant="bodySmall">
            {unpicked.score}
          </AppText>
          <AppText tone="muted" variant="mapLabel">
            {`· ${unpicked.id}`}
          </AppText>
        </View>
      ) : null}

      <View
        accessibilityLabel={t('discover.map.position')}
        pointerEvents="none"
        style={placed(MAP_ANCHORS.halo, {
          backgroundColor: colors.accent,
          borderRadius: POSITION_HALO_SIZE / 2,
          height: POSITION_HALO_SIZE,
          opacity: 0.15,
          width: POSITION_HALO_SIZE,
        })}
      />
      <View
        pointerEvents="none"
        style={placed(MAP_ANCHORS.position, {
          backgroundColor: colors.accent,
          borderColor: colors.surface,
          borderRadius: POSITION_DOT_SIZE / 2,
          borderWidth: 3,
          height: POSITION_DOT_SIZE,
          width: POSITION_DOT_SIZE,
        })}
      />

      {/* Anchored to the map's bottom edge, the way the frame places it (12 px above the
          edge): a long scale line or a large system text size then grows upward, where
          there is room, instead of being clipped at the bottom of the frame. */}
      <AppText
        style={{
          bottom: spacing.gap,
          color: colors.mapNote,
          left: MAP_ANCHORS.scale.x * xScale,
          maxWidth: (MAP_WIDTH - MAP_ANCHORS.scale.x) * xScale,
          position: 'absolute',
        }}
        variant="mapAnnotation"
      >
        {t('discover.map.scale')}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  score: {
    fontWeight: '700',
  },
});
