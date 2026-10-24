import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, dehydrate } from '@tanstack/react-query';

import type { Species } from '../../domain/species';
import type { Zone } from '../../domain/zone-source';
import {
  ZONES_QUERY_CACHE_BUSTER,
  ZONES_QUERY_CACHE_KEY,
  zonesQueryCachePersistence,
  zonesQueryCachePolicy,
} from '../zone-cache';

/**
 * The zone cache's rules: which reads the app keeps across launches, and what may come back.
 *
 * Two things are being held here. **Which queries**: only `['zones', species]` for a berry the
 * app knows — a stored key naming a species the domain does not have would hydrate a query
 * nothing reads, or worse, a berry the map could paint. **What data**: the stored list goes
 * through the same zod schema as a live response, so a cache written by an older build (or a
 * hand-edited one) is no zones at all rather than a polygon the map cannot draw (ADR-036 §1.2).
 */

const ZONE: Zone = {
  id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  h3: '8811250e25fffff',
  name: 'Laajavuori 1',
  score: 53,
  confidence: 'medium',
  ripeness: 'past',
  scores: {},
  ring: [
    [25.689711, 62.25623],
    [25.69564, 62.253184],
    [25.703822, 62.254551],
    [25.689711, 62.25623],
  ],
  updatedAt: '2026-08-03T07:02:00+03:00',
};

function fixtureClient(): QueryClient {
  // No eviction timer: the data is a fixture, and a test process should not wait one out.
  return new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
}

async function storeZones(species: Species, zones: unknown): Promise<void> {
  const source = fixtureClient();
  source.setQueryData(['zones', species], zones);

  await zonesQueryCachePersistence.persister.persistClient({
    buster: ZONES_QUERY_CACHE_BUSTER,
    timestamp: Date.now(),
    clientState: dehydrate(source),
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the zone cache’s policy', () => {
  it('claims a zone query for a berry the app knows, and nothing else', () => {
    expect(zonesQueryCachePolicy.matches(['zones', 'bilberry'])).toBe(true);
    expect(zonesQueryCachePolicy.matches(['zones', 'crowberry'])).toBe(true);

    expect(zonesQueryCachePolicy.matches(['zones'])).toBe(false);
    expect(zonesQueryCachePolicy.matches(['zones', 'strawberry'])).toBe(false);
    expect(zonesQueryCachePolicy.matches(['reports', 'bilberry'])).toBe(false);
  });

  it('refuses a stored zone the map could not draw', () => {
    expect(zonesQueryCachePolicy.parse([{ ...ZONE, score: 130 }])).toBeNull();
    expect(zonesQueryCachePolicy.parse({ zones: [ZONE] })).toBeNull();
  });

  it('reads a stored list through the same schema as a live response', () => {
    const parsed = zonesQueryCachePolicy.parse([{ ...ZONE, stub: true }]);

    expect(parsed).toEqual([ZONE]);
  });
});

describe('the zone cache', () => {
  it('restores the zones the device last read for that berry', async () => {
    await storeZones('bilberry', [ZONE]);

    const restored = await zonesQueryCachePersistence.persister.restoreClient();

    expect(restored?.clientState.queries.map((query) => query.queryKey)).toEqual([
      ['zones', 'bilberry'],
    ]);
    expect(restored?.clientState.queries[0]?.state.data).toEqual([ZONE]);
  });

  it('discards, and clears, a stored list one of whose zones is broken', async () => {
    await storeZones('bilberry', [{ ...ZONE, score: 130 }]);

    await expect(zonesQueryCachePersistence.persister.restoreClient()).resolves.toBeUndefined();
    await expect(AsyncStorage.getItem(ZONES_QUERY_CACHE_KEY)).resolves.toBeNull();
  });

  it('keeps one answer per berry, so a chip switch is already on the device', async () => {
    const source = fixtureClient();
    source.setQueryData(['zones', 'bilberry'], [ZONE]);
    source.setQueryData(['zones', 'cloudberry'], [{ ...ZONE, id: 'cloudberry-zone' }]);

    await zonesQueryCachePersistence.persister.persistClient({
      buster: ZONES_QUERY_CACHE_BUSTER,
      timestamp: Date.now(),
      clientState: dehydrate(source),
    });

    const restored = await zonesQueryCachePersistence.persister.restoreClient();

    expect(restored?.clientState.queries.map((query) => query.queryKey)).toEqual(
      expect.arrayContaining([
        ['zones', 'bilberry'],
        ['zones', 'cloudberry'],
      ]),
    );
  });
});
