import { QueryClient } from '@tanstack/react-query';

import { createApiClient, type ApiFetch } from '@/services/api';

import type { Zone } from '../../domain/zone-source';
import { PILOT_BBOX } from '../api-zone-source';
import { zonesQueryKey } from '../zone-cache';
import { applyZoneSnapshot, createZoneSnapshotSource } from '../zone-snapshot';

/**
 * The offline snapshot (ADR-065, the plan's phase 6): `GET /zones/snapshot` over the pilot area
 * carries every berry's score per zone. Writing each berry's answer into the zone cache is what
 * lets the map open offline for every chip, through the persistence the cache already has.
 */
const BASE = 'https://api.example.test';
const RING = [
  [25.689711, 62.25623],
  [25.69564, 62.253184],
  [25.703822, 62.254551],
  [25.689711, 62.25623],
];

function snapshotFeature(id: string, name: string, bilberry: number) {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [RING] },
    properties: {
      h3: '8811250e25fffff',
      name,
      forest_type: null,
      scores: {
        bilberry: {
          score: bilberry,
          confidence: 'medium',
          ripeness: 'ripe',
          updated_at: '2026-08-03T04:00:00.000Z',
        },
      },
    },
  };
}

function collection(features: unknown[], since: string | null = null) {
  return {
    type: 'FeatureCollection',
    features,
    meta: {
      generated_at: '2026-08-03T05:00:00.000Z',
      since,
      bbox: [...PILOT_BBOX],
      count: features.length,
    },
  };
}

function sourceAnswering(body: unknown | 'offline') {
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    if (body === 'offline') throw new TypeError('Network request failed');
    return { ok: true, status: 200, json: async () => body };
  });
  const client = createApiClient({
    baseUrl: BASE,
    fetchImpl,
    tokens: { accessToken: async () => 'a1', refresh: async () => null },
  });

  return { fetchImpl, snapshots: createZoneSnapshotSource({ client }) };
}

describe('createZoneSnapshotSource', () => {
  it('downloads the pilot area in full', async () => {
    const { fetchImpl, snapshots } = sourceAnswering(collection([snapshotFeature('a', 'One', 50)]));

    const snapshot = await snapshots.download();

    expect(fetchImpl.mock.calls[0]![0]).toBe(
      `${BASE}/api/v1/zones/snapshot?bbox=${encodeURIComponent(PILOT_BBOX.join(','))}`,
    );
    expect(snapshot.generatedAt).toBe('2026-08-03T05:00:00.000Z');
    expect(snapshot.incremental).toBe(false);
    expect(snapshot.zones.bilberry.map((zone) => zone.name)).toEqual(['One']);
    expect(snapshot.zones.lingonberry).toEqual([]);
  });

  it('asks only for what changed since an earlier snapshot', async () => {
    const since = '2026-08-02T05:00:00.000Z';
    const { fetchImpl, snapshots } = sourceAnswering(collection([], since));

    const snapshot = await snapshots.download(since);

    expect(fetchImpl.mock.calls[0]![0]).toContain(`&since=${encodeURIComponent(since)}`);
    expect(snapshot.incremental).toBe(true);
  });

  it('rejects a snapshot it could not read', async () => {
    await expect(sourceAnswering({ nope: true }).snapshots.download()).rejects.toMatchObject({
      failure: { kind: 'invalid-response' },
    });
    await expect(sourceAnswering('offline').snapshots.download()).rejects.toMatchObject({
      failure: { kind: 'network' },
    });
  });
});

/** A cache with no garbage-collection timer, so a test leaves no handle open. */
function cacheClient() {
  return new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
}

describe('applyZoneSnapshot', () => {
  it('writes each berry’s answer into the zone cache', async () => {
    const queryClient = cacheClient();
    const { snapshots } = sourceAnswering(collection([snapshotFeature('a', 'One', 50)]));

    applyZoneSnapshot(queryClient, await snapshots.download());

    expect(queryClient.getQueryData<Zone[]>(zonesQueryKey('bilberry'))?.map((z) => z.id)).toEqual([
      'a',
    ]);
    expect(queryClient.getQueryData(zonesQueryKey('lingonberry'))).toEqual([]);
  });

  it('merges an incremental snapshot into what the cache holds, by zone id', async () => {
    const queryClient = cacheClient();
    const full = sourceAnswering(
      collection([snapshotFeature('a', 'One', 50), snapshotFeature('b', 'Two', 20)]),
    );
    applyZoneSnapshot(queryClient, await full.snapshots.download());

    const delta = sourceAnswering(
      collection([snapshotFeature('b', 'Two', 80), snapshotFeature('c', 'Three', 10)], 'x'),
    );
    applyZoneSnapshot(queryClient, await delta.snapshots.download('2026-08-02T05:00:00.000Z'));

    const bilberry = queryClient.getQueryData<Zone[]>(zonesQueryKey('bilberry')) ?? [];
    expect(bilberry.map((zone) => [zone.id, zone.score])).toEqual([
      ['a', 50],
      ['b', 80],
      ['c', 10],
    ]);
    // A berry the delta did not change keeps what the cache held.
    expect(queryClient.getQueryData(zonesQueryKey('lingonberry'))).toEqual([]);
  });
});
