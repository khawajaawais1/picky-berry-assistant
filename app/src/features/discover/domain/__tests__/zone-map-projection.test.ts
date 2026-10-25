import { projectRings, zoneBounds, type MapBox } from '../zone-map-projection';

/**
 * The web export's map is drawn, not tiled (MapLibre has no web target — ADR-031), so the
 * rings have to be placed in a box by hand. These cases pin the two things a hand-rolled
 * projection gets wrong: the aspect ratio (a degree of longitude is not a degree of
 * latitude at 62°N) and the edges (a zone that touches the bounds must not be clipped).
 */

const BOX: MapBox = { width: 342, height: 300, padding: 16 };

/** The numbers in an SVG path, as pairs. */
function points(path: string): [number, number][] {
  return [...path.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
}

/** A ring around Laajavuori, `lonSpan` degrees wide and `latSpan` degrees tall. */
function boxRing(lon: number, lat: number, lonSpan: number, latSpan: number) {
  return [
    [lon, lat],
    [lon + lonSpan, lat],
    [lon + lonSpan, lat + latSpan],
    [lon, lat + latSpan],
    [lon, lat],
  ] as const;
}

describe('projectRings', () => {
  it('writes one closed path per ring, in the order it was given', () => {
    const paths = projectRings(
      [boxRing(25.68, 62.25, 0.01, 0.01), boxRing(25.7, 62.27, 0.01, 0.01)],
      BOX,
    );

    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path.startsWith('M')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
    }
    // The second ring is east and north of the first, so its path starts right and up.
    const [first] = points(paths[0]!);
    const second = points(paths[1]!)[0]!;
    expect(second[0]).toBeGreaterThan(first[0]);
    expect(second[1]).toBeLessThan(first[1]);
  });

  it('keeps every point inside the padded box', () => {
    const paths = projectRings(
      [boxRing(25.64, 62.23, 0.02, 0.02), boxRing(25.74, 62.28, 0.02, 0.02)],
      BOX,
    );

    for (const path of paths) {
      for (const [x, y] of points(path)) {
        expect(x).toBeGreaterThanOrEqual(BOX.padding);
        expect(x).toBeLessThanOrEqual(BOX.width - BOX.padding);
        expect(y).toBeGreaterThanOrEqual(BOX.padding);
        expect(y).toBeLessThanOrEqual(BOX.height - BOX.padding);
      }
    }
  });

  it('keeps a square on the ground square on the screen', () => {
    // At 62.26°N a degree of longitude is 0.465 of a degree of latitude, so a ring that is
    // square in metres is 0.0215° wide and 0.01° tall in degrees. Projecting degrees as if
    // they were metres would squash it to less than half its width.
    const lonSpan = 0.01 / Math.cos((62.255 * Math.PI) / 180);
    const path = projectRings([boxRing(25.69, 62.25, lonSpan, 0.01)], {
      width: 400,
      height: 400,
      padding: 0,
    })[0]!;

    const [a, b, , d] = points(path) as [number, number][];
    const width = Math.abs(b![0] - a![0]);
    const height = Math.abs(d![1] - a![1]);

    expect(width / height).toBeGreaterThan(0.97);
    expect(width / height).toBeLessThan(1.03);
  });

  it('centres a shape narrower than the box instead of pinning it to a corner', () => {
    const path = projectRings([boxRing(25.69, 62.25, 0.002, 0.002)], BOX)[0]!;
    const projected = points(path);
    const xs = projected.map(([x]) => x);
    const ys = projected.map(([, y]) => y);
    const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;

    expect(centreX).toBeCloseTo(BOX.width / 2, 5);
    expect(centreY).toBeCloseTo(BOX.height / 2, 5);
  });

  it('survives a ring with no area, which is a point rather than a shape', () => {
    const paths = projectRings(
      [
        [
          [25.69, 62.25],
          [25.69, 62.25],
          [25.69, 62.25],
        ],
      ],
      BOX,
    );

    // No NaN in the path: an invalid path is a React Native warning and a blank map.
    expect(paths[0]).not.toMatch(/NaN/);
    expect(points(paths[0]!)).toHaveLength(3);
  });

  it('has nothing to draw when there are no zones', () => {
    expect(projectRings([], BOX)).toEqual([]);
  });
});

describe('zoneBounds', () => {
  it('frames every ring the camera has to hold', () => {
    const bounds = zoneBounds([
      boxRing(25.64, 62.23, 0.02, 0.02),
      boxRing(25.74, 62.28, 0.02, 0.02),
    ])!;

    // Compared loosely because the corners are the sums of the offsets, and 62.28 + 0.02 is
    // not exactly 62.3 in binary floating point.
    expect(bounds[0]).toBeCloseTo(25.64, 9);
    expect(bounds[1]).toBeCloseTo(62.23, 9);
    expect(bounds[2]).toBeCloseTo(25.76, 9);
    expect(bounds[3]).toBeCloseTo(62.3, 9);
  });

  it('has no box for no rings', () => {
    expect(zoneBounds([])).toBeNull();
  });
});
