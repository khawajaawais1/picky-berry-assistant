import { loadConfig, type ConfigResult } from '@/config/env';
import { sessionPort } from '@/services/session';

import { createApiClient, type ApiClient, type ApiFetch, type TokenProvider } from './api-client';

/**
 * The transport every feature reads the team API through (ADR-065 decision 5): the validated
 * base URL from `src/config/env.ts`, authenticated by the session port's tokens, so a 401 is
 * refreshed once in one place. A build whose base URL failed validation gets a client that
 * answers `unconfigured` and sends nothing.
 */
export type AppApiClientOptions = {
  config: ConfigResult;
  tokens: TokenProvider;
  fetchImpl?: ApiFetch;
};

const unconfiguredClient: ApiClient = {
  request: async () => ({ ok: false, error: { kind: 'unconfigured' } }),
};

export function createAppApiClient({ config, tokens, fetchImpl }: AppApiClientOptions): ApiClient {
  if (!config.ok) return unconfiguredClient;

  return createApiClient({ baseUrl: config.config.apiBaseUrl, tokens, fetchImpl });
}

/** The client the app itself uses. */
export const apiClient: ApiClient = createAppApiClient({
  config: loadConfig(),
  tokens: sessionPort.tokens,
});
