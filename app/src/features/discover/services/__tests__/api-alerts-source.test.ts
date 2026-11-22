import type { ApiClient, ApiResult } from '@/services/api';

import { ALERT_FEED } from '../../test-fixtures';
import { AlertsReadError, createApiAlertsSource } from '../api-alerts-source';

function clientAnswering(result: ApiResult<unknown>) {
  const request = jest.fn(async () => result);
  return {
    source: createApiAlertsSource({ client: { request } as unknown as ApiClient }),
    request,
  };
}

describe('createApiAlertsSource', () => {
  it('asks for the alerts near the phone, when it has a position', async () => {
    const { source, request } = clientAnswering({ ok: true, status: 200, data: ALERT_FEED });

    await expect(source.list({ latitude: 62.2, longitude: 25.7 })).resolves.toBe(ALERT_FEED);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/alerts', query: { lat: 62.2, lng: 25.7 } }),
    );

    await source.list();
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ query: undefined }));
  });

  it('throws a read error when the service does not answer', async () => {
    const { source } = clientAnswering({ ok: false, error: { kind: 'unauthenticated' } });

    await expect(source.list()).rejects.toThrow(AlertsReadError);
  });
});
