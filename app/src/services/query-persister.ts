import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PersistQueryClientOptions,
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';

/**
 * A query cache that survives the app's process, for the reads worth opening with.
 *
 * ADR-051 and the team's plan ask for exactly this — reads go through TanStack Query **with a
 * persisted cache** — and the team's own offline section says why: after one online session the
 * map has to show the last scores where there is no signal (`docs/plans/team-mvp-plan.md` §2.4).
 * A cache that dies with the process cannot do that, however good the screen is at holding on
 * to it while the app runs.
 *
 * **The policy belongs to the feature whose data it is.** This module moves bytes; a caller
 * supplies the storage key, how old a cache may be, a `buster` for meaning changes, which query
 * keys it claims, and how the stored data is read back. That split is deliberate: the shared
 * layer must not import a feature (ARCHITECTURE §3.1), and validating a zone list is the zone
 * feature's rule, not storage's.
 *
 * Three rules the restore keeps, all of them the app's reading of a boundary it cannot trust:
 *
 * - **A stored value is data from outside the app.** It is parsed, never executed, and a blob
 *   the app cannot understand is *no cache*, not an error a screen has to handle before it can
 *   draw. The same rule the consent and saved-zone readers follow (ADR-020, ADR-024).
 * - **Only the queries the policy claims and that hold an answer are kept.** A cache cannot
 *   resurrect a pending or failed read as if it had answered, but a refresh that failed over
 *   an answer the app already had leaves that answer standing — dropping it would erase the
 *   map on the one launch that could not replace it. A stored failure is therefore restored
 *   as the data it still held; the next mount revalidates.
 * - **The policy re-reads each query's data.** A zone list from an older build, or one edited
 *   on a rooted device, is the same untrusted input a live response is (SECURITY.md §4), and a
 *   value the policy refuses is dropped entry by entry — the rest of the cache still restores.
 *
 * Nothing user-authored or personal belongs behind this: a cache is disposable by definition,
 * which is why unreadable entries are cleared rather than repaired. Credentials are not a
 * cache and never live in `AsyncStorage` (ADR-006).
 */

/** Where a cache is kept: the three `AsyncStorage` calls this module needs, and nothing else. */
type CacheStorage = Pick<typeof AsyncStorage, 'getItem' | 'removeItem' | 'setItem'>;

/**
 * What a feature decides about its cache.
 *
 * `parse` is the boundary: it returns the data to hydrate, or `null` when the stored value is
 * not something the app can use. It must not throw — a cache is optional, and a reader that
 * throws would turn “this entry is unreadable” into “the app could not start”.
 */
export type QueryCachePolicy = {
  /** Versioned like the app's other records: a shape change gets a new key. */
  storageKey: string;
  /** How old a stored cache may be before it is discarded instead of restored, in ms. */
  maxAge: number;
  /** Bumped when an old cache would still parse but now mean something else. */
  buster: string;
  /** Whether a query belongs to this cache. Anything else is neither saved nor restored. */
  matches: (queryKey: readonly unknown[]) => boolean;
  /**
   * The data a stored query may hydrate, or `null` to drop that entry. Called on the way in
   * **and** on the way out, so a value the app cannot read is never written either.
   */
  parse: (data: unknown) => unknown | null;
};

/** The part of `PersistQueryClientProvider`'s options a policy decides. */
export type QueryCachePersistence = Pick<
  PersistQueryClientOptions,
  'buster' | 'dehydrateOptions' | 'maxAge' | 'persister'
>;

type DehydratedQuery = PersistedClient['clientState']['queries'][number];
type DehydratedQueryState = DehydratedQuery['state'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a stored cache strictly, keeping only the entries the policy claims and can re-read.
 *
 * Returns `undefined` when the whole value is unreadable or nothing in it survives — which the
 * caller treats as “there was no cache”. Nothing surviving is also the state after a first read
 * that failed, or after every stored entry failed the policy; either way there is nothing to
 * open with, so the next launch starts from a read like the first one did.
 */
export function readPersistedClient(
  raw: string,
  policy: QueryCachePolicy,
): PersistedClient | undefined {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed)) {
    return undefined;
  }

  const { buster, clientState, timestamp } = parsed;

  if (typeof buster !== 'string' || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return undefined;
  }

  if (!isRecord(clientState) || !Array.isArray(clientState.queries)) {
    return undefined;
  }

  const queries: DehydratedQuery[] = [];

  for (const query of clientState.queries) {
    if (!isRecord(query) || !Array.isArray(query.queryKey) || !isRecord(query.state)) {
      continue;
    }

    if (!policy.matches(query.queryKey)) {
      continue;
    }

    const data = policy.parse(query.state.data);

    if (data === null) {
      continue;
    }

    // The stored value was just checked field by field; `JSON.parse` hands back `unknown`, so
    // the cast has to go through it rather than pretend the object is already a query.
    const restored = { ...(query as unknown as DehydratedQuery) };

    // A promise serialized to JSON is an object, not a promise; `hydrate` would call `.then` on
    // it. Nothing with data is pending, but a hand-edited blob is not owed the benefit of doubt.
    delete restored.promise;

    queries.push({
      ...restored,
      // A failure is not part of the cache: the answer is. Hydrating an `error` status would
      // restore a rejection the app can only re-trigger, and its `Error` did not survive JSON.
      state: {
        ...(query.state as unknown as DehydratedQueryState),
        data,
        error: null,
        fetchFailureReason: null,
        fetchStatus: 'idle',
        status: 'success',
      },
    });
  }

  if (queries.length === 0) {
    return undefined;
  }

  return {
    buster,
    timestamp,
    // Writes are not cached: the app has no mutation that could be replayed this way, and an
    // outbox is a user's record with its own rules (ADR-005), not a cache entry.
    clientState: { mutations: [], queries },
  };
}

/**
 * Builds the options `PersistQueryClientProvider` needs from one policy.
 *
 * A failed write rejects: the device refusing to keep something is worth knowing, and the
 * library's own provider reports it. A failed **read** does not — see `restoreClient` — because
 * there is nothing the picker could do about a cache that was not needed to draw.
 */
export function createQueryCachePersistence(
  policy: QueryCachePolicy,
  storage: CacheStorage = AsyncStorage,
): QueryCachePersistence {
  const persister: Persister = {
    persistClient: async (client) => {
      await storage.setItem(policy.storageKey, JSON.stringify(client));
    },
    restoreClient: async () => {
      let raw: string | null;

      try {
        raw = await storage.getItem(policy.storageKey);
      } catch {
        // The one swallowed error here, deliberately: a cache is disposable, and the app can
        // open without one. A rejected read is “no cache”, never a launch failure.
        return undefined;
      }

      if (raw === null) {
        return undefined;
      }

      const restored = readPersistedClient(raw, policy);

      if (restored === undefined) {
        // Left behind, an unreadable blob would be re-read on every launch and mean nothing.
        // Clearing it is the only state the app can describe: this device has no usable cache.
        await storage.removeItem(policy.storageKey).catch(() => undefined);
      }

      return restored;
    },
    removeClient: async () => {
      await storage.removeItem(policy.storageKey);
    },
  };

  return {
    persister,
    maxAge: policy.maxAge,
    buster: policy.buster,
    dehydrateOptions: {
      shouldDehydrateMutation: () => false,
      // Data, not status: a query whose refresh failed still holds the answer it had, and that
      // answer is what the next launch needs (`data` is `undefined` when nothing was read).
      shouldDehydrateQuery: (query) =>
        query.state.data !== undefined &&
        policy.matches(query.queryKey) &&
        policy.parse(query.state.data) !== null,
    },
  };
}
