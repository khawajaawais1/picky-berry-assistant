import { zoneSourceKind } from '@/config/env';
import { apiClient } from '@/services/api';

import { createVisitsApi, type VisitsApi } from './visits-api';

/**
 * The visits API the app's routes hand their screens (ADR-065, the plan's phase 4), or none in
 * a build that reads the bundled stub zones (the layout harness): the stub's zones are not the
 * service's, so there is no service record to show beside them.
 */
export const appVisitsApi: VisitsApi | undefined =
  zoneSourceKind() === 'stub' ? undefined : createVisitsApi({ client: apiClient });
