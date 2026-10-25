import type {
  FillLayerSpecification,
  LineLayerSpecification,
  StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import {
  ZONE_CONFIDENT_OPACITY,
  ZONE_LOW_CONFIDENCE_OPACITY,
  ZONE_SCORE_BANDS,
} from '../domain/zone-score-band';
import { zoneBounds } from '../domain/zone-map-projection';
import { zoneFeatureCollection } from '../domain/zone-source';

import { loadMapLibre } from './map-libre';
import type { ZoneMapCanvasProps } from './zone-map-canvas-props';

/** The map is the whole canvas; one object, so a parent render does not hand the native view a new style. */
const CANVAS_STYLE = { flex: 1 } as const;

/** Space kept around the framed zones, in screen pixels. */
const CAMERA_PADDING = { top: 24, right: 24, bottom: 24, left: 24 } as const;

/** The native package is absent from Expo Go; see `map-libre.ts` for why this is not an import. */
const mapLibre = loadMapLibre();

/**
 * The device's map: **MapLibre React Native**, on real coordinates (ADR-031's renderer,
 * ADR-053's first use).
 *
 * **There is no basemap yet, and that is deliberate.** The PMTiles file the project will host
 * (D18) is not built, and every alternative — OpenStreetMap's tile servers, a hosted
 * provider — is a processor that receives approximate location on every tile request, which
 * is an owner decision this app does not have (ADR-031 ¶6). So the style is a single
 * background layer painted in `mapBase` plus the zone polygons: the map is spatially true
 * and visually still the design's ground, and it needs no network at all.
 *
 * **Nothing on it is a control** — pan, zoom, rotate and pitch are off. The frame draws a
 * recentre button, and a map that can be moved away from the pilot area without a way back
 * is worse than one that stays where it was put. The interactions arrive with the recentre
 * control, not before it.
 *
 * **Every prop the native view receives is memoised on what it actually depends on.** The
 * Discover screen re-renders on every keystroke in its search field. The camera is the sharp end:
 * MapLibre's `Camera` is memoised and its bounds are compared by identity, so a new array re-fits
 * the map under a typing finger. The style and its layers depend on the theme's colours; the data
 * and the camera on the zones alone. A keystroke that leaves the same zones on the map now hands
 * MapLibre the same objects instead of rebuilding them on every render.
 */
export function ZoneMapCanvas({ label, zones }: ZoneMapCanvasProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const ground = useMemo<StyleSpecification>(
    () => ({
      version: 8,
      sources: {},
      layers: [
        {
          id: 'ground',
          type: 'background',
          paint: { 'background-color': colors.mapBase },
        },
      ],
    }),
    [colors],
  );

  // The band's lower edge is what each feature carries (`zoneFeatureCollection`), so the
  // style is one `match` rather than a layer per band — and the palette comes from the same
  // tokens the web drawing and the legend use. The style spec's expression type is a union
  // large enough that building it by hand is noise; the two objects below are ordinary
  // MapLibre expressions, cast at this one seam.
  const fill = useMemo(
    () =>
      ({
        'fill-color': [
          'match',
          ['get', 'band'],
          ...ZONE_SCORE_BANDS.flatMap((band) => [band.min, colors[band.fill]]),
          colors.mapScoreLowest,
        ],
        'fill-opacity': [
          'case',
          ['get', 'lowConfidence'],
          ZONE_LOW_CONFIDENCE_OPACITY,
          ZONE_CONFIDENT_OPACITY,
        ],
      }) as unknown as NonNullable<FillLayerSpecification['paint']>,
    [colors],
  );

  const line = useMemo(
    () =>
      ({
        'line-color': [
          'match',
          ['get', 'band'],
          ...ZONE_SCORE_BANDS.flatMap((band) => [band.min, colors[band.line]]),
          colors.mapScoreLowestLine,
        ],
        'line-width': 1.5,
      }) as unknown as NonNullable<LineLayerSpecification['paint']>,
    [colors],
  );

  const data = useMemo(() => zoneFeatureCollection(zones), [zones]);
  const framedBounds = useMemo<[number, number, number, number] | null>(() => {
    const bounds = zoneBounds(zones.map((zone) => zone.ring));

    return bounds === null ? null : [bounds[0], bounds[1], bounds[2], bounds[3]];
  }, [zones]);

  if (mapLibre === null) {
    return (
      <View className="flex-1 items-center justify-center px-section" testID="zone-map-unavailable">
        <AppText tone="muted" variant="bodySmall">
          {t('discover.map.requiresDevelopmentBuild')}
        </AppText>
      </View>
    );
  }

  const { Camera, GeoJSONSource, Layer, Map: MapView } = mapLibre;

  return (
    <MapView
      // The map is content, not decoration: it is how the screen shows the zones, so it
      // carries a text alternative (WCAG 1.1.1, known issue 35) and the label is passed to
      // the platform's own accessibility props.
      accessibilityLabel={label}
      accessibilityRole="image"
      attribution={false}
      doubleTapHoldZoom={false}
      doubleTapZoom={false}
      dragPan={false}
      logo={false}
      mapStyle={ground}
      style={CANVAS_STYLE}
      testID="zone-map-drawing"
      touchPitch={false}
      touchRotate={false}
      touchZoom={false}
    >
      {framedBounds ? (
        <Camera bounds={framedBounds} padding={CAMERA_PADDING} testID="zone-map-camera" />
      ) : null}

      <GeoJSONSource data={data} id="pilot-zones" testID="zone-map-source">
        <Layer id="zone-fill" paint={fill} source="pilot-zones" type="fill" />
        <Layer id="zone-line" paint={line} source="pilot-zones" type="line" />
      </GeoJSONSource>
    </MapView>
  );
}
