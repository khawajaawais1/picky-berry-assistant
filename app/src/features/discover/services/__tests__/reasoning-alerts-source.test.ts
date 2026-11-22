import type { ApiClient, ApiResult } from '@/services/api';

import { createReasoningAlertsSource, ReasoningAlertsReadError } from '../reasoning-alerts-source';

function clientAnswering(result: ApiResult<unknown>) {
  const request = jest.fn(async () => result);
  return {
    source: createReasoningAlertsSource({ client: { request } as unknown as ApiClient }),
    request,
  };
}

describe('createReasoningAlertsSource', () => {
  it('reads the alerts from the reasoning service without a credential', async () => {
    const { source, request } = clientAnswering({ ok: true, status: 200, data: [] });

    await expect(source.list()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/alerts', auth: false }),
    );
  });

  it('throws a read error when the service does not answer', async () => {
    const { source } = clientAnswering({ ok: false, error: { kind: 'network' } });

    await expect(source.list()).rejects.toThrow(ReasoningAlertsReadError);
  });
});
