/**
 * Traces a stroked line out of a Figma frame render, in the frame's own coordinates.
 *
 * Why this exists: the design file's vector *geometry* arrives through the REST API's
 * `geometry=paths`, and that endpoint's quota is per token — it can be spent before a frame is
 * read. The rendered-node endpoint has its own budget, so when the geometry is unavailable the
 * shape can still be read from the frame's own render and turned back into a polyline:
 * the stroke is located by colour, walked along its centreline, simplified to the vertices
 * that carry the shape, and divided by the render's scale.
 *
 * What comes out is the design's own line to within the stroke's width — and the frame
 * measures it a second way (its node box, which the geometry test asserts against), so the
 * result is checked rather than trusted. The route in
 * `src/features/discover/domain/zone-map-geometry.ts` was read this way; how and why is in
 * docs/design-source.md.
 *
 * Usage:
 *
 *   node scripts/trace-figma-stroke.mjs <render.png> <#RRGGBB> <tolerance> <scale> [excluded regions]
 *
 * The tolerance is the sum of the per-channel differences from the stroke's colour (60 reads
 * an anti-aliased 5 px stroke cleanly), the scale is the render's own (2 for a @2x export),
 * and each excluded region is `x,y,width,height` in render pixels — where a mark of the same
 * colour sits and must not be mistaken for the line.
 */
// Imported rather than taken from the globals: this script is linted with the app's own
// configuration, which does not declare Node globals.
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import zlib from 'node:zlib';

/** Minimal PNG reader: 8-bit, non-interlaced, RGB or RGBA — what Figma's exports are. */
function decodePng(path) {
  const buffer = fs.readFileSync(path);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colourType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error(`bit depth ${data[8]} is not supported`);
      if (data[12] !== 0) throw new Error('interlaced PNGs are not supported');
      colourType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;
  if (channels === 0) throw new Error(`colour type ${colourType} is not supported`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  let read = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[read];
    read += 1;
    const row = raw.subarray(read, read + stride);
    read += stride;
    const previous = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    const target = pixels.subarray(y * stride, (y + 1) * stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? target[x - channels] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= channels ? previous[x - channels] : 0;
      let value = row[x];

      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }

      target[x] = value & 0xff;
    }
  }

  return { channels, height, pixels, width };
}

function maskOf(image, hex, tolerance, exclusions) {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const pixels = [];

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * image.channels;
      const distance =
        Math.abs(image.pixels[i] - red) +
        Math.abs(image.pixels[i + 1] - green) +
        Math.abs(image.pixels[i + 2] - blue);

      if (distance > tolerance) continue;
      if (exclusions.some((r) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3])) {
        continue;
      }

      pixels.push([x, y]);
    }
  }

  return pixels;
}

/**
 * Marches along the stroke: from a point on it, look at the stroke's pixels in a ring ahead,
 * take their centroid as the next point, and keep the direction. That is what makes the result
 * the *centre* of the stroke rather than one of its edges — and, unlike thinning a rasterised
 * line, it will not collapse where the stroke turns sharply.
 */
function march(pixels, start, radius) {
  const near = (point, r) => pixels.filter(([x, y]) => Math.hypot(x - point[0], y - point[1]) <= r);
  const centroid = (list) => [
    list.reduce((a, p) => a + p[0], 0) / list.length,
    list.reduce((a, p) => a + p[1], 0) / list.length,
  ];
  const unit = ([dx, dy]) => {
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  };

  let current = start;
  const ahead0 = centroid(near(current, radius * 2));
  let direction = unit([ahead0[0] - current[0], ahead0[1] - current[1]]);
  const path = [current];

  for (let step = 0; step < 10_000; step += 1) {
    const ahead = near(current, radius).filter(([x, y]) => {
      const [dx, dy] = [x - current[0], y - current[1]];
      return Math.hypot(dx, dy) >= radius * 0.55 && dx * direction[0] + dy * direction[1] > 0;
    });

    if (ahead.length < 3) break;

    const next = centroid(ahead);
    const step0 = unit([next[0] - current[0], next[1] - current[1]]);
    direction = unit([direction[0] * 0.5 + step0[0] * 0.5, direction[1] * 0.5 + step0[1] * 0.5]);
    current = next;
    path.push(current);
  }

  return path;
}

/** Douglas–Peucker: keep the vertices that carry the shape. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];
  const [dx, dy] = [last[0] - first[0], last[1] - first[1]];
  const length = Math.hypot(dx, dy) || 1;
  let furthest = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance =
      Math.abs((points[i][0] - first[0]) * dy - (points[i][1] - first[1]) * dx) / length;
    if (distance > furthest) {
      furthest = distance;
      index = i;
    }
  }

  if (furthest <= epsilon) return [first, last];

  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ];
}

const [png, hex, tolerance, scale, ...exclusions] = process.argv.slice(2);
const image = decodePng(png);
const regions = exclusions
  .join(',')
  .split(',')
  .filter(Boolean)
  .map(Number)
  .reduce((all, value, i, list) => (i % 4 === 0 ? [...all, list.slice(i, i + 4)] : all), []);
const pixels = maskOf(image, hex, Number(tolerance), regions);

// The start is the stroke's topmost pixel: for the route that is the end inside the zone, and
// the walk then runs back to the marker the frame draws the picker at.
const painted = new Set(pixels.map(([x, y]) => `${x},${y}`));
let start = null;
for (let y = 0; y < image.height && !start; y += 1) {
  for (let x = 0; x < image.width && !start; x += 1) {
    if (painted.has(`${x},${y}`)) start = [x + 0.5, y + 0.5];
  }
}
if (!start) throw new Error(`no ${hex} stroke in ${png}`);

const centreline = march(pixels, start, 9);
const points = simplify(centreline, 2.5).map(([x, y]) => [
  Number((x / Number(scale)).toFixed(1)),
  Number((y / Number(scale)).toFixed(1)),
]);
const xs = points.map((p) => p[0]);
const ys = points.map((p) => p[1]);

console.log(`stroke pixels ${pixels.length}, vertices ${points.length}`);
console.log(
  `bbox x${Math.min(...xs).toFixed(1)} y${Math.min(...ys).toFixed(1)} ` +
    `${(Math.max(...xs) - Math.min(...xs)).toFixed(1)}x${(Math.max(...ys) - Math.min(...ys)).toFixed(1)}`,
);
console.log(`path: ${points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('')}`);
