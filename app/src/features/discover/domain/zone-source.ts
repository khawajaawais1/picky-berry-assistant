import type { FeatureCollection, Polygon } from 'geojson';

import { SPECIES, type Species } from './species';
import { scoreBand } from './zone-score-band';

/**
 * The **ZoneSource port**: the one place the map asks for zones, and the shape it can read.
 *
 * Today the only adapter is the data team's stub (`services/test-zone-source.ts`), and that
 * is deliberate: no service returns zones yet (PROJECT.md known issue 14, ADR-036 §2), so the
 * map gets a stub through the same seam a real endpoint will use rather than reading a
 * module constant. When the service lands, `list` is what changes and no screen does.
 *
 * Two rules hold here, both from ADR-036 §1.2, which proposes them as the app's reading of
 * what a zone service must return:
 *
 * - **Every field is validated at the boundary.** This payload is external input
 *   (SECURITY.md §4): a ring the app cannot draw, a score it cannot band, or an identifier
 *   it cannot print is dropped, and a document that is not a feature collection is **no
 *   zones at all**. Half a payload's zones would be a map that lies by omission.
 * - **Nothing unknown is carried on.** A field the app does not draw is not echoed onto the
 *   zone, so a component cannot start depending on something the contract never promised.
 *
 * The score a zone carries is the one for the species the caller asked about — the contract
 * is `GET /zones?species=…` — even though the stub also ships all four species' scores.
 */

export const ZONE_CONFIDENCE = ['low', 'medium', 'high'] as const;
export type ZoneConfidence = (typeof ZONE_CONFIDENCE)[number];

export const ZONE_RIPENESS = ['unripe', 'ripening', 'ripe', 'past'] as const;
export type ZoneRipeness = (typeof ZONE_RIPENESS)[number];

/** `[longitude, latitude]`, in GeoJSON's order, as the file writes it. */
export type ZonePoint = readonly [longitude: number, latitude: number];

export type ZoneScore = {
  score: number;
  confidence: ZoneConfidence;
  ripeness: ZoneRipeness;
};

/** One zone as the map can draw it. */
export type Zone = {
  /** Stable, never reused — the contract's `uuid5(namespace, h3)` (docs/data-contract.md). */
  id: string;
  /** The H3 cell the boundary was built from (`h3`, resolution 8). */
  h3: string;
  /** The ground's own name, e.g. “Laajavuori 1”. */
  name: string;
  /** 0–100 for the species this list was asked about. */
  score: number;
  confidence: ZoneConfidence;
  ripeness: ZoneRipeness;
  /** Every species the payload scored, keyed the app's own way. */
  scores: Readonly<Partial<Record<Species, ZoneScore>>>;
  /** Exterior ring, closed: the last point repeats the first. */
  ring: readonly ZonePoint[];
};

export type ZoneQuery = {
  /** Which berry the zone's score speaks for. */
  species: Species;
};

/**
 * What the map asks for when the picker has not chosen a berry: the species the data team's
 * stub is built for (`species: "bilberry"` on every feature). It is a stand-in, not a
 * product preference — the zone service will take the species from the screen.
 */
export const PILOT_ZONE_SPECIES: Species = 'bilberry';

/**
 * Where zones come from. A port rather than a function so a test, a fixture and one day the
 * API can each sit behind it without the map knowing which it has.
 */
export interface ZoneSource {
  list(query: ZoneQuery): Promise<readonly Zone[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** A score the map can band: an integer 0–100, with a confidence and a ripeness it knows. */
function asScore(value: unknown): ZoneScore | null {
  if (!isRecord(value)) return null;

  const { confidence, ripeness, score } = value;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) {
    return null;
  }
  if (!(ZONE_CONFIDENCE as readonly unknown[]).includes(confidence)) return null;
  if (!(ZONE_RIPENESS as readonly unknown[]).includes(ripeness)) return null;

  return {
    score,
    confidence: confidence as ZoneConfidence,
    ripeness: ripeness as ZoneRipeness,
  };
}

/**
 * The exterior ring, closed and validated: at least three vertices, finite coordinates
 * within the world, and — because the contract says the closing vertex is optional — the
 * first point appended when the file did not repeat it.
 */
function asRing(geometry: unknown): readonly ZonePoint[] | null {
  if (!isRecord(geometry) || geometry.type !== 'Polygon') return null;
  if (!Array.isArray(geometry.coordinates)) return null;

  const exterior = geometry.coordinates[0];
  if (!Array.isArray(exterior) || exterior.length < 3) return null;

  const ring: ZonePoint[] = [];
  for (const vertex of exterior) {
    if (!Array.isArray(vertex) || vertex.length < 2) return null;

    const [longitude, latitude] = vertex as [unknown, unknown];
    if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    if (longitude < -180 || longitude > 180) return null;
    if (latitude < -90 || latitude > 90) return null;

    ring.push([longitude, latitude]);
  }

  const [firstLon, firstLat] = ring[0]!;
  const [lastLon, lastLat] = ring[ring.length - 1]!;
  if (firstLon !== lastLon || firstLat !== lastLat) ring.push([firstLon, firstLat]);

  return ring;
}

function asScores(properties: Record<string, unknown>): Partial<Record<Species, ZoneScore>> {
  const raw = properties.scores;
  if (!isRecord(raw)) return {};

  const scores: Partial<Record<Species, ZoneScore>> = {};
  // Only the app's own vocabulary survives: a species key the chips cannot name is not a
  // score this map can ask for.
  for (const species of SPECIES) {
    const parsed = asScore(raw[species]);
    if (parsed) scores[species] = parsed;
  }

  return scores;
}

function parseFeature(value: unknown, species: Species): Zone | null {
  if (!isRecord(value) || value.type !== 'Feature' || !isRecord(value.properties)) return null;

  const id = asText(value.id);
  const name = asText(value.properties.name);
  const ring = asRing(value.geometry);
  if (!id || !name || !ring) return null;

  const scores = asScores(value.properties);
  // A payload that shipped `scores` is answered from `scores` alone: falling back to the
  // top-level score there would paint the file's default berry under another berry's name.
  // The top-level score is the fallback only for a payload with no `scores` map at all.
  const score = isRecord(value.properties.scores) ? scores[species] : asScore(value.properties);
  if (!score) return null;

  return {
    id,
    h3: typeof value.properties.h3 === 'string' ? value.properties.h3 : '',
    name,
    score: score.score,
    confidence: score.confidence,
    ripeness: score.ripeness,
    scores,
    ring,
  };
}

export function parseZones(payload: unknown, species: Species): readonly Zone[] {
  if (!isRecord(payload) || payload.type !== 'FeatureCollection') return [];
  if (!Array.isArray(payload.features)) return [];

  const zones: Zone[] = [];
  for (const feature of payload.features) {
    const zone = parseFeature(feature, species);
    if (zone) zones.push(zone);
  }

  return zones;
}

/**
 * The same zones as the GeoJSON MapLibre draws. Each feature carries the band's own
 * lower edge (`band`) and the faded treatment as a boolean, so the style is one `match`
 * expression rather than a layer per band.
 */
export function zoneFeatureCollection(
  zones: readonly Zone[],
): FeatureCollection<
  Polygon,
  { band: number; lowConfidence: boolean; name: string; score: number }
> {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature',
      id: zone.id,
      geometry: { type: 'Polygon', coordinates: [zone.ring.map(([lon, lat]) => [lon, lat])] },
      properties: {
        band: scoreBand(zone.score).min,
        lowConfidence: zone.confidence === 'low',
        name: zone.name,
        score: zone.score,
      },
    })),
  };
}
