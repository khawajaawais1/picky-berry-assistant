import type { QueryClient } from '@tanstack/react-query';

import type { ApiClient } from '@/services/api';

import { SPECIES, type Species } from '../domain/species';
import { parseZones, type Zone } from '../domain/zone-source';
import { PILOT_BBOX, ZoneSourceError } from './api-zone-source';
import { zonesQueryKey } from './zone-cache';

/**
 * The offline snapshot (ADR-065, the API integration plan's phase 6).
 *
 * `GET /zones/snapshot` answers every zone in the pilot area with every berry's score. The app
 * writes each berry's answer into the zone cache under the key the map reads (`zonesQueryKey`),
 * and the cache's own persistence (`zone-cache.ts`) keeps it on the device. So the map opens
 * offline for every chip, through the same validated path a live read takes, and nothing new is
 * stored.
 *
 * With `since`, the server answers only the zones whose scores changed after that instant, and
 * the app merges them into what the cache holds, by zone id.
 */
export type ZoneSnapshot = {
  generatedAt: string;
  incremental: boolean;
  zones: Readonly<Record<Species, readonly Zone[]>>;
};

export type ZoneSnapshotSource = {
  download(since?: string): Promise<ZoneSnapshot>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The snapshot document, if it is one: a feature collection with its generation instant. */
function snapshotDocument(
  body: unknown,
): { collection: Record<string, unknown>; generatedAt: string } | null {
  if (!isRecord(body) || body.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
    return null;
  }
  if (!isRecord(body.meta) || typeof body.meta.generated_at !== 'string') return null;
  if (Number.isNaN(Date.parse(body.meta.generated_at))) return null;

  return { collection: body, generatedAt: body.meta.generated_at };
}

export function createZoneSnapshotSource({ client }: { client: ApiClient }): ZoneSnapshotSource {
  return {
    async download(since) {
      const result = await client.request({
        method: 'GET',
        path: '/zones/snapshot',
        query: { bbox: PILOT_BBOX.join(','), since },
        parse: snapshotDocument,
      });

      if (!result.ok) throw new ZoneSourceError(result.error);

      const zones = Object.fromEntries(
        SPECIES.map((species) => [species, parseZones(result.data.collection, species)]),
      ) as Record<Species, readonly Zone[]>;

      return { generatedAt: result.data.generatedAt, incremental: since !== undefined, zones };
    },
  };
}

/** Writes a snapshot into the zone cache, merging an incremental one into what is there. */
export function applyZoneSnapshot(queryClient: QueryClient, snapshot: ZoneSnapshot): void {
  for (const species of SPECIES) {
    const incoming = snapshot.zones[species];

    if (!snapshot.incremental) {
      queryClient.setQueryData(zonesQueryKey(species), incoming);
      continue;
    }

    const held = queryClient.getQueryData<readonly Zone[]>(zonesQueryKey(species));
    // A delta is only changes: without a full answer to merge into it would be a partial map.
    if (held === undefined || incoming.length === 0) continue;

    const byId = new Map(held.map((zone) => [zone.id, zone]));
    for (const zone of incoming) byId.set(zone.id, zone);
    queryClient.setQueryData(zonesQueryKey(species), [...byId.values()]);
  }
}
