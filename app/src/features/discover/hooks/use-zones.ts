import { useQueries, useQuery } from '@tanstack/react-query';

import type { Species } from '../domain/species';
import { parseZoneList } from '../domain/zone-schema';
import type { Zone, ZoneSource } from '../domain/zone-source';
import { zonesQueryKey } from '../services/zone-cache';

/**
 * What the map shows while a `ZoneSource` answers: the zones, and **why** there are none.
 *
 * The status is not decoration. A map with no polygons is indistinguishable whether the
 * source is still loading, returned nothing, or failed, and the screen owes the picker the
 * difference — an empty map that means “failed” is a screen saying there are no berries.
 *
 * **The read goes through TanStack Query** (ADR-051), with three consequences the hook relies
 * on rather than re-implements:
 *
 * - **the cache is keyed by the berry.** A zone carries one score per species, so a bilberry
 *   answer must never be painted under the cloudberry chip. Pressing back to a berry the
 *   picker has already seen shows its zones immediately and revalidates behind them, and a
 *   late answer for a berry the screen has moved past lands in that berry's cache instead of
 *   repainting this one — the race the old effect had to guard with an `answered` field.
 * - **the answer outlives the process.** The zone cache restores each berry's last successful
 *   answer on launch (`services/zone-cache.ts`), so the hook's first ready state can be a map
 *   rather than a loading line in a place with no signal.
 * - **the retry policy is none.** A failed read is said so at once; three retries with
 *   backoff would leave the map blank for seconds before the screen could tell the picker
 *   what happened. Pressing the chip again is the retry.
 *
 * A refresh that fails does not take the previous answer with it: the data a query already
 * held is still the last thing the app read, and the map keeps drawing it. That is the
 * difference the states below preserve — **no data at all** is the failure the screen names;
 * data plus a failed revalidation is the offline case the persisted cache exists for.
 *
 * The response is validated by `parseZoneList` before it reaches the map: an adapter that
 * returns a zone the app cannot draw is no zones at all (ADR-036 §1.2), not a polygon in a
 * colour that means nothing.
 *
 * **The answer's freshness is a fact about the data, not about this read.** `updatedAt` is the
 * oldest timestamp the answer carries, so the line the map prints cannot claim more than the
 * least-fresh zone supports. If any zone carries no timestamp the answer has no freshness to
 * state, and the line is omitted rather than guessed from the others; a restored cache is the
 * same answer as the read that wrote it, so the line shows the age of what is on screen, not
 * the moment the app reopened.
 *
 * The source is not part of the key: the app composes one, and a port has no identity to
 * hash. A second source in one tree would need a key of its own.
 */
export type ZonesStatus = 'loading' | 'ready' | 'error';

export type ZonesState = {
  status: ZonesStatus;
  zones: readonly Zone[];
  /** The oldest score timestamp on the answer, or `null` when it cannot state one. */
  updatedAt: string | null;
};

const LOADING: ZonesState = { status: 'loading', zones: [], updatedAt: null };
const FAILED: ZonesState = { status: 'error', zones: [], updatedAt: null };

/**
 * The oldest timestamp every zone carries, or `null` if the answer cannot state one.
 *
 * All-or-nothing on purpose: a zone with no timestamp is a zone the line cannot describe, and
 * ignoring it would make the map claim a freshness the data does not support. The oldest wins
 * for the same reason — the label describes the whole answer, so it may only be as fresh as
 * its least-fresh member.
 */
export function oldestUpdatedAt(zones: readonly Zone[]): string | null {
  if (zones.length === 0) return null;

  let oldest: number | null = null;
  let instant: string | null = null;

  for (const zone of zones) {
    if (zone.updatedAt === undefined || zone.updatedAt === null) return null;

    const at = Date.parse(zone.updatedAt);

    if (Number.isNaN(at)) return null;

    if (oldest === null || at < oldest) {
      oldest = at;
      instant = zone.updatedAt;
    }
  }

  return instant;
}

/**
 * One berry's answer, as the map's hook and the plan's per-berry reads both ask for it.
 *
 * The query key is the cache's identity too (`services/zone-cache.ts`): the plan and the map must
 * ask the same question under the same key, or the plan would miss the answer the map already
 * holds (and write a second copy of it).
 */
function zonesQuery(source: ZoneSource, species: Species) {
  return {
    queryKey: zonesQueryKey(species),
    queryFn: async () => parseZoneList(await source.list({ species })),
    retry: false,
    // At most one entry per berry, so the cache is bounded by the species list. Keeping it for
    // the app's run is what makes pressing a chip back show its zones immediately (and the zone
    // cache keeps it past the process); it also means the cache schedules no eviction timer a
    // test would have to wait out.
    gcTime: Infinity,
  };
}

export function useZones(source: ZoneSource, species: Species): ZonesState {
  const query = useQuery(zonesQuery(source, species));

  // Data outranks a failed refresh. A query keeps the data it already had when a later read
  // rejects (`status` becomes `error`, `data` does not disappear), and blanking the map then
  // would turn “the phone could not reach the source” into “there are no berries here”.
  if (query.data !== undefined) {
    return { status: 'ready', zones: query.data, updatedAt: oldestUpdatedAt(query.data) };
  }

  // No data at all: either nothing has been read yet, or the read failed. Those are different
  // sentences on screen, and `error` is the one that says the source did not answer.
  return query.isError ? FAILED : LOADING;
}

/**
 * The answers a saved plan needs: one per berry its record holds, under the same query keys the
 * map uses.
 *
 * A saved zone is read from **its own berry's** answer, not from the chip the map last had lit:
 * a zone service may score only the species it was asked about, so a plan mixing berries cannot
 * be resolved from one list (ADR-061). Each berry is asked once, even when several zones were
 * saved under it; the answers are the map's cached ones when it has already read them.
 *
 * The status is the honest aggregate of those reads:
 *
 * - **loading** while any needed answer has not arrived — a row whose berry is pending is not an
 *   identifier the source refused, and calling it one before the answer lands would be a
 *   conclusion the screen has not reached;
 * - **error** when one of them failed with no data behind it, while the answers that did arrive
 *   are still handed over so the plan can name the layers it knows;
 * - **ready** when every berry has an answer. A failed refresh behind data is still an answer,
 *   for the same reason the map keeps drawing the last zones it read.
 */
export type ZoneAnswersState = {
  status: ZonesStatus;
  zones: ReadonlyMap<Species, readonly Zone[]>;
};

export function useZoneAnswers(
  source: ZoneSource,
  speciesList: readonly Species[],
): ZoneAnswersState {
  const species = [...new Set(speciesList)];
  const answers = useQueries({ queries: species.map((berry) => zonesQuery(source, berry)) });
  const zones = new Map<Species, readonly Zone[]>();

  let waiting = false;
  let failed = false;

  answers.forEach((answer, index) => {
    const berry = species[index]!;

    if (answer.data !== undefined) {
      zones.set(berry, answer.data);
      return;
    }

    if (answer.isError) failed = true;
    else waiting = true;
  });

  return { status: waiting ? 'loading' : failed ? 'error' : 'ready', zones };
}
