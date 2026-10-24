import { z } from 'zod';

import { SPECIES } from './species';
import { ZONE_CONFIDENCE, ZONE_RIPENESS, type Zone, type ZonePoint } from './zone-source';

/**
 * The zod schema for **the `ZoneSource` port's response** — the zones an adapter hands the
 * app, not the GeoJSON document it may have read them from.
 *
 * There are two boundaries here on purpose. `parseZones` (ADR-036 §1, `zone-source.ts`) reads
 * the published feature collection: it drops a feature it cannot understand and keeps the
 * rest. This schema reads the list of zones that leaves the adapter, where the type already
 * promises a {@link Zone}: a score outside 0–100, a confidence the map has no colour for, or
 * a ring that does not close is a broken adapter, and the failure direction is §1.2's —
 * **no zones at all**, never the zones the app could half-understand.
 *
 * It is written as zod rather than as more guards because a future `GET /zones` adapter will
 * return JSON no parser has touched, and this is the one description of what that JSON must
 * look like. Unknown keys are stripped by `z.object`: nothing the contract did not promise
 * reaches a component.
 */

const zoneScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.enum(ZONE_CONFIDENCE),
  ripeness: z.enum(ZONE_RIPENESS),
});

/** `[longitude, latitude]` in GeoJSON's order, bounded to the world. */
const zonePointSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

/** The exterior ring the map can draw: at least a closed triangle. */
function closesOnFirstPoint(ring: readonly ZonePoint[]): boolean {
  const first = ring[0];
  const last = ring[ring.length - 1];

  return first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
}

const zoneRingSchema = z
  .array(zonePointSchema)
  .min(4)
  .refine(closesOnFirstPoint, { message: 'The ring must close on its first vertex.' });

const zoneSchema: z.ZodType<Zone> = z.object({
  id: z.string().trim().min(1),
  h3: z.string(),
  name: z.string().trim().min(1),
  score: z.number().int().min(0).max(100),
  confidence: z.enum(ZONE_CONFIDENCE),
  ripeness: z.enum(ZONE_RIPENESS),
  // A zone carries one score per berry it was reported for, so a missing berry is expected
  // and an unknown one is not: `partialRecord` accepts the first and refuses the second.
  scores: z.partialRecord(z.enum(SPECIES), zoneScoreSchema),
  ring: zoneRingSchema,
});

/**
 * The zones an adapter returned, or none if the response is not the shape the port promises.
 * Never a partial list: a map missing one of the zones the source sent lies by omission.
 */
export function parseZoneList(value: unknown): readonly Zone[] {
  const result = z.array(zoneSchema).safeParse(value);

  return result.success ? result.data : [];
}
