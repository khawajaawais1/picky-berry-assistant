import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, dehydrate } from '@tanstack/react-query';

import { createQueryCachePersistence, type QueryCachePolicy } from '../query-persister';

/**
 * The cache a read can survive the app's process in.
 *
 * What this holds: the policy decides **which** queries are written and **what data** may be
 * hydrated back — anything else in the blob is dropped, never handed to a screen. A cache the
 * app cannot read is no cache, and leaving it behind would only make the next restore guess
 * again.
 *
 * The policy here is deliberately not a feature's: the persister is shared, so its test uses
 * a stand-in rule and the zone cache's own test proves the real one (ADR-051: reads go through
 * TanStack Query; the zone cache is `features/discover/services/zone-cache.ts`).
 */

const KEY = 'picky.test-query-cache.v1';

const policy: QueryCachePolicy = {
  storageKey: KEY,
  maxAge: 60 * 60 * 1000,
  buster: 'test-v1',
  matches: (queryKey) => queryKey[0] === 'zones',
  parse: (data) => (Array.isArray(data) ? data : null),
};

const persistence = createQueryCachePersistence(policy);

function clientWith(entries: ReadonlyArray<readonly [readonly unknown[], unknown]>): QueryClient {
  // No eviction timer: the data is a fixture, and a test process should not wait one out.
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

  for (const [queryKey, data] of entries) {
    client.setQueryData(queryKey, data);
  }

  return client;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('createQueryCachePersistence', () => {
  it('dehydrates only the queries its policy claims and holds an answer for', () => {
    const client = clientWith([
      [['zones', 'bilberry'], [{ id: 'a' }]],
      [['reports', 'bilberry'], [{ id: 'r' }]],
    ]);
    const failed = client.getQueryCache().build(client, { queryKey: ['zones', 'cloudberry'] });
    failed.setState({ error: new Error('offline'), status: 'error' });

    const state = dehydrate(client, persistence.dehydrateOptions);

    expect(state.queries.map((query) => query.queryKey)).toEqual([['zones', 'bilberry']]);
    // A read is cached; a write is not. There is no outbox behind this cache (ADR-005).
    expect(state.mutations).toEqual([]);
  });

  it('keeps an answer whose refresh failed after it was read', () => {
    // The offline case the cache exists for: the answer is still the last thing the app knew,
    // even though the revalidation on top of it failed. Dropping it here would erase the map
    // on the very launch that needed it.
    const client = clientWith([[['zones', 'bilberry'], [{ id: 'a' }]]]);
    client
      .getQueryCache()
      .find({ queryKey: ['zones', 'bilberry'] })
      ?.setState({ error: new Error('offline'), status: 'error' });

    const state = dehydrate(client, persistence.dehydrateOptions);

    expect(state.queries.map((query) => query.queryKey)).toEqual([['zones', 'bilberry']]);
    expect(state.queries[0]?.state.data).toEqual([{ id: 'a' }]);
  });

  it('restores a failed refresh as the answer it still held', async () => {
    const client = clientWith([[['zones', 'bilberry'], [{ id: 'a' }]]]);
    client
      .getQueryCache()
      .find({ queryKey: ['zones', 'bilberry'] })
      ?.setState({ error: new Error('offline'), status: 'error' });

    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        buster: policy.buster,
        timestamp: Date.now(),
        clientState: dehydrate(client, persistence.dehydrateOptions),
      }),
    );

    const restored = await persistence.persister.restoreClient();
    const state = restored?.clientState.queries[0]?.state;

    // A failure is not part of the cached answer: the cache holds data, and the next mount
    // revalidates. Hydrating an `error` status would restore a rejection the app can only
    // re-trigger, and its `Error` did not survive JSON anyway.
    expect(state?.data).toEqual([{ id: 'a' }]);
    expect(state?.status).toBe('success');
    expect(state?.error).toBeNull();
  });

  it('writes the client to its key and reads the same zones back', async () => {
    const zones = [{ id: 'a' }];
    const clientState = dehydrate(clientWith([[['zones', 'bilberry'], zones]]));

    await persistence.persister.persistClient({
      buster: policy.buster,
      timestamp: Date.now(),
      clientState,
    });

    const restored = await persistence.persister.restoreClient();

    expect(restored?.clientState.queries.map((query) => query.state.data)).toEqual([zones]);
  });

  it('reads nothing from a value it cannot parse, and clears it', async () => {
    await AsyncStorage.setItem(KEY, 'not json');

    await expect(persistence.persister.restoreClient()).resolves.toBeUndefined();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('keeps a readable query and drops one whose data the policy refuses', async () => {
    const clientState = dehydrate(
      clientWith([
        [['zones', 'bilberry'], [{ id: 'a' }]],
        [['zones', 'cloudberry'], 'not a list'],
      ]),
    );

    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ buster: policy.buster, timestamp: Date.now(), clientState }),
    );

    const restored = await persistence.persister.restoreClient();

    expect(restored?.clientState.queries.map((query) => query.queryKey)).toEqual([
      ['zones', 'bilberry'],
    ]);
  });

  it('drops a query its policy does not claim', async () => {
    const clientState = dehydrate(
      clientWith([
        [['zones', 'bilberry'], [{ id: 'a' }]],
        [['reports', 'bilberry'], [{ id: 'r' }]],
      ]),
    );

    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ buster: policy.buster, timestamp: Date.now(), clientState }),
    );

    const restored = await persistence.persister.restoreClient();

    expect(restored?.clientState.queries.map((query) => query.queryKey)).toEqual([
      ['zones', 'bilberry'],
    ]);
  });

  it('reads nothing from a blob with no save time', async () => {
    const clientState = dehydrate(clientWith([[['zones', 'bilberry'], [{ id: 'a' }]]]));

    await AsyncStorage.setItem(KEY, JSON.stringify({ buster: policy.buster, clientState }));

    await expect(persistence.persister.restoreClient()).resolves.toBeUndefined();
  });

  it('opens with an empty cache when the device will not answer', async () => {
    // The cache is disposable; the app is not. A failed read is no cache, never an error a
    // screen has to handle before it can draw.
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage refused'));

    await expect(persistence.persister.restoreClient()).resolves.toBeUndefined();
  });

  it('reports a write the device refused', async () => {
    const clientState = dehydrate(clientWith([[['zones', 'bilberry'], [{ id: 'a' }]]]));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await expect(
      persistence.persister.persistClient({
        buster: policy.buster,
        timestamp: Date.now(),
        clientState,
      }),
    ).rejects.toThrow('storage is full');
  });

  it('hands the policy’s key and limits to the provider, and clears on request', async () => {
    expect(persistence.maxAge).toBe(policy.maxAge);
    expect(persistence.buster).toBe(policy.buster);

    await AsyncStorage.setItem(KEY, 'anything');
    await persistence.persister.removeClient();

    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });
});
