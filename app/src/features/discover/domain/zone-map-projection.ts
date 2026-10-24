import type { ZonePoint } from './zone-source';

/**
 * Placing zone rings in the web export's box.
 *
 * MapLibre React Native has no web target (ADR-031), and the layout and accessibility
 * harnesses measure a static web export (ADR-018, ADR-019) — so the web answer is a
 * projection of the same GeoJSON rings into an SVG, not a second map library. That keeps
 * the screen measured in both languages at both text sizes, and keeps the device's map the
 * only tile renderer the app ships.
 *
 * The projection is **local equirectangular**: at 62°N a degree of longitude is 0.465 of a
 * degree of latitude, so longitude is multiplied by the cosine of the mean latitude before
 * the two axes are scaled together. That is what keeps a square on the ground square on the
 * screen at this scale; a global projection (Mercator, or plain degrees) would not.
 */

export type MapBox = {
  width: number;
  height: number;
  /** Space kept free on every edge, so a zone on the boundary is not clipped. */
  padding: number;
};

const round = (value: number) => Math.round(value * 10) / 10;

/** The box around every ring, in GeoJSON's order: west, south, east, north. */
export type ZoneBounds = readonly [west: number, south: number, east: number, north: number];

/** The camera's box for the native map, or `null` when there is nothing to frame. */
export function zoneBounds(rings: readonly (readonly ZonePoint[])[]): ZoneBounds | null {
  const all = rings.flat();
  if (all.length === 0) return null;

  const longitudes = all.map(([longitude]) => longitude);
  const latitudes = all.map(([, latitude]) => latitude);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

/**
 * One SVG path per ring, in the order given, inside the box. A fan of zones is fitted as a
 * whole — each zone keeps its position relative to the others — rather than each one being
 * fitted to the box on its own.
 */
export function projectRings(
  rings: readonly (readonly ZonePoint[])[],
  box: MapBox,
): readonly string[] {
  const all = rings.flat();
  if (all.length === 0) return [];

  const longitudes = all.map(([longitude]) => longitude);
  const latitudes = all.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);

  // Longitude's shrinking degree, at the middle of what is being drawn.
  const meanLatitude = ((south + north) / 2) * (Math.PI / 180);
  const longitudeScale = Math.cos(meanLatitude);

  const spanX = (east - west) * longitudeScale;
  const spanY = north - south;
  const availableWidth = Math.max(box.width - box.padding * 2, 1);
  const availableHeight = Math.max(box.height - box.padding * 2, 1);

  // One factor for both axes: fitting each axis separately would stretch every zone.
  const scale = Math.min(
    spanX > 0 ? availableWidth / spanX : Number.POSITIVE_INFINITY,
    spanY > 0 ? availableHeight / spanY : Number.POSITIVE_INFINITY,
  );

  const centreX = box.width / 2;
  const centreY = box.height / 2;
  const project = ([longitude, latitude]: ZonePoint): [number, number] => {
    // A ring with no area has no scale to apply; it lands at the box's centre rather than
    // producing a path full of NaN.
    if (!Number.isFinite(scale)) return [centreX, centreY];

    const x = centreX + (longitude - (west + east) / 2) * longitudeScale * scale;
    const y = centreY - (latitude - (south + north) / 2) * scale;

    return [round(x), round(y)];
  };

  return rings.map((ring) => {
    const [first, ...rest] = ring.map(project);
    const commands = rest.map(([x, y]) => `L${x} ${y}`);

    return `M${first![0]} ${first![1]}${commands.join('')}Z`;
  });
}
