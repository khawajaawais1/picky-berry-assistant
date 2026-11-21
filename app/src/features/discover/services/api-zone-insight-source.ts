import type { ApiClient, ApiResult } from '@/services/api';

import {
  parseScoreHistory,
  parseZoneDetail,
  parseZoneExplanation,
  type ZoneInsightSource,
} from '../domain/zone-insight';
import { ZoneSourceError } from './api-zone-source';

/**
 * The `ZoneInsightSource` adapter for the team API (ADR-065, the plan's phase 3): the zone's
 * detail, the server's localized reasons for the screen's berry, and the berry's daily history,
 * read in parallel. Any read that fails rejects the whole insight with a `ZoneSourceError`, so
 * the screen never pairs one read's figures with another's silence.
 */
export const HISTORY_DAYS = 30;

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new ZoneSourceError(result.error);
  return result.data;
}

export function createApiZoneInsightSource({ client }: { client: ApiClient }): ZoneInsightSource {
  return {
    async insight({ zoneId, species, lang }) {
      const zone = `/zones/${encodeURIComponent(zoneId)}`;

      const [detail, reasons, history] = await Promise.all([
        client.request({ method: 'GET', path: zone, parse: parseZoneDetail }),
        client.request({
          method: 'GET',
          path: `${zone}/explanation`,
          query: { species, lang },
          parse: parseZoneExplanation,
        }),
        client.request({
          method: 'GET',
          path: `${zone}/history`,
          query: { species, days: HISTORY_DAYS },
          parse: parseScoreHistory,
        }),
      ]);

      return { detail: unwrap(detail), reasons: unwrap(reasons), history: unwrap(history) };
    },
  };
}
