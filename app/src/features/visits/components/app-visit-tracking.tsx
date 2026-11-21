import { useMemo } from 'react';

import {
  appZoneSource,
  PILOT_ZONE_SPECIES,
  useZones,
  zoneTrackingPolygons,
} from '@/features/discover';

import { appVisitsApi } from '../services/app-visits-api';
import type { VisitsApi } from '../services/visits-api';
import { VisitTracker } from './visit-tracker';

/**
 * The visit tracker as the app shell mounts it (ADR-066): over the zones the map reads from the
 * zone service, sending finished visits to it. A build with no visits service (the layout
 * harness's stub build) mounts nothing, so it watches no position for a service it cannot post to.
 *
 * The zones are the pilot berry's answer: every berry's answer carries the same rings, and the
 * tracker only needs where the zones are.
 */
export function AppVisitTracking() {
  return appVisitsApi ? <ServiceVisitTracking api={appVisitsApi} /> : null;
}

function ServiceVisitTracking({ api }: { api: VisitsApi }) {
  const { zones } = useZones(appZoneSource, PILOT_ZONE_SPECIES);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);

  return <VisitTracker api={api} zoneNames={zoneNames} zones={zoneTrackingPolygons(zones)} />;
}
