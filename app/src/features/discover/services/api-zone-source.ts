import type { ApiClient, ApiFailure } from '@/services/api';

import { parseZones, type Zone, type ZoneSource } from '../domain/zone-source';

/**
 * The `ZoneSource` adapter for the team API's `GET /zones` (ADR-065, the API integration plan's
 * phase 2). It asks for one berry's scores over the pilot area and hands the answer to
 * `parseZones`, the same boundary the stub goes through.
 *
 * - **The pilot area** is a fixed bounding box around Jyväskylä that covers the data team's
 *   Laajavuori zones. The map fits itself to whatever zones it is given and does not load by
 *   viewport, so a fixed area is what the screen can use today. It stays inside the server's
 *   50 km detail-mode limit.
 * - **Detail mode only.** At zoom 12 the server answers zones. A grouped answer carries H3 parent
 *   cells, not zones, so it is refused rather than drawn as if it were zones.
 * - **A failed read rejects** with a `ZoneSourceError` naming the transport's reason. `useZones`
 *   turns a rejection into the map's error state, and a map with no polygons must never mean
 *   "failed".
 */

/** `[west, south, east, north]` in WGS84: about 21 × 22 km around Jyväskylä. */
export const PILOT_BBOX = [25.5, 62.15, 25.9, 62.35] as const;

/** At zoom 10 and above the server answers zones (detail mode). */
export const ZONE_LIST_ZOOM = 12;

export class ZoneSourceError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the zone service could not answer (${failure.kind})`);
    this.name = 'ZoneSourceError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accepts a detail-mode `ZoneCollection`, and nothing else, as the document to parse. */
function detailCollection(body: unknown): unknown {
  if (!isRecord(body) || body.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
    return null;
  }
  if (!isRecord(body.meta) || body.meta.mode !== 'detail') return null;

  return body;
}

export type ApiZoneSourceOptions = { client: ApiClient };

export function createApiZoneSource({ client }: ApiZoneSourceOptions): ZoneSource {
  return {
    async list({ species }): Promise<readonly Zone[]> {
      const result = await client.request({
        method: 'GET',
        path: '/zones',
        query: { bbox: PILOT_BBOX.join(','), species, zoom: ZONE_LIST_ZOOM },
        parse: detailCollection,
      });

      if (!result.ok) throw new ZoneSourceError(result.error);

      return parseZones(result.data, species);
    },
  };
}
