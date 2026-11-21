import type { ConfigResult } from '@/config/env';

import type { ApiFetch, TokenProvider } from '../api-client';
import { createAppApiClient } from '../app-client';

/**
 * The transport every feature reads the team API through (ADR-065 decision 5): the configured
 * base URL, authenticated by the session port's tokens. An unusable configuration sends nothing.
 */
const GOOD: ConfigResult = {
  ok: true,
  config: {
    environment: 'development',
    apiBaseUrl: 'https://api.example.test',
  },
};
const BAD: ConfigResult = { ok: false, problems: [{ variable: 'X', reason: 'y' }] };

const tokens: TokenProvider = { accessToken: async () => 'a1', refresh: async () => null };

function recorder() {
  return jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ species: [] }),
  }));
}

describe('createAppApiClient', () => {
  it('sends authenticated requests to the configured API', async () => {
    const fetchImpl = recorder();
    const client = createAppApiClient({ config: GOOD, tokens, fetchImpl });

    await client.request({ method: 'GET', path: '/species', parse: (body) => body });

    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.example.test/api/v1/species');
    expect(fetchImpl.mock.calls[0]![1].headers).toHaveProperty('Authorization', 'Bearer a1');
  });

  it('answers unconfigured, and sends nothing, when the configuration is unusable', async () => {
    const fetchImpl = recorder();
    const client = createAppApiClient({ config: BAD, tokens, fetchImpl });

    const result = await client.request({ method: 'GET', path: '/species', parse: (b) => b });

    expect(result).toEqual({ ok: false, error: { kind: 'unconfigured' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
