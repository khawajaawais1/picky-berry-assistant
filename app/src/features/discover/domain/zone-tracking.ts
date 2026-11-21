import type { Zone } from './zone-source';

/**
 * The zones as the visit tracker reads them (ADR-066): the same rings the map draws, converted
 * from GeoJSON's `[longitude, latitude]` to the tracker's points, under the zone id that
 * `POST /visits` takes. The shape is structural, so this feature imports nothing from visits.
 *
 * Pure, and memoised per list: the same zones answer the same array, so the tracker is not
 * handed a new list on every render.
 */
export type ZoneTrackingPolygon = {
  id: string;
  ring: readonly { latitude: number; longitude: number }[];
};

const cache = new WeakMap<readonly Zone[], readonly ZoneTrackingPolygon[]>();

export function zoneTrackingPolygons(zones: readonly Zone[]): readonly ZoneTrackingPolygon[] {
  const held = cache.get(zones);
  if (held) return held;

  const polygons = zones.map((zone) => ({
    id: zone.id,
    ring: zone.ring.map(([longitude, latitude]) => ({ latitude, longitude })),
  }));
  cache.set(zones, polygons);
  return polygons;
}
