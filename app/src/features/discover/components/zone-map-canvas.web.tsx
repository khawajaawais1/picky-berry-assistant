import type { ZoneMapCanvasProps } from './zone-map-canvas-props';
import { ZoneMapSvg } from './zone-map-svg';

/**
 * The web export's map: MapLibre React Native has no web target, so the web draws the same
 * GeoJSON rings as an SVG (`zone-map-svg.tsx`, ADR-031's fallback).
 */
export function ZoneMapCanvas(props: ZoneMapCanvasProps) {
  return <ZoneMapSvg {...props} />;
}
