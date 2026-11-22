import type {
  CameraRef,
  FillLayerSpecification,
  LineLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Feather } from '@/components/atoms/app-icon';
import { layout, radii, spacing } from '@/constants/theme';
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
import { ZoneMapSvg } from './zone-map-svg';

/** The map is the whole canvas; one object, so a parent render does not hand the native view a new style. */
const CANVAS_STYLE = { flex: 1 } as const;

/** Space kept around the framed zones, in screen pixels. */
const CAMERA_PADDING = { top: 24, right: 24, bottom: 24, left: 24 } as const;

/** The native package is absent from Expo Go; see `map-libre.ts` for why this is not an import. */
const mapLibre = loadMapLibre();

/**
 * The basemap: OpenFreeMap's OpenStreetMap vector tiles, which need no API key. One style per
 * app theme, so the zones sit on a light map in light mode and a dark one in dark mode.
 */
const BASEMAP_STYLE = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/** How far the picker may zoom: out to the region, in to a few streets. */
const MIN_ZOOM = 8;
const MAX_ZOOM = 17;

/**
 * The device's map: **MapLibre React Native**, on real coordinates (ADR-031's renderer,
 * ADR-053's first use).
 *
 * **The basemap is OpenFreeMap** (`BASEMAP_STYLE`): OpenStreetMap vector tiles with no API key,
 * the zones drawn over it, and the OpenStreetMap credit the tiles require. OpenFreeMap receives
 * the map area on every tile request; ADR-031's self-hosted PMTiles would replace this URL.
 *
 * **Pan and pinch-zoom are on, with the frame's recentre control** to fit the zones again, so
 * the picker can never be left looking at an empty corner. Rotate and pitch stay off: a tilted
 * or turned zone grid reads worse than a north-up one.
 *
 * **Every prop the native view receives is memoised on what it actually depends on.** The
 * Discover screen re-renders on every keystroke in its search field. The camera is the sharp end:
 * MapLibre's `Camera` is memoised and its bounds are compared by identity, so a new array re-fits
 * the map under a typing finger. The style and its layers depend on the theme's colours; the data
 * and the camera on the zones alone. A keystroke that leaves the same zones on the map now hands
 * MapLibre the same objects instead of rebuilding them on every render.
 */
export function ZoneMapCanvas(props: ZoneMapCanvasProps) {
  // Expo Go (and a dev build made before MapLibre was added) has no MapLibre native view. The
  // map still loads there: the zones are drawn as the web build draws them, as an SVG of the
  // same rings, with a line saying the street basemap needs a development build.
  if (mapLibre === null) return <SvgFallback {...props} />;

  return <MapLibreCanvas {...props} />;
}

function SvgFallback(props: ZoneMapCanvasProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={CANVAS_STYLE}>
      <ZoneMapSvg {...props} />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.sm,
          bottom: spacing.tight,
          left: spacing.tight,
          paddingHorizontal: spacing.tight,
          position: 'absolute',
          right: spacing.tight,
        }}
        testID="zone-map-unavailable"
      >
        <AppText tone="muted" variant="mapAnnotation">
          {t('discover.map.requiresDevelopmentBuild')}
        </AppText>
      </View>
    </View>
  );
}

function MapLibreCanvas({ label, zones }: ZoneMapCanvasProps) {
  const { colors, scheme } = useAppTheme();
  const { t } = useTranslation();

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

  const cameraRef = useRef<CameraRef>(null);
  const mapStyle = BASEMAP_STYLE[scheme];

  const data = useMemo(() => zoneFeatureCollection(zones), [zones]);
  const framedBounds = useMemo<[number, number, number, number] | null>(() => {
    const bounds = zoneBounds(zones.map((zone) => zone.ring));

    return bounds === null ? null : [bounds[0], bounds[1], bounds[2], bounds[3]];
  }, [zones]);

  if (mapLibre === null) return null;

  const { Camera, GeoJSONSource, Layer, Map: MapView } = mapLibre;

  const recentre = () => {
    if (framedBounds) {
      cameraRef.current?.fitBounds(framedBounds, { padding: CAMERA_PADDING, duration: 400 });
    }
  };

  return (
    <View style={CANVAS_STYLE}>
      <MapView
        // The map is content, not decoration: it is how the screen shows the zones, so it
        // carries a text alternative (WCAG 1.1.1, known issue 35) and the label is passed to
        // the platform's own accessibility props.
        accessibilityLabel={label}
        accessibilityRole="image"
        attribution={false}
        compass={false}
        logo={false}
        mapStyle={mapStyle}
        style={CANVAS_STYLE}
        testID="zone-map-drawing"
        touchPitch={false}
        touchRotate={false}
      >
        {framedBounds ? (
          <Camera
            bounds={framedBounds}
            maxZoom={MAX_ZOOM}
            minZoom={MIN_ZOOM}
            padding={CAMERA_PADDING}
            ref={cameraRef}
            testID="zone-map-camera"
          />
        ) : null}

        <GeoJSONSource data={data} id="pilot-zones" testID="zone-map-source">
          <Layer id="zone-fill" paint={fill} source="pilot-zones" type="fill" />
          <Layer id="zone-line" paint={line} source="pilot-zones" type="line" />
        </GeoJSONSource>
      </MapView>

      {/* ODbL: the OpenStreetMap credit is drawn whenever the basemap is (ADR-031 §3). */}
      <View
        pointerEvents="none"
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.sm,
          bottom: spacing.tight,
          left: spacing.tight,
          paddingHorizontal: spacing.tight,
          position: 'absolute',
        }}
        testID="zone-map-attribution"
      >
        <AppText tone="muted" variant="mapAnnotation">
          {t('discover.map.attribution')}
        </AppText>
      </View>

      {framedBounds ? (
        <Pressable
          accessibilityLabel={t('discover.map.recentre')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={recentre}
          style={{
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.control,
            borderWidth: 1,
            bottom: spacing.gap,
            height: layout.minTouchTarget,
            justifyContent: 'center',
            position: 'absolute',
            right: spacing.gap,
            width: layout.minTouchTarget,
          }}
          testID="zone-map-recentre"
        >
          <Feather color={colors.text} name="crosshair" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}
