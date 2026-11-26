import type { ZoneMapCanvasProps } from './zone-map-canvas-props';
import { ZoneMapSvg } from './zone-map-svg';

/**
 * The web export's map: MapLibre React Native has no web target, so the web draws the same
 * GeoJSON rings as an SVG (`zone-map-svg.tsx`, ADR-031's fallback).
 */
/** The SVG has no street basemap: with no zones there is nothing to draw, so the map says why instead. */
export const ZONE_MAP_HAS_BASEMAP = false;

export function ZoneMapCanvas(props: ZoneMapCanvasProps) {
  return <ZoneMapSvg {...props} />;
}
