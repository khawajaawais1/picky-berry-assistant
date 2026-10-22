import type { Locale } from '@/services/i18n';

import { DEMO_ZONE_DETAILS } from './zone-details';

/**
 * What frame 08 (Core picker · Route to zone, node `5:23106`) knows about getting to a zone:
 * how far the walk is, how long it takes, when it arrives, and the next turn on the trail.
 *
 * It belongs to the same demo zone frames 06 and 07 tell their story about — the unpicked
 * one, “Zone 14 · Laajavuori” — and that tie is asserted rather than assumed: frame 07's card
 * offers this screen as “Navigate · 1.4 km”, and the number has to be one number, not two
 * that happen to look alike.
 *
 * Nothing computes any of it. There is no routing service and no position source, so the
 * figures are the design's own sample, exactly as the zone's score is; when a route service
 * exists it replaces this constant and the screen's structure does not change.
 */

/** Which way the trail turns next (the frame's “Keep right…”). */
export type TurnDirection = 'left' | 'right';

export type ZoneRoute = {
  /** The zone the route leads to; must be the demo zone, as frames 06 and 07 have it. */
  zoneId: string;
  distanceMeters: number;
  /** The frame's own 22 minutes, so the walker can see whether it fits the afternoon. */
  minutes: number;
  /** The clock time the route is expected to arrive at, as the frame prints it (10:03). */
  arrivalTime: string;
  nextTurn: { direction: TurnDirection; meters: number };
};

export const DEMO_ROUTE: ZoneRoute = {
  zoneId: DEMO_ZONE_DETAILS.zoneId,
  distanceMeters: 1400,
  minutes: 22,
  arrivalTime: '10:03',
  nextTurn: { direction: 'right', meters: 180 },
};

/** The route to one zone, or nothing — never another zone's walk (see `zoneDetailsFor`). */
export function routeFor(zoneId: string): ZoneRoute | undefined {
  return DEMO_ROUTE.zoneId === zoneId ? DEMO_ROUTE : undefined;
}

/**
 * A distance in the language's own notation: metres while the walk is short, kilometres with
 * the decimal mark that language writes — “1.4 km” in English, “1,4 km” in Finnish, which is
 * why the value is metres and the sentence is the catalogue's.
 *
 * The design prints both forms on the same screen (its card reads “1.4 km” and its route
 * guidance “180 m”), so the threshold is the design's own: a kilometre.
 */
export function formatDistance(meters: number, locale: Locale): string {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError(`a distance is a non-negative number of metres, got ${meters}`);
  }

  if (meters < 1000) return `${Math.round(meters)} m`;

  const kilometres = (Math.round(meters / 100) / 10).toFixed(1);

  return `${locale === 'fi' ? kilometres.replace('.', ',') : kilometres} km`;
}
