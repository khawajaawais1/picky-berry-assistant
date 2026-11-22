import { apiClient } from '@/services/api';

import { createReportsApi, type ReportsApi } from './reports-api';

export * from './reports-api';

/** The reports the app reads and sends, through the team API. */
export const appReportsApi: ReportsApi = createReportsApi({ client: apiClient });
