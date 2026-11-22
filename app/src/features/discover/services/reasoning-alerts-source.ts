import { reasoningApiBaseUrl } from '@/config/env';
import { createApiClient, type ApiClient, type ApiFailure } from '@/services/api';

import { parseReasoningAlerts, type ReasoningAlert } from '../domain/reasoning-alert';

export class ReasoningAlertsReadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the reasoning alerts could not be read (${failure.kind})`);
    this.name = 'ReasoningAlertsReadError';
  }
}

/** The explainable alerts the daily reasoning job wrote (feature 6.7), best score first. */
export type ReasoningAlertsSource = {
  list(): Promise<ReasoningAlert[]>;
};

export function createReasoningAlertsSource({
  client,
}: {
  client: ApiClient;
}): ReasoningAlertsSource {
  return {
    async list() {
      const result = await client.request({
        method: 'GET',
        path: '/alerts',
        // The reasoning backend's alerts are public for now (docs/features/6.7).
        auth: false,
        parse: parseReasoningAlerts,
      });
      if (!result.ok) throw new ReasoningAlertsReadError(result.error);
      return result.data;
    },
  };
}

const unconfigured: ApiClient = {
  request: async () => ({ ok: false, error: { kind: 'unconfigured' } }),
};

function reasoningClient(): ApiClient {
  const baseUrl = reasoningApiBaseUrl();
  return baseUrl === null ? unconfigured : createApiClient({ baseUrl });
}

/** The source the app itself uses: the reasoning backend, not the team API. */
export const appReasoningAlertsSource: ReasoningAlertsSource = createReasoningAlertsSource({
  client: reasoningClient(),
});
