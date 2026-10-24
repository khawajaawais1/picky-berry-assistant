import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAppTheme } from '@/hooks/use-app-theme';

import { projectRings } from '../domain/zone-map-projection';
import {
  ZONE_CONFIDENT_OPACITY,
  ZONE_LOW_CONFIDENCE_OPACITY,
  scoreBand,
} from '../domain/zone-score-band';
import type { ZoneMapCanvasProps } from './zone-map-canvas-props';

/** The width the design draws the map at; the container's own width replaces it. */
const DESIGN_WIDTH = 342;

/**
 * The web export's map (**the fallback ADR-031 anticipated**): the same GeoJSON rings,
 * projected into an SVG instead of rendered by MapLibre.
 *
 * MapLibre React Native has no web target, and this repository measures every screen in a
 * static web export (ADR-018, ADR-019) — dropping the map out of that harness would remove
 * the one place a Finnish or 200 % break is caught from the screen that is mostly a map.
 * So the web build draws what the device's map draws, with the same ring data, the same band
 * colours and the same faded low-confidence treatment; only the renderer differs. The
 * projection is local equirectangular (`zone-map-projection.ts`), which is accurate at the
 * pilot's scale and is what keeps a square on the ground square on the screen.
 */
export function ZoneMapCanvas({ height, label, zones }: ZoneMapCanvasProps) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(DESIGN_WIDTH);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(Math.max(event.nativeEvent.layout.width, 1));

  const paths = projectRings(
    zones.map((zone) => zone.ring),
    { width, height, padding: 12 },
  );

  return (
    <View onLayout={onLayout} style={{ height }} testID="zone-map-canvas">
      <Svg
        // Content, not decoration — the same decision the drawn map made (known issue 35).
        // `aria-label` is the spelling the browser reads; `accessibilityLabel` is the
        // platform's. See `design-zone-map.tsx` and `e2e/accessibility.spec.ts`.
        accessibilityLabel={label}
        accessibilityRole="image"
        aria-label={label}
        height={height}
        testID="zone-map-drawing"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        {zones.map((zone, index) => {
          const band = scoreBand(zone.score);

          return (
            <Path
              d={paths[index]!}
              fill={colors[band.fill]}
              fillOpacity={
                zone.confidence === 'low' ? ZONE_LOW_CONFIDENCE_OPACITY : ZONE_CONFIDENT_OPACITY
              }
              key={zone.id}
              stroke={colors[band.line]}
              strokeLinejoin="round"
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}
