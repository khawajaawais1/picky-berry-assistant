import type { PositionSource } from '@/services/location';

import type { VisitPolicy } from '../domain/visit-policy';
import type { ZonePolygon } from '../domain/zone-containment';
import { useVisitPresence } from '../hooks/use-visit-presence';
import { useVisitSync } from '../hooks/use-visit-sync';
import type { VisitsApi } from '../services/visits-api';

/**
 * The visit tracker, mounted (ADR-066). It draws nothing: it reads position through
 * `useVisitPresence` (the consent record and the platform's permission are the only gates,
 * foreground only, ADR-045 and ADR-056), and sends each finalized visit to `POST /visits` once
 * through `useVisitSync`. No fix is stored or logged; only the finished visit leaves the device,
 * as the start, end and zone the server needs.
 */
export type VisitTrackerProps = {
  zones: readonly ZonePolygon[];
  api: VisitsApi | undefined;
  policy?: VisitPolicy;
  source?: PositionSource;
  nextVisitId?: () => string;
};

export function VisitTracker({ api, nextVisitId, policy, source, zones }: VisitTrackerProps) {
  const { visits } = useVisitPresence({ nextVisitId, policy, source, zones });
  useVisitSync({ api, visits });

  return null;
}
