import { zoneSourceKind } from '@/config/env';
import { apiClient } from '@/services/api';

import { createAccountApi, type AccountApi } from './account-api';

/** The account API the app's routes hand their screens (ADR-065, the plan's phase 5). */
export const appAccountApi = createAccountApi({ client: apiClient });

/**
 * The account's profile as the alerts card and the app's language read it (ADR-067), or none in a
 * build that reads the bundled stub zones (the layout harness). That build measures each frame in
 * the device's language and draws frame 12's card as the design's sample, so an account's own
 * language and settings would change what it measures. Production ignores the stub switch.
 */
export const appProfileApi: AccountApi | undefined =
  zoneSourceKind() === 'stub' ? undefined : appAccountApi;
