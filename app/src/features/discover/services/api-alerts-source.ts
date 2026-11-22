import { apiClient, type ApiClient, type ApiFailure } from '@/services/api';

import { parseAlertFeed, type AlertFeed } from '../domain/alert';

export class AlertsReadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the alerts could not be read (${failure.kind})`);
    this.name = 'AlertsReadError';
  }
}

export type AlertsSource = {
  list(position?: { latitude: number; longitude: number }): Promise<AlertFeed>;
};

export function createApiAlertsSource({ client }: { client: ApiClient }): AlertsSource {
  return {
    async list(position) {
      const result = await client.request({
        method: 'GET',
        path: '/alerts',
        query: position ? { lat: position.latitude, lng: position.longitude } : undefined,
        parse: parseAlertFeed,
      });
      if (!result.ok) throw new AlertsReadError(result.error);
      return result.data;
    },
  };
}

export const appAlertsSource: AlertsSource = createApiAlertsSource({ client: apiClient });
