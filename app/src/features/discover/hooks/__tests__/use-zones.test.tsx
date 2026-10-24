import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/services/query-client';

import type { Species } from '../../domain/species';
import type { Zone, ZoneSource } from '../../domain/zone-source';
import { ZONES_QUERY_CACHE_BUSTER, zonesQueryCachePersistence } from '../../services/zone-cache';
import { useZones, useZoneAnswers } from '../use-zones';

/**
 * The hook that puts the `ZoneSource` port behind the map's states.
 *
 * The cases that matter are the ones a device produces and a happy-path test does not: a
 * source that fails (the map must say so, not draw an empty world), a species the picker
 * changes while the first answer is still in flight (a slow answer for the old berry must
 * not repaint the map for the new one), and the first render, which is a load rather than a
 * map with nothing on it.
 */

const UPDATED_AT = '2026-08-03T07:02:00+03:00';

const zone = (id: string, score: number, updatedAt: string | null = UPDATED_AT): Zone => ({
  id,
  h3: `h3-${id}`,
  name: `Laajavuori ${id}`,
  score,
  confidence: 'medium',
  ripeness: 'ripe',
  scores: {},
  ring: [
    [25.68, 62.25],
    [25.69, 62.25],
    [25.69, 62.26],
    [25.68, 62.25],
  ],
  updatedAt,
});

function sourceThat(answer: (species: Species) => Promise<readonly Zone[]>): ZoneSource {
  return { list: ({ species }) => answer(species) };
}

/** The composition the app root mounts: one client, with the zone cache behind it. */
function CachedProvider({ children }: { children: ReactNode }) {
  return <QueryProvider persistOptions={zonesQueryCachePersistence}>{children}</QueryProvider>;
}

/** A previous launch's answer, written the way the provider writes it. */
async function storeZones(species: Species, zones: readonly Zone[]): Promise<void> {
  // No eviction timer: the data is a fixture, and a test process should not wait one out.
  const source = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
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

describe('useZones', () => {
  it('loads the zones and says when they are ready', async () => {
    // A source that answers later than the first paint, which is every real one: the screen
    // must be able to say it is loading rather than draw an empty world.
    let answer: (zones: readonly Zone[]) => void = () => undefined;
    const source: ZoneSource = {
      list: () => new Promise<readonly Zone[]>((resolve) => (answer = resolve)),
    };

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    expect(result.current.status).toBe('loading');

    await act(async () => answer([zone('a', 50)]));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones.map((entry) => entry.id)).toEqual(['a']);
  });

  it('states the oldest timestamp the answer carries, not the one just read', async () => {
    const source = sourceThat(async () => [
      zone('fresh', 10, '2026-09-01T07:00:00+03:00'),
      zone('stale', 20, '2026-08-03T07:02:00+03:00'),
    ]);

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    // The label describes the whole answer, so it may only be as fresh as its least-fresh zone.
    expect(result.current.updatedAt).toBe('2026-08-03T07:02:00+03:00');
  });

  it('states no freshness when any zone in the answer has no timestamp', async () => {
    const source = sourceThat(async () => [zone('dated', 10), zone('undated', 20, null)]);

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    // Ignoring the undated zone would make the line claim a freshness the answer does not have.
    expect(result.current.updatedAt).toBeNull();
  });

  it('asks again when the species changes, and shows the new answer only', async () => {
    const source = sourceThat(async (species) => [zone(species, 10)]);

    const { result, rerender } = await renderHook(
      ({ species }: { species: Species }) => useZones(source, species),
      { initialProps: { species: 'bilberry' as Species }, wrapper: QueryProvider },
    );

    await waitFor(() => expect(result.current.zones[0]?.id).toBe('bilberry'));

    await rerender({ species: 'cloudberry' });

    await waitFor(() => expect(result.current.zones[0]?.id).toBe('cloudberry'));
  });

  it('does not repaint with the answer to a query the screen has already moved past', async () => {
    // A slow bilberry request that resolves after the cloudberry one is the race a real
    // network produces. Without the stale guard the map would end up showing the wrong
    // berry's scores under the chip the picker is actually pressing.
    let resolveBilberry: (zones: readonly Zone[]) => void = () => undefined;
    const slowBilberry = new Promise<readonly Zone[]>((resolve) => {
      resolveBilberry = resolve;
    });
    const source: ZoneSource = {
      list: ({ species }) =>
        species === 'bilberry' ? slowBilberry : Promise.resolve([zone('c', 5)]),
    };

    const { result, rerender } = await renderHook(
      ({ species }: { species: Species }) => useZones(source, species),
      { initialProps: { species: 'bilberry' as Species }, wrapper: QueryProvider },
    );

    await rerender({ species: 'cloudberry' });
    await waitFor(() => expect(result.current.zones[0]?.id).toBe('c'));

    resolveBilberry([zone('b', 99)]);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones[0]?.id).toBe('c');
  });

  it('reports a source that failed instead of an empty map with no explanation', async () => {
    const source = sourceThat(async () => {
      throw new Error('no docs');
    });

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.zones).toEqual([]);
  });

  it('never hands the map a zone it could not draw', async () => {
    // The port's response is validated again, because a future adapter will hand the hook
    // JSON it did not parse itself. A score the map cannot band is no zones at all, rather
    // than a polygon painted in a colour that means nothing (ADR-036 §1.2).
    const malformed = { ...zone('a', 50), score: 130 };
    const source = sourceThat(async () => [malformed as unknown as Zone]);

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones).toEqual([]);
  });

  it('opens with the last zones the device read, before the source answers', async () => {
    // The point of the persisted cache: a picker who opens the app where there is no signal
    // sees the map they left, not a loading line that never resolves (team plan §2.4).
    await storeZones('bilberry', [zone('cached', 50)]);
    const source = sourceThat(() => new Promise<readonly Zone[]>(() => undefined));

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: CachedProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones.map((entry) => entry.id)).toEqual(['cached']);
    // The freshness travels with the data through the cache: reopening prints the age of the
    // answer the device holds, not the moment it reopened.
    expect(result.current.updatedAt).toBe(UPDATED_AT);
  });

  it('keeps the last zones when the refresh behind them fails', async () => {
    // A revalidation that fails is not an empty world. The stored answer is the last one the
    // app read, and blanking it would turn “the phone could not reach the source” into “there
    // are no berries here” — the failure known issue 14 was about.
    await storeZones('bilberry', [zone('cached', 50)]);
    let reject: (error: Error) => void = () => undefined;
    let asked = 0;
    const source: ZoneSource = {
      list: () => {
        asked += 1;
        return new Promise<readonly Zone[]>((_resolve, rejectOnce) => {
          reject = rejectOnce;
        });
      },
    };

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: CachedProvider,
    });
    await waitFor(() => expect(asked).toBe(1));

    await act(async () => reject(new Error('offline')));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones.map((entry) => entry.id)).toEqual(['cached']);

    // And the next launch must still open with them: a refresh that failed may not erase the
    // answer it could not replace.
    await waitFor(async () => {
      const restored = await zonesQueryCachePersistence.persister.restoreClient();
      expect(restored?.clientState.queries[0]?.state.data).toEqual([zone('cached', 50)]);
    });
  });

  it('keeps what it read on the device, so the next launch can open with it', async () => {
    const source = sourceThat(async () => [zone('stored', 61)]);

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: CachedProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(async () => {
      const restored = await zonesQueryCachePersistence.persister.restoreClient();
      expect(restored?.clientState.queries[0]?.state.data).toEqual([zone('stored', 61)]);
    });
  });
});

describe('useZoneAnswers', () => {
  it('reads one answer per berry the plan holds, once each, in its order', async () => {
    const asked: Species[] = [];
    const source = sourceThat(async (species) => {
      asked.push(species);
      return [zone(species, 10)];
    });

    const { result } = await renderHook(
      () => useZoneAnswers(source, ['lingonberry', 'bilberry', 'lingonberry']),
      { wrapper: QueryProvider },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(asked).toEqual(['lingonberry', 'bilberry']);
    expect(result.current.zones.get('lingonberry')?.map((entry) => entry.id)).toEqual([
      'lingonberry',
    ]);
    expect(result.current.zones.get('bilberry')?.map((entry) => entry.id)).toEqual(['bilberry']);
  });

  it('is not ready until every berry the plan needs has answered', async () => {
    let answer: (zones: readonly Zone[]) => void = () => undefined;
    const source: ZoneSource = {
      list: ({ species }) =>
        species === 'bilberry'
          ? Promise.resolve([zone('b', 5)])
          : new Promise<readonly Zone[]>((resolve) => (answer = resolve)),
    };

    const { result } = await renderHook(() => useZoneAnswers(source, ['bilberry', 'lingonberry']), {
      wrapper: QueryProvider,
    });

    // One answer is not the whole plan: a row for the pending berry would be a false conclusion.
    await waitFor(() => expect(result.current.zones.size).toBe(1));
    expect(result.current.status).toBe('loading');

    await act(async () => answer([zone('l', 10)]));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones.get('lingonberry')?.map((entry) => entry.id)).toEqual(['l']);
  });

  it('reports a failed berry and still hands over the ones that answered', async () => {
    const source: ZoneSource = {
      list: ({ species }) =>
        species === 'lingonberry'
          ? Promise.reject(new Error('no docs'))
          : Promise.resolve([zone('b', 5)]),
    };

    const { result } = await renderHook(() => useZoneAnswers(source, ['bilberry', 'lingonberry']), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.zones.get('bilberry')?.map((entry) => entry.id)).toEqual(['b']);
    expect(result.current.zones.has('lingonberry')).toBe(false);
  });

  it('asks for nothing when the plan holds nothing', async () => {
    const list = jest.fn(async () => [zone('a', 50)]);

    const { result } = await renderHook(() => useZoneAnswers({ list }, []), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(list).not.toHaveBeenCalled();
    expect(result.current.zones.size).toBe(0);
  });
});
