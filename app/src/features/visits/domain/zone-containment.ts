/**
 * Zone containment: does a position lie inside a curated zone?
 *
 * Zones are operator-maintained polygons (PROJECT.md "Domain model decisions" 1),
 * so this is deliberately plane geometry on latitude/longitude pairs — adequate for
 * the small areas a zone covers.
 *
 * Known limitations, deliberate and recorded rather than hidden:
 * - A ring crossing the antimeridian (±180° longitude) is not supported; such a
 *   zone must be split before it reaches the client.
 * - Which zone wins when a point lies inside more than one — and whether anything
 *   curated exists *below* a zone — is an open question (PROJECT.md 9; §2.4 of
 *   to-questionnaire-zone-service.md). It is not answered here: the geometry decides
 *   *containment*, and a `ZoneResolution` the caller supplies decides the *choice*.
 *   Until one is supplied, `SERVER_ORDER` applies — the app's existing behaviour,
 *   named so it can be read and replaced as one rule rather than found in the middle
 *   of the loop.
 */

export type Point = { latitude: number; longitude: number };

/** Exterior ring; the closing vertex is optional. */
export type ZoneRing = readonly Point[];

export type ZonePolygon = { id: string; ring: ZoneRing };

/**
 * How a position that lies inside more than one zone resolves to one of them. Called
 * with every candidate that contains the point, in the order they were given, and
 * asked for exactly one back.
 *
 * This is the seam for an answer nobody has given yet: whether zones may overlap,
 * which of them then wins, and whether the operator curates anything below a zone are
 * open (PROJECT.md 9, §2.4 of to-questionnaire-zone-service.md). Either answer lands
 * here as a rule — a “smaller curated unit wins” rule, or none at all — without the
 * geometry or the payload changing, which is why no reading is assumed.
 */
export type ZoneResolution = (candidates: readonly ZonePolygon[]) => ZonePolygon;

/**
 * The app's behaviour to date: the first candidate the server sent. It is an
 * assumption, not a requirement, and it stays the default only because nothing has
 * decided otherwise (PROJECT.md 9).
 */
const SERVER_ORDER: ZoneResolution = (candidates) => candidates[0]!;

const MIN_RING_VERTICES = 3;
/** Cross-product tolerance for the "is this point on the segment" test. */
const ON_SEGMENT_EPSILON = 1e-12;

function isOnSegment(point: Point, from: Point, to: Point): boolean {
  const cross =
    (to.latitude - from.latitude) * (point.longitude - from.longitude) -
    (to.longitude - from.longitude) * (point.latitude - from.latitude);
  if (Math.abs(cross) > ON_SEGMENT_EPSILON) return false;

  const dot =
    (point.latitude - from.latitude) * (to.latitude - from.latitude) +
    (point.longitude - from.longitude) * (to.longitude - from.longitude);
  if (dot < 0) return false;

  const lengthSquared = (to.latitude - from.latitude) ** 2 + (to.longitude - from.longitude) ** 2;
  return dot <= lengthSquared;
}

/**
 * Ray casting. Boundary points (edges and vertices) count as inside, so a visit is
 * never lost to floating-point luck on a zone boundary.
 */
export function isPointInPolygon(point: Point, ring: ZoneRing): boolean {
  if (ring.length < MIN_RING_VERTICES) return false;

  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const from = ring[previous]!;
    const to = ring[current]!;

    if (isOnSegment(point, from, to)) return true;

    const straddles = to.longitude > point.longitude !== from.longitude > point.longitude;
    if (straddles) {
      const crossingLatitude =
        from.latitude +
        ((point.longitude - from.longitude) * (to.latitude - from.latitude)) /
          (to.longitude - from.longitude);
      if (point.latitude < crossingLatitude) inside = !inside;
    }
  }

  return inside;
}

/**
 * The zone the point lies in, or null. When more than one contains it the `resolve` rule
 * chooses — see `ZoneResolution`. Degenerate rings are skipped rather than offered to the
 * rule, so a rule is never asked to choose from an empty list.
 */
export function findContainingZone(
  point: Point,
  zones: readonly ZonePolygon[],
  resolve: ZoneResolution = SERVER_ORDER,
): ZonePolygon | null {
  const candidates = zones.filter((zone) => isPointInPolygon(point, zone.ring));
  return candidates.length === 0 ? null : resolve(candidates);
}
