import { apiClient } from '@/services/api';

import { createAccountApi } from './account-api';

/** The account API the app's routes hand their screens (ADR-065, the plan's phase 5). */
export const appAccountApi = createAccountApi({ client: apiClient });
