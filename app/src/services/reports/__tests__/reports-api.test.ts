import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ApiClient, ApiRequest, ApiResult } from '@/services/api';
import { enqueueReport, readReportQueue, type VisitReport } from '@/services/report-queue';

import { createReportsApi, flushReportQueue, parseKilograms } from '../reports-api';

const REPORT: VisitReport = {
  amountText: '1,3 kg',
  minutes: 52,
  recordedAt: '2026-08-28T10:55:00.000Z',
  speciesId: 'bilberry',
  yieldRating: 4,
  zoneId: 'zone-a',
  clientId: '00000000-0000-4000-8000-000000000001',
  visitId: '00000000-0000-4000-8000-000000000002',
};

function clientAnswering(result: ApiResult<unknown>) {
  const request = jest.fn(async (req: ApiRequest<unknown>) =>
    result.ok ? { ...result, data: req.parse(result.data) } : result,
  );
  return { client: { request } as unknown as ApiClient, request };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('parseKilograms', () => {
  it('reads the picker’s typed harvest in either decimal mark', () => {
    expect(parseKilograms('1,3 kg')).toBe(1.3);
    expect(parseKilograms('2')).toBe(2);
    expect(parseKilograms('a bucket')).toBeNull();
    expect(parseKilograms('')).toBeNull();
  });
});

describe('createReportsApi', () => {
  it('posts a report with its id, harvest and visit', async () => {
    const { client, request } = clientAnswering({ ok: true, status: 201, data: { id: 'r1' } });

    await expect(createReportsApi({ client }).send(REPORT)).resolves.toBe('recorded');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/reports',
        body: {
          client_id: REPORT.clientId,
          zone_id: 'zone-a',
          species: 'bilberry',
          rating: 4,
          minutes: 52,
          recorded_at: REPORT.recordedAt,
          amount_kg: 1.3,
          visit_id: REPORT.visitId,
        },
      }),
    );
  });

  it('tells a retry from a refusal', async () => {
    const offline = clientAnswering({ ok: false, error: { kind: 'network' } });
    const refused = clientAnswering({
      ok: false,
      error: { kind: 'http', status: 422, code: 'ZONE_NOT_FOUND', requestId: null },
    });

    await expect(createReportsApi(offline).send(REPORT)).resolves.toBe('retry');
    await expect(createReportsApi(refused).send(REPORT)).resolves.toBe('refused');
  });

  it('reads the picker’s season', async () => {
    const { client } = clientAnswering({
      ok: true,
      status: 200,
      data: {
        year: 2026,
        visit_count: 1,
        report_count: 1,
        zones_visited: 1,
        stay_hours: 1,
        median_minutes: 60,
        harvested_kg: 1.3,
        kg_per_hour: 1.5,
        harvest_by_report: [
          {
            report_id: 'r1',
            zone_name: 'Laajavuori 1',
            kilograms: 1.3,
            recorded_at: REPORT.recordedAt,
          },
        ],
      },
    });

    await expect(createReportsApi({ client }).season()).resolves.toMatchObject({
      year: 2026,
      harvestedKg: 1.3,
      harvestByReport: [{ reportId: 'r1', kilograms: 1.3 }],
    });
  });
});

describe('flushReportQueue', () => {
  it('sends the queue oldest first and stops at the first report to retry', async () => {
    await enqueueReport({ ...REPORT, clientId: undefined });
    await enqueueReport({ ...REPORT, clientId: undefined, zoneId: 'zone-b' });
    await enqueueReport({ ...REPORT, clientId: undefined, zoneId: 'zone-c' });
    const send = jest.fn().mockResolvedValueOnce('recorded').mockResolvedValueOnce('retry');

    await flushReportQueue({ send });

    expect(send).toHaveBeenCalledTimes(2);
    expect((await readReportQueue()).map((report) => report.zoneId)).toEqual(['zone-b', 'zone-c']);
  });
});
