import {
  GEOFENCE_REFRESH_METERS,
  GEOFENCE_ZONE_LIMIT,
  findContainingZone,
  isPointInPolygon,
  nearestZonePolygons,
  shouldRefreshGeofenceSet,
  type Point,
  type ZonePolygon,
  type ZoneResolution,
} from '../zone-containment';

/** Synthetic coordinates: latitude and longitude both 0–10, so reasoning is trivial. */
const square = (): Point[] => [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 10 },
  { latitude: 10, longitude: 10 },
  { latitude: 10, longitude: 0 },
];

const point = (latitude: number, longitude: number): Point => ({ latitude, longitude });

const zone = (id: string, ring: Point[]): ZonePolygon => ({ id, ring });

const squareAround = (latitude: number, longitude: number, halfSpan = 0.001): Point[] => [
  point(latitude - halfSpan, longitude - halfSpan),
  point(latitude - halfSpan, longitude + halfSpan),
  point(latitude + halfSpan, longitude + halfSpan),
  point(latitude + halfSpan, longitude - halfSpan),
  point(latitude - halfSpan, longitude - halfSpan),
];

/** North–south extent of a ring, so “the smaller one” needs no geometry import. */
const ringSpan = (ring: readonly Point[]): number =>
  Math.max(...ring.map((vertex) => vertex.latitude)) -
  Math.min(...ring.map((vertex) => vertex.latitude));

describe('isPointInPolygon', () => {
  it('contains an interior point', () => {
    expect(isPointInPolygon(point(5, 5), square())).toBe(true);
  });

  it('excludes a point outside the ring', () => {
    expect(isPointInPolygon(point(15, 5), square())).toBe(false);
    expect(isPointInPolygon(point(5, -1), square())).toBe(false);
  });

  it('treats an edge midpoint as inside', () => {
    expect(isPointInPolygon(point(0, 5), square())).toBe(true);
    expect(isPointInPolygon(point(5, 10), square())).toBe(true);
  });

  it('treats a vertex as inside', () => {
    expect(isPointInPolygon(point(0, 0), square())).toBe(true);
  });

  it('does not require the ring to repeat its first point', () => {
    expect(isPointInPolygon(point(5, 5), square())).toBe(true);
  });

  it('does not mistake the zero-length closing segment for every point in the world', () => {
    const closed = [...square(), square()[0]!];

    expect(isPointInPolygon(point(5, 5), closed)).toBe(true);
    expect(isPointInPolygon(point(50, 50), closed)).toBe(false);
  });

  it('ignores winding order', () => {
    const clockwise = [...square()].reverse();

    expect(isPointInPolygon(point(5, 5), clockwise)).toBe(true);
    expect(isPointInPolygon(point(15, 5), clockwise)).toBe(false);
  });

  // Rows are wrapped so each one supplies exactly one argument; an empty row would
  // otherwise be read as a `done`-style test and hang.
  it.each([[[]], [[point(0, 0)]], [[point(0, 0), point(0, 10)]]] as [Point[]][])(
    'never contains a point when the ring has fewer than three vertices (%p)',
    (ring) => {
      expect(isPointInPolygon(point(0, 0), ring)).toBe(false);
      expect(isPointInPolygon(point(5, 5), ring)).toBe(false);
    },
  );

  describe('concave ring (chevron with a notch)', () => {
    const chevron = (): Point[] => [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 5, longitude: 5 },
      { latitude: 10, longitude: 0 },
    ];

    it('contains points in both arms', () => {
      expect(isPointInPolygon(point(2, 8), chevron())).toBe(true);
    });

    it('excludes the notch cut out of the middle', () => {
      expect(isPointInPolygon(point(8, 5), chevron())).toBe(false);
    });
  });
});

describe('findContainingZone', () => {
  const outer = zone('outer', square());
  const inner = zone('inner', [point(1, 1), point(1, 3), point(3, 3), point(3, 1)]);

  it('returns the zone containing the point', () => {
    expect(findContainingZone(point(2, 2), [inner])?.id).toBe('inner');
  });

  it('returns null when no zone contains the point', () => {
    expect(findContainingZone(point(50, 50), [outer, inner])).toBeNull();
  });

  it('returns null for an empty zone list', () => {
    expect(findContainingZone(point(5, 5), [])).toBeNull();
  });

  // The rule the caller supplies is what picks the winner; this is the behaviour that is in
  // place while no rule is supplied, and it is the app's existing behaviour rather than an
  // answer anyone has given (the seam and its cases are in the `describe` below).
  it('resolves overlaps by the server-provided order when the caller supplies no rule', () => {
    expect(findContainingZone(point(2, 2), [inner, outer])?.id).toBe('inner');
    expect(findContainingZone(point(2, 2), [outer, inner])?.id).toBe('outer');
  });

  it('skips degenerate rings instead of failing', () => {
    const degenerate = zone('degenerate', [point(0, 0), point(0, 1)]);

    expect(findContainingZone(point(5, 5), [degenerate, outer])?.id).toBe('outer');
  });

  /**
   * Whether anything curated exists **below** a zone, and what a point inside two zones means,
   * are open — [PROJECT.md](../../../../../PROJECT.md) question 9, and §2.4 of
   * [to-questionnaire-zone-service.md](../../../../../to-questionnaire-zone-service.md). These
   * cases fix the seam rather than the answer: the geometry decides *containment*, and the rule
   * the caller supplies decides the *choice*, so neither reading of §2.4 is assumed here. A rule
   * reading “a curated unit below a zone wins” is one the caller can pass the day it is answered;
   * so is leaving the answer flat, by supplying none.
   */
  describe('the rule the caller supplies for a point inside more than one zone', () => {
    /** One reading §2.4 could land on: the smaller curated unit inside the larger one wins. */
    const smallestSpan: ZoneResolution = (candidates) =>
      candidates.reduce((smallest, candidate) =>
        ringSpan(candidate.ring) < ringSpan(smallest.ring) ? candidate : smallest,
      );

    it('resolves by the rule it is given, not by the order the server sent', () => {
      const lastSent: ZoneResolution = (candidates) => candidates[candidates.length - 1]!;

      expect(findContainingZone(point(2, 2), [outer, inner], lastSent)?.id).toBe('inner');
      expect(findContainingZone(point(2, 2), [inner, outer], lastSent)?.id).toBe('outer');
    });

    it('offers every zone containing the point to the rule, so a nested one can win', () => {
      expect(findContainingZone(point(2, 2), [outer, inner], smallestSpan)?.id).toBe('inner');
      expect(findContainingZone(point(2, 2), [inner, outer], smallestSpan)?.id).toBe('inner');
    });

    it('never calls the rule when no zone contains the point', () => {
      const forbidden: ZoneResolution = () => {
        throw new Error('asked to choose a zone, with no candidate to choose from');
      };

      expect(findContainingZone(point(50, 50), [outer, inner], forbidden)).toBeNull();
    });

    it('skips a degenerate ring before the rule is asked to choose', () => {
      const degenerate = zone('degenerate', [point(0, 0), point(0, 1)]);
      const firstSent: ZoneResolution = (candidates) => candidates[0]!;

      expect(findContainingZone(point(5, 5), [degenerate, outer], firstSent)?.id).toBe('outer');
    });
  });
});

describe('the foreground geofence set', () => {
  it('selects at most the 20 nearest zone polygons in distance order', () => {
    const zones = Array.from({ length: 25 }, (_, index) =>
      zone(`zone-${index}`, squareAround(0, index * 0.01)),
    );

    const selected = nearestZonePolygons(point(0, 0), zones);

    expect(GEOFENCE_ZONE_LIMIT).toBe(20);
    expect(selected).toHaveLength(20);
    expect(selected.map((candidate) => candidate.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `zone-${index}`),
    );
  });

  it('keeps a containing zone ahead of a polygon whose centroid is nearer', () => {
    const containing = zone('containing', [
      point(-0.001, -0.001),
      point(-0.001, 0.1),
      point(0.001, 0.1),
      point(0.001, -0.001),
    ]);
    const nearby = zone('nearby', squareAround(0.002, 0));

    expect(nearestZonePolygons(point(0, 0), [nearby, containing])[0]?.id).toBe('containing');
  });

  it('drops a degenerate ring instead of inventing a centre for it', () => {
    const valid = zone('valid', squareAround(1, 1));

    expect(nearestZonePolygons(point(0, 0), [zone('degenerate', []), valid])).toEqual([valid]);
  });

  it('refreshes only after the device has moved two kilometres from the set anchor', () => {
    const anchor = point(62.24, 25.76);

    expect(GEOFENCE_REFRESH_METERS).toBe(2_000);
    expect(shouldRefreshGeofenceSet(anchor, point(62.257, 25.76))).toBe(false);
    expect(shouldRefreshGeofenceSet(anchor, point(62.259, 25.76))).toBe(true);
  });
});
