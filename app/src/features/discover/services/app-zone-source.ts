import { zoneSourceKind } from '@/config/env';
import { apiClient } from '@/services/api';

import type { ZoneSource } from '../domain/zone-source';
import { createApiZoneSource } from './api-zone-source';
import { testZoneSource } from './test-zone-source';

/**
 * The zone source the app's routes hand their screens: the team API's `GET /zones` (ADR-065).
 * Screens default to the bundled stub so their tests and the prototypes stay hermetic; the
 * routes are where the shipped app chooses the service. Only a non-production build that asks
 * for it by name (`EXPO_PUBLIC_ZONE_SOURCE=stub`, the layout harness) gets the stub here.
 */
export const appZoneSource: ZoneSource =
  zoneSourceKind() === 'stub' ? testZoneSource : createApiZoneSource({ client: apiClient });
