import { useQuery } from '@tanstack/react-query';

import type { Species } from '../domain/species';
import type { ZoneInsight, ZoneInsightSource } from '../domain/zone-insight';

/**
 * The zone service's facts about one zone and berry (ADR-065, the plan's phase 3), or nothing
 * when the screen was given no `ZoneInsightSource`.
 *
 * Like `useZones`, the read is not retried: a failure is said at once, and the zone's own map
 * figures stay on screen beside it. The answer is cached for the app's run under its zone, berry
 * and language, and never persisted: it is a read-through of the service, not a record.
 */
export type ZoneInsightState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; insight: ZoneInsight };

export function useZoneInsight(
  source: ZoneInsightSource | undefined,
  zoneId: string,
  species: Species,
  lang: 'fi' | 'en',
): ZoneInsightState | undefined {
  const query = useQuery({
    queryKey: ['zone-insight', zoneId, species, lang],
    queryFn: () => source!.insight({ zoneId, species, lang }),
    enabled: source !== undefined,
    retry: false,
  });

  if (source === undefined) return undefined;
  if (query.data) return { status: 'ready', insight: query.data };
  return query.isError ? { status: 'error' } : { status: 'loading' };
}
