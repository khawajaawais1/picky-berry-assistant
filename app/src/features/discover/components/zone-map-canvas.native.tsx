import type {
  CameraRef,
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  PressEventWithFeatures,
  ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import type { Feature, Point } from 'geojson';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type NativeSyntheticEvent } from 'react-native';

import { AppText } from '@/components/atoms';
import { Feather } from '@/components/atoms/app-icon';
import { layout, motion, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import {
  ZONE_CONFIDENT_OPACITY,
  ZONE_LOW_CONFIDENCE_OPACITY,
  ZONE_SCORE_BANDS,
} from '../domain/zone-score-band';
import { zoneBounds } from '../domain/zone-map-projection';
import { zoneFeatureCollection } from '../domain/zone-source';
import { PILOT_BBOX } from '../services/api-zone-source';

import { loadMapLibre } from './map-libre';
import type { ZoneMapCanvasProps } from './zone-map-canvas-props';
import { ZoneMapSvg } from './zone-map-svg';

/** The map is the whole canvas; one object, so a parent render does not hand the native view a new style. */
const CANVAS_STYLE = { flex: 1 } as const;

/** Space kept around the framed zones, in screen pixels. */
const CAMERA_PADDING = { top: 24, right: 24, bottom: 24, left: 24 } as const;
/** The map's floating search and selected-zone sheet need geographic content kept clear. */
const FULLSCREEN_CAMERA_PADDING = { top: 160, right: 56, bottom: 220, left: 24 } as const;

/** The native package is absent from Expo Go; see `map-libre.ts` for why this is not an import. */
const mapLibre = loadMapLibre();

/**
 * Whether this build draws a street basemap of its own. When it does, the map stays on screen
 * with no zones on it (loading, empty or failed) and the reason is laid over it; a tinted blank
 * where the map should be reads as a broken screen rather than as "nothing here yet".
 */
export const ZONE_MAP_HAS_BASEMAP = mapLibre !== null;

/** OpenFreeMap's outdoor-readable OSM style; UI overlays still follow the app's colour scheme. */
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SELECTED_ZONE_OPACITY = 0.92;

/** The pilot area as a camera frame: one stable array, so an empty answer does not re-fit the map. */
const PILOT_FRAME: [number, number, number, number] = [...PILOT_BBOX];

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

function MapLibreCanvas({
  fullscreen = false,
  label,
  onOpenLocationSettings,
  onSelectZone,
  position,
  positionStatus = 'off',
  selectedZoneId,
  zones,
}: ZoneMapCanvasProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [followingPosition, setFollowingPosition] = useState(false);

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
          ['get', 'selected'],
          SELECTED_ZONE_OPACITY,
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
        'line-opacity': ['case', ['get', 'selected'], 1, 0.78],
        'line-width': ['case', ['get', 'selected'], 3, 1],
      }) as unknown as NonNullable<LineLayerSpecification['paint']>,
    [colors],
  );

  const cameraRef = useRef<CameraRef>(null);
  const cameraPadding = fullscreen ? FULLSCREEN_CAMERA_PADDING : CAMERA_PADDING;
  const isFollowingPosition = followingPosition && position != null;

  const data = useMemo(() => zoneFeatureCollection(zones, selectedZoneId), [selectedZoneId, zones]);
  const positionData = useMemo<Feature<Point> | null>(
    () =>
      position
        ? {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [position.longitude, position.latitude] },
            properties: {},
          }
        : null,
    [position],
  );
  const positionPaint = useMemo(
    () =>
      ({
        'circle-color': colors.accent,
        'circle-radius': 8,
        'circle-stroke-color': colors.surface,
        'circle-stroke-width': 3,
      }) as NonNullable<CircleLayerSpecification['paint']>,
    [colors],
  );
  const zonesBounds = useMemo<[number, number, number, number] | null>(() => {
    const bounds = zoneBounds(zones.map((zone) => zone.ring));

    return bounds === null ? null : [bounds[0], bounds[1], bounds[2], bounds[3]];
  }, [zones]);
  // With nothing to fit, the camera frames the pilot area the zones are read from, so an empty
  // answer still shows the picker where the zones will be rather than a zoomed-out world.
  const framedBounds = zonesBounds ?? PILOT_FRAME;

  const recentre = useCallback(() => {
    setFollowingPosition(false);
    const camera = cameraRef.current;
    if (typeof camera?.fitBounds === 'function') {
      camera.fitBounds(framedBounds, {
        padding: cameraPadding,
        duration: motion.mapFit,
      });
    }
  }, [cameraPadding, framedBounds]);

  const followPosition = useCallback(() => {
    if (position === null || position === undefined) {
      onOpenLocationSettings?.(positionStatus);
      return;
    }
    setFollowingPosition(true);
  }, [onOpenLocationSettings, position, positionStatus]);

  useEffect(() => {
    if (!isFollowingPosition || !position) return;
    const camera = cameraRef.current;
    if (typeof camera?.easeTo === 'function') {
      camera.easeTo({
        center: [position.longitude, position.latitude],
        duration: motion.mapFollow,
        padding: cameraPadding,
        zoom: 14,
      });
    }
  }, [cameraPadding, isFollowingPosition, position]);

  const leaveFollowMode = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (event.nativeEvent.userInteraction) setFollowingPosition(false);
  }, []);

  const selectZone = useCallback(
    (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const id = event.nativeEvent.features[0]?.id;
      if (typeof id === 'string' || typeof id === 'number') onSelectZone?.(String(id));
    },
    [onSelectZone],
  );

  const settledWithoutFix = !['requesting', 'tracking', 'waiting'].includes(positionStatus);
  const canLocate = Boolean(position || (settledWithoutFix && onOpenLocationSettings));
  const needsPlatformAccess = ['denied', 'failed', 'unavailable'].includes(positionStatus);
  const locateLabel = position
    ? t('discover.map.myLocation')
    : t(needsPlatformAccess ? 'discover.map.fixLocationAccess' : 'discover.map.locationSettings');

  if (mapLibre === null) return null;

  const { Camera, GeoJSONSource, Layer, Map: MapView } = mapLibre;

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
        mapStyle={BASEMAP_STYLE}
        onRegionWillChange={leaveFollowMode}
        style={CANVAS_STYLE}
        testID="zone-map-drawing"
        touchPitch={false}
        touchRotate={false}
      >
        <Camera
          bounds={framedBounds}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          padding={cameraPadding}
          ref={cameraRef}
          testID="zone-map-camera"
        />

        <GeoJSONSource data={data} id="pilot-zones" onPress={selectZone} testID="zone-map-source">
          <Layer id="zone-fill" paint={fill} source="pilot-zones" type="fill" />
          <Layer id="zone-line" paint={line} source="pilot-zones" type="line" />
        </GeoJSONSource>

        {positionData ? (
          <GeoJSONSource
            data={positionData}
            id="user-location"
            testID="zone-map-user-location-source"
          >
            <Layer
              id="user-location-dot"
              paint={positionPaint}
              source="user-location"
              type="circle"
            />
          </GeoJSONSource>
        ) : null}
      </MapView>

      {/* ODbL: the OpenStreetMap credit is drawn whenever the basemap is (ADR-031 §3). */}
      <View
        pointerEvents="none"
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.sm,
          bottom: fullscreen ? undefined : spacing.tight,
          left: spacing.tight,
          paddingHorizontal: spacing.tight,
          position: 'absolute',
          top: fullscreen ? '52%' : undefined,
        }}
        testID="zone-map-attribution"
      >
        <AppText tone="muted" variant="mapAnnotation">
          {t('discover.map.attribution')}
        </AppText>
      </View>

      <View
        pointerEvents="box-none"
        style={{ gap: spacing.sm, position: 'absolute', right: spacing.gap, top: '44%' }}
      >
        {canLocate ? (
          <Pressable
            accessibilityLabel={locateLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: isFollowingPosition }}
            aria-pressed={isFollowingPosition}
            onPress={followPosition}
            style={{
              alignItems: 'center',
              backgroundColor: isFollowingPosition ? colors.accent : colors.surface,
              borderColor: isFollowingPosition ? colors.accent : colors.border,
              borderRadius: radii.pill,
              borderWidth: 1,
              height: layout.minTouchTarget,
              justifyContent: 'center',
              width: layout.minTouchTarget,
            }}
            testID="zone-map-my-location"
          >
            <Feather
              color={isFollowingPosition ? colors.onAccent : colors.text}
              name="navigation"
              size={20}
            />
          </Pressable>
        ) : null}

        {zonesBounds ? (
          <Pressable
            accessibilityLabel={t('discover.map.recentre')}
            accessibilityRole="button"
            onPress={recentre}
            style={{
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.pill,
              borderWidth: 1,
              height: layout.minTouchTarget,
              justifyContent: 'center',
              width: layout.minTouchTarget,
            }}
            testID="zone-map-recentre"
          >
            <Feather color={colors.text} name="maximize" size={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
