import { createApiClient, type ApiFetch } from '@/services/api';

import type { Visit } from '../../domain/visit-lifecycle';
import { createVisitsApi } from '../visits-api';

/**
 * `POST /visits` and `GET /visits` through the authenticated transport (ADR-065, the plan's
 * phase 4). A submit says whether to keep trying: the network and the server's own trouble are
 * worth a retry, and a refusal is not, because the same body will be refused again.
 */
const BASE = 'https://api.example.test';
const ZONE = 'cc0e7929-de9f-516a-9049-7a25a1a6d092';
const ID = '4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d';
const T0 = Date.parse('2026-08-03T09:00:00.000Z');

const VISIT: Visit = {
  id: ID,
  zoneId: ZONE,
  policyVersion: 'stand-in-1',
  openedAt: T0,
  lastPresenceAt: T0 + 40 * 60_000,
  segments: [{ enteredAt: T0, exitedAt: T0 + 45 * 60_000 }],
  finalizedAt: T0 + 50 * 60_000,
};

const RECORD = {
  id: ID,
  zone_id: ZONE,
  zone_name: 'Laajavuori 1',
  started_at: '2026-08-03T09:00:00.000Z',
  ended_at: '2026-08-03T09:45:00.000Z',
  duration_s: 2700,
  manual: false,
  status: 'accepted',
  reject_reason: null,
};

function api(answer: { status: number; body?: unknown } | 'offline') {
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    if (answer === 'offline') throw new TypeError('Network request failed');
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body };
  });
  const client = createApiClient({
    baseUrl: BASE,
    fetchImpl,
    tokens: { accessToken: async () => 'a1', refresh: async () => null },
  });

  return { fetchImpl, visits: createVisitsApi({ client }) };
}

describe('createVisitsApi', () => {
  describe('submit', () => {
    it('posts the finalized visit keyed by its own id', async () => {
      const { fetchImpl, visits } = api({
        status: 201,
        body: { ...RECORD, idempotent_replay: false },
      });

      await visits.submit(VISIT);

      const [url, init] = fetchImpl.mock.calls[0]!;
      expect(url).toBe(`${BASE}/api/v1/visits`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body!)).toEqual({
        client_id: ID,
        zone_id: ZONE,
        started_at: '2026-08-03T09:00:00.000Z',
        ended_at: '2026-08-03T09:45:00.000Z',
        manual: false,
      });
    });

    it.each([201, 200])(
      'answers the recorded visit for a %i, a replay included',
      async (status) => {
        const { visits } = api({ status, body: { ...RECORD, idempotent_replay: status === 200 } });

        expect(await visits.submit(VISIT)).toEqual({
          kind: 'recorded',
          record: expect.objectContaining({ id: ID, status: 'accepted' }),
        });
      },
    );

    it('sends nothing for a visit that is not finalized', async () => {
      const { fetchImpl, visits } = api({ status: 201, body: RECORD });

      expect(await visits.submit({ ...VISIT, finalizedAt: null })).toEqual({ kind: 'skipped' });
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it.each<[string, { status: number; body?: unknown } | 'offline']>([
      ['the network', 'offline'],
      ['a server error', { status: 503, body: {} }],
      ['an ended session', { status: 401, body: {} }],
    ])('asks for a retry when %s fails the submit', async (_, answer) => {
      const { visits } = api(answer);

      expect((await visits.submit(VISIT)).kind).toBe('retry');
    });

    it.each([409, 422])(
      'gives up on a %i, which the same body would meet again',
      async (status) => {
        const { visits } = api({ status, body: { error: { code: 'X', message: 'x' } } });

        expect((await visits.submit(VISIT)).kind).toBe('refused');
      },
    );
  });

  describe('list', () => {
    it('reads the picker’s visits, newest first as the server orders them', async () => {
      const { fetchImpl, visits } = api({
        status: 200,
        body: { visits: [RECORD], next_cursor: null },
      });

      const page = await visits.list();

      expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/api/v1/visits?limit=20&status=accepted`);
      expect(page.visits.map((visit) => visit.zoneName)).toEqual(['Laajavuori 1']);
    });

    it('rejects a list it could not read, so the screen can say so', async () => {
      const { visits } = api('offline');

      await expect(visits.list()).rejects.toMatchObject({ failure: { kind: 'network' } });
    });
  });
});
