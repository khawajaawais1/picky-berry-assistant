import { createQueryCachePersistence, type QueryCachePolicy } from '@/services/query-persister';

import { SPECIES, type Species } from '../domain/species';
import { parseZoneListStrict } from '../domain/zone-schema';

/**
 * The zones the map opens with when the app was last used somewhere with no signal.
 *
 * Screen 06 reads one `ZoneSource` per berry through TanStack Query (`use-zones.ts`, ADR-057).
 * Until now that cache died with the process: reopening the app in the forest meant the map
 * asked for zones it could not receive and had nothing to draw. The team's plan asks for the
 * opposite — after one online session the last scores still show offline
 * (`docs/plans/team-mvp-plan.md` §2.4, user story 5) — and ADR-051 records the read path as a
 * **persisted** TanStack Query cache. This is that cache for the one query the app has.
 *
 * What is kept, and what is not:
 *
 * - **the validated answer for each berry**, under its own query key, so switching back to a
 *   chip opens with the list that berry last had rather than another berry's scores;
 * - **not** the design's demo values, not any screen state, and not the report a picker typed
 *   (that is a queued record with its own rules, `services/report-queue.ts`).
 *
 * It holds **no personal data**: zone identifiers, scores, confidence, ripeness and public
 * geometry are the service's answers about forests, not about the picker. That is why it is
 * not one of the records the privacy screens enumerate (ADR-040) and why it needs no export or
 * deletion control of its own — a refresh replaces it, clearing the app's data removes it, and
 * an unreadable entry is dropped by the persister. Position is never written here.
 *
 * Two limits, both deliberate:
 *
 * - **A week (`maxAge`).** Scores are refreshed daily, so a map left unopened for a week starts
 *   from a fresh read rather than a memory of another season; a field trip is shorter than
 *   that. The stamp moves whenever the screen saves, including a launch whose refresh failed
 *   (the answer it still holds is saved with it), so the week bounds how long an *unopened* app
 *   keeps its map — not how old the scores on it are.
 * - **A buster.** The schema catches a broken zone; it cannot catch a well-formed list that
 *   now means something else (a recalibrated score, a changed ring order). Bump
 *   {@link ZONES_QUERY_CACHE_BUSTER} when that happens, and old caches are discarded whole.
 *
 * **The freshness label is the data's.** Each zone carries the source's `updated_at` when it
 * sent one (the plan's `GET /zones` contract does, §4), and the hook reduces an answer to its
 * **oldest** timestamp. Because that value is part of the zone record, the cache restores the
 * age of what it holds: reopening in the forest prints the day the scores were computed, not
 * the day the app reopened. An answer with any undated zone, or none at all, prints no line —
 * the app does not infer a freshness it cannot read. The map's own caption still says “test
 * data”, which remains true of the stub behind the port (known issue 14).
 */

/** Where the cache lives: versioned like the app's other records. */
export const ZONES_QUERY_CACHE_KEY = 'picky.zones-cache.v1';

/** Change when a cached list that still parses would now mean something different. */
export const ZONES_QUERY_CACHE_BUSTER = 'zone-source-v1';

/** Long enough for a trip without signal; a map left unopened for longer starts fresh. */
export const ZONES_QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The root of every zone query key; the berry is the part that follows it. */
const ZONES_QUERY_ROOT = 'zones';

/**
 * The one key the map's answers live under.
 *
 * The hook and the cache both build it here rather than spelling `['zones', species]` twice:
 * a cache claims exactly the keys its queries use, and two literals are how those drift.
 */
export function zonesQueryKey(species: Species): readonly ['zones', Species] {
  return [ZONES_QUERY_ROOT, species];
}

function isKnownSpecies(value: unknown): value is Species {
  return (SPECIES as readonly unknown[]).includes(value);
}

export const zonesQueryCachePolicy: QueryCachePolicy = {
  storageKey: ZONES_QUERY_CACHE_KEY,
  maxAge: ZONES_QUERY_CACHE_MAX_AGE_MS,
  buster: ZONES_QUERY_CACHE_BUSTER,
  matches: (queryKey) =>
    queryKey.length === 2 && queryKey[0] === ZONES_QUERY_ROOT && isKnownSpecies(queryKey[1]),
  // The same schema a live response crosses, not a looser one: a stored list is external
  // input too, and one unreadable zone makes the whole berry's answer unusable (ADR-036 §1.2).
  parse: (data) => parseZoneListStrict(data),
};

/** What the app root hands `QueryProvider`; tests that exercise a restart use the same value. */
export const zonesQueryCachePersistence = createQueryCachePersistence(zonesQueryCachePolicy);
