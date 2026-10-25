import {
  MAP_ANCHORS,
  MAP_BASE_LAYERS,
  MAP_BASE_PATHS,
  MAP_HEIGHT,
  MAP_ROUTE_PATH,
  MAP_ROUTE_STROKE,
  MAP_WIDTH,
  MAP_ZONE_SHAPES,
  POSITION_DOT_SIZE,
  POSITION_HALO_SIZE,
} from '../zone-map-geometry';

/**
 * The geometry is generated from the design file (the extraction command is in
 * docs/design-source.md), and generated data needs the invariants it cannot state itself:
 * every layer the app paints exists, everything is drawn inside the map's own box, and the
 * labels the frame places on it land on the map rather than beside it.
 *
 * A regeneration against another frame — or a hand-edit — is what these fail on. They do not
 * and cannot check that a shape is the *right* shape; that is what the frame and the review
 * are for.
 */

/** The numbers a path is built from, so its extent can be checked without a renderer. */
function coordinates(path: string): { x: number; y: number }[] {
  const pairs = path.match(/-?\d*\.?\d+ -?\d*\.?\d+/g) ?? [];

  return pairs.map((pair) => {
    const [x, y] = pair.split(' ').map(Number);

    return { x, y };
  });
}

/**
 * Whether a point is inside the polygon a path draws, by the crossing rule: a horizontal ray
 * from the point crosses an odd number of edges. The zone paths are simple polygons (a `M`,
 * line segments and a `Z`), so their coordinates in order are their vertices.
 */
function isInside(path: string, point: { x: number; y: number }): boolean {
  const corners = coordinates(path);
  let crossings = 0;

  for (let index = 0; index < corners.length; index += 1) {
    const from = corners[index]!;
    const to = corners[(index + 1) % corners.length]!;
    const spansTheRay = from.y > point.y !== to.y > point.y;

    if (spansTheRay) {
      const crossingX = from.x + ((point.y - from.y) / (to.y - from.y)) * (to.x - from.x);
      if (crossingX > point.x) crossings += 1;
    }
  }

  return crossings % 2 === 1;
}

describe('the map’s geometry', () => {
  it('draws every zone where the frame draws its label', () => {
    // The one thing generated geometry cannot check about itself: that a shape and the words
    // the frame puts on it are in the same place. A translation applied twice — or, as
    // happened once, applied with the node's own transform subtracted instead of added —
    // stacks the polygons in the map's corner while every other assertion still passes.
    const labelled = [
      { label: MAP_ANCHORS.recentlyPickedZone, shape: MAP_ZONE_SHAPES.recentlyPicked },
      { label: MAP_ANCHORS.ripeningZone, shape: MAP_ZONE_SHAPES.ripening },
      // The third zone's words are the score badge, which the frame draws inside it.
      { label: MAP_ANCHORS.scoreBadge, shape: MAP_ZONE_SHAPES.unpicked },
      // …and the frame puts the picker's own marker inside the recently picked zone.
      { label: MAP_ANCHORS.position, shape: MAP_ZONE_SHAPES.recentlyPicked },
    ];

    for (const { label, shape } of labelled) {
      expect({ label, inside: isInside(shape, label) }).toEqual({ label, inside: true });
    }
  });

  it('has a crossing rule that can say “outside” too', () => {
    // The control for the check above: a helper that reported everything inside would let
    // the stacked-polygons defect through unnoticed.
    expect(isInside(MAP_ZONE_SHAPES.ripening, { x: 300, y: 280 })).toBe(false);
  });

  it('is the frame’s own size', () => {
    expect({ height: MAP_HEIGHT, width: MAP_WIDTH }).toEqual({ height: 300, width: 342 });
  });

  it('has a path for every base layer, and three zone polygons', () => {
    expect(MAP_BASE_LAYERS).toHaveLength(4);

    for (const layer of MAP_BASE_LAYERS) {
      expect(MAP_BASE_PATHS[layer].length).toBeGreaterThan(10);
    }
    for (const shape of Object.values(MAP_ZONE_SHAPES)) {
      expect(shape).toMatch(/Z$/i);
    }
  });

  it('draws every zone fully inside the map, so a zone is never only half drawn', () => {
    // The zones are the shapes that carry meaning, and a polygon the frame cuts in half
    // would be a zone whose outline the legend cannot explain. The terrain below them may
    // bleed — see the next test — but a zone may not.
    for (const path of Object.values(MAP_ZONE_SHAPES)) {
      for (const { x, y } of coordinates(path)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(MAP_WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });

  it('lets the terrain bleed only as far as the frame’s own clipping hides it', () => {
    // The frame clips its contents (`clipsContent: true` on node 5:22966) and its lake and
    // trails do run past the box — the lake starts 8.4 px to the left of it. The app
    // reproduces that with `overflow: hidden`, so the bleed is invisible either way; what
    // this asserts is that it stays a bleed and does not become the drawing.
    const BLEED = 12;

    for (const path of Object.values(MAP_BASE_PATHS)) {
      for (const { x, y } of coordinates(path)) {
        expect(x).toBeGreaterThanOrEqual(-BLEED);
        expect(x).toBeLessThanOrEqual(MAP_WIDTH + BLEED);
        expect(y).toBeGreaterThanOrEqual(-BLEED);
        expect(y).toBeLessThanOrEqual(MAP_HEIGHT + BLEED);
      }
    }
  });

  it('places every label anchor inside the map, with room for the label itself', () => {
    for (const [what, anchor] of Object.entries(MAP_ANCHORS)) {
      expect({ what, inside: anchor.x >= 0 && anchor.x < MAP_WIDTH }).toEqual({
        what,
        inside: true,
      });
      expect({ what, inside: anchor.y >= 0 && anchor.y < MAP_HEIGHT }).toEqual({
        what,
        inside: true,
      });
    }
  });

  it('draws frame 08’s route where the frame draws it, in frame 06’s own coordinates', () => {
    // The route was traced from frame 08's own render rather than fetched as geometry (the
    // reason is in the module), and the frame measured it a second way: its node box is
    // x83 y115.9 112x144.9 in the 342x322 map, which in this space — the map's 342x300, which
    // the drawing is stretched to fit — is x83 y108 112x135. A traced *centreline* sits half a
    // stroke inside that box, so every edge of the one has to land within a stroke of the
    // other's. A hand-edited path, or a scale applied backwards, fails here.
    const frame = { x: 83, y: 108, width: 112, height: 135 };
    const points = coordinates(MAP_ROUTE_PATH);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const traced = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      right: Math.max(...xs),
      bottom: Math.max(...ys),
    };

    expect(points.length).toBeGreaterThanOrEqual(4);
    expect(Math.abs(traced.x - frame.x)).toBeLessThanOrEqual(MAP_ROUTE_STROKE);
    expect(Math.abs(traced.y - frame.y)).toBeLessThanOrEqual(MAP_ROUTE_STROKE);
    expect(Math.abs(traced.right - (frame.x + frame.width))).toBeLessThanOrEqual(MAP_ROUTE_STROKE);
    expect(Math.abs(traced.bottom - (frame.y + frame.height))).toBeLessThanOrEqual(
      MAP_ROUTE_STROKE,
    );
  });

  it('walks the route from the picker’s own marker into the zone it leads to', () => {
    // What the frame tells, geometrically: the walker starts at the marker frame 06 draws
    // them at and arrives inside the unpicked zone — the one the card is about, and the one
    // frame 09 then has them standing in.
    const points = coordinates(MAP_ROUTE_PATH);
    const start = points[0]!;
    const end = points[points.length - 1]!;
    const marker = {
      x: MAP_ANCHORS.halo.x + POSITION_HALO_SIZE / 2,
      y: MAP_ANCHORS.halo.y + POSITION_HALO_SIZE / 2,
    };

    expect(isInside(MAP_ZONE_SHAPES.unpicked, start)).toBe(true);
    expect(
      Math.hypot(end.x - marker.x, end.y - marker.y),
      // The route stops at the marker's edge rather than its centre: the frame draws the
      // marker over the route's last few pixels.
    ).toBeLessThanOrEqual(POSITION_HALO_SIZE / 2);
  });

  it('keeps the frame’s own marker sizes', () => {
    expect(POSITION_DOT_SIZE).toBe(14);
    expect(POSITION_HALO_SIZE).toBe(36);
  });
});
