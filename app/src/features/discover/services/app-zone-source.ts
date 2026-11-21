import { zoneSourceKind } from '@/config/env';
import { apiClient } from '@/services/api';

import type { ZoneInsightSource } from '../domain/zone-insight';
import type { ZoneSource } from '../domain/zone-source';
import { createApiZoneInsightSource } from './api-zone-insight-source';
import { createApiZoneSource } from './api-zone-source';
import { testZoneSource } from './test-zone-source';

/**
 * The zone source the app's routes hand their screens: the team API's `GET /zones` (ADR-065).
 * Screens default to the bundled stub so their tests and the prototypes stay hermetic; the
 * routes are where the shipped app chooses the service. Only a non-production build that asks
 * for it by name (`EXPO_PUBLIC_ZONE_SOURCE=stub`, the layout harness) gets the stub here.
 */
const readsStub = zoneSourceKind() === 'stub';

export const appZoneSource: ZoneSource = readsStub
  ? testZoneSource
  : createApiZoneSource({ client: apiClient });

/** The zone service's extra facts for screen 07, or none when the build reads the stub. */
export const appZoneInsightSource: ZoneInsightSource | undefined = readsStub
  ? undefined
  : createApiZoneInsightSource({ client: apiClient });
