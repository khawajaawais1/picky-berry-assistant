import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type FillLayerSpecification,
  type LineLayerSpecification,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

import {
  ZONE_CONFIDENT_OPACITY,
  ZONE_LOW_CONFIDENCE_OPACITY,
  ZONE_SCORE_BANDS,
} from '../domain/zone-score-band';
import { zoneBounds } from '../domain/zone-map-projection';
import { zoneFeatureCollection } from '../domain/zone-source';

import type { ZoneMapCanvasProps } from './zone-map-canvas-props';

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
 */
export function ZoneMapCanvas({ label, zones }: ZoneMapCanvasProps) {
  const { colors } = useAppTheme();

  const bounds = zoneBounds(zones.map((zone) => zone.ring));
  const ground: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'ground',
        type: 'background',
        paint: { 'background-color': colors.mapBase },
      },
    ],
  };

  // The band's lower edge is what each feature carries (`zoneFeatureCollection`), so the
  // style is one `match` rather than a layer per band — and the palette comes from the same
  // tokens the web drawing and the legend use.
  const bandColours = ZONE_SCORE_BANDS.flatMap((band) => [band.min, colors[band.fill]]);
  const bandLines = ZONE_SCORE_BANDS.flatMap((band) => [band.min, colors[band.line]]);

  // The style spec's expression type is a union large enough that building it by hand is
  // noise; the two objects below are ordinary MapLibre expressions, cast at this one seam.
  const fill = {
    'fill-color': ['match', ['get', 'band'], ...bandColours, colors.mapScoreLowest],
    'fill-opacity': [
      'case',
      ['get', 'lowConfidence'],
      ZONE_LOW_CONFIDENCE_OPACITY,
      ZONE_CONFIDENT_OPACITY,
    ],
  } as unknown as NonNullable<FillLayerSpecification['paint']>;
  const line = {
    'line-color': ['match', ['get', 'band'], ...bandLines, colors.mapScoreLowestLine],
    'line-width': 1.5,
  } as unknown as NonNullable<LineLayerSpecification['paint']>;

  return (
    <Map
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
      style={{ flex: 1 }}
      testID="zone-map-drawing"
      touchPitch={false}
      touchRotate={false}
      touchZoom={false}
    >
      {bounds ? (
        <Camera
          bounds={[bounds[0], bounds[1], bounds[2], bounds[3]]}
          padding={{ top: 24, right: 24, bottom: 24, left: 24 }}
        />
      ) : null}

      <GeoJSONSource data={zoneFeatureCollection(zones)} id="pilot-zones" testID="zone-map-source">
        <Layer id="zone-fill" paint={fill} source="pilot-zones" type="fill" />
        <Layer id="zone-line" paint={line} source="pilot-zones" type="line" />
      </GeoJSONSource>
    </Map>
  );
}
