import type { Locale } from '@/services/i18n';

/**
 * The way to a zone, from what the app actually knows: the phone's position and the zone's
 * outline. There is no routing service, so the screen states the straight-line distance, the
 * compass heading and a walking estimate, and hands turn-by-turn directions to the platform's
 * maps app (`walkingDirectionsUrl`).
 */

export type LngLat = readonly [longitude: number, latitude: number];

export type CompassPoint = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/** Forest walking pace used for the estimate, km/h. */
export const WALKING_KMH = 4;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** The middle of a zone's ring: the mean of its vertices, the closing vertex counted once. */
export function ringCentre(ring: readonly LngLat[]): LngLat {
  const points =
    ring.length > 1 &&
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.slice(0, -1)
      : ring;
  if (points.length === 0) throw new RangeError('a zone ring has at least one vertex');

  const sum = points.reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/** Great-circle distance in metres. */
export function distanceMeters(from: LngLat, to: LngLat): number {
  const dLat = toRad(to[1] - from[1]);
  const dLng = toRad(to[0] - from[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from one point to another, degrees clockwise from north. */
export function bearingDegrees(from: LngLat, to: LngLat): number {
  const φ1 = toRad(from[1]);
  const φ2 = toRad(to[1]);
  const Δλ = toRad(to[0] - from[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const POINTS: readonly CompassPoint[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

export function compassPoint(bearing: number): CompassPoint {
  return POINTS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]!;
}

/** Whole minutes to walk a distance at `WALKING_KMH`, at least one. */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round((meters / 1000 / WALKING_KMH) * 60));
}

/** Directions in the platform's maps app, walking, to a point. */
export function walkingDirectionsUrl(to: LngLat): string {
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${to[1].toFixed(6)},${to[0].toFixed(6)}`;
}

export function formatDistance(meters: number, locale: Locale): string {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError(`a distance is a non-negative number of metres, got ${meters}`);
  }

  if (meters < 1000) return `${Math.round(meters)} m`;

  const kilometres = (Math.round(meters / 100) / 10).toFixed(1);

  return `${locale === 'fi' ? kilometres.replace('.', ',') : kilometres} km`;
}
