import { useQuery } from '@tanstack/react-query';

import type { Species } from '../domain/species';
import { parseZoneList } from '../domain/zone-schema';
import type { Zone, ZoneSource } from '../domain/zone-source';

/**
 * What the map shows while a `ZoneSource` answers: the zones, and **why** there are none.
 *
 * The status is not decoration. A map with no polygons is indistinguishable whether the
 * source is still loading, returned nothing, or failed, and the screen owes the picker the
 * difference — an empty map that means “failed” is a screen saying there are no berries.
 *
 * **The read goes through TanStack Query** (ADR-051), with two consequences the hook relies
 * on rather than re-implements:
 *
 * - **the cache is keyed by the berry.** A zone carries one score per species, so a bilberry
 *   answer must never be painted under the cloudberry chip. Pressing back to a berry the
 *   picker has already seen shows its zones immediately and revalidates behind them, and a
 *   late answer for a berry the screen has moved past lands in that berry's cache instead of
 *   repainting this one — the race the old effect had to guard with an `answered` field.
 * - **the retry policy is none.** A failed read is said so at once; three retries with
 *   backoff would leave the map blank for seconds before the screen could tell the picker
 *   what happened. Pressing the chip again is the retry.
 *
 * The response is validated by `parseZoneList` before it reaches the map: an adapter that
 * returns a zone the app cannot draw is no zones at all (ADR-036 §1.2), not a polygon in a
 * colour that means nothing.
 *
 * The source is not part of the key: the app composes one, and a port has no identity to
 * hash. A second source in one tree would need a key of its own.
 */
export type ZonesStatus = 'loading' | 'ready' | 'error';

export type ZonesState = {
  status: ZonesStatus;
  zones: readonly Zone[];
};

const LOADING: ZonesState = { status: 'loading', zones: [] };
const FAILED: ZonesState = { status: 'error', zones: [] };

export function useZones(source: ZoneSource, species: Species): ZonesState {
  const query = useQuery({
    queryKey: ['zones', species],
    queryFn: async () => parseZoneList(await source.list({ species })),
    retry: false,
    // At most one entry per berry, so the map's cache is bounded by the species list. Keeping
    // it for the app's run is what makes pressing a chip back show its zones immediately, and
    // it means the cache schedules no eviction timer a test would have to wait out.
    gcTime: Infinity,
  });

  if (query.isError) return FAILED;
  // A cached answer is not `pending`, even while it revalidates: the map keeps its polygons
  // and the screen does not flash a loading line over them.
  if (query.isPending) return LOADING;

  return { status: 'ready', zones: query.data };
}
