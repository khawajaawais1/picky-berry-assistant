import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ApiClient, ApiRequest, ApiResult } from '@/services/api';
import { enqueueReport, readReportQueue, type VisitReport } from '@/services/report-queue';

import {
  createReportsApi,
  flushReportQueue,
  parseKilograms,
  parseSeason,
  parseZoneReportPage,
  ReportsReadError,
} from '../reports-api';

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
  // As the real client does: a body the parser refuses is an invalid response, not data.
  const request = jest.fn(async (req: ApiRequest<unknown>): Promise<ApiResult<unknown>> => {
    if (!result.ok) return result;
    const data = req.parse(result.data);
    return data === null
      ? { ok: false, error: { kind: 'invalid-response', status: result.status } }
      : { ...result, data };
  });
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

describe('the reports API’s reads', () => {
  const RAW_REPORT = {
    id: 'r1',
    species: 'bilberry',
    rating: 4,
    amount_kg: 1.3,
    minutes: 52,
    trust: 'trusted',
    recorded_at: '2026-08-28T10:55:00.000Z',
  };

  it('reads a zone’s reports for the berry asked, dropping what it cannot read', async () => {
    const { client, request } = clientAnswering({
      ok: true,
      status: 200,
      data: {
        zone_id: 'zone-a',
        zone_name: 'Laajavuori 1',
        count_7d: 2,
        reports: [
          RAW_REPORT,
          { ...RAW_REPORT, id: 'r2', trust: 'other', amount_kg: null },
          { id: 'x' },
        ],
      },
    });

    const page = await createReportsApi({ client }).forZone('zone a', 'bilberry');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/zones/zone%20a/reports', query: { species: 'bilberry' } }),
    );
    expect(page).toEqual({
      zoneId: 'zone-a',
      zoneName: 'Laajavuori 1',
      countThisWeek: 2,
      reports: [
        {
          id: 'r1',
          species: 'bilberry',
          rating: 4,
          amountKg: 1.3,
          minutes: 52,
          trust: 'trusted',
          recordedAt: RAW_REPORT.recorded_at,
        },
        {
          id: 'r2',
          species: 'bilberry',
          rating: 4,
          amountKg: null,
          minutes: 52,
          trust: 'unverified',
          recordedAt: RAW_REPORT.recorded_at,
        },
      ],
    });
  });

  it('reads the picker’s own reports', async () => {
    const { client } = clientAnswering({
      ok: true,
      status: 200,
      data: {
        reports: [
          { ...RAW_REPORT, client_id: 'c1', zone_id: 'zone-a', zone_name: null },
          { id: 'bad' },
        ],
      },
    });

    await expect(createReportsApi({ client }).mine()).resolves.toEqual([
      {
        id: 'r1',
        clientId: 'c1',
        zoneId: 'zone-a',
        zoneName: null,
        species: 'bilberry',
        rating: 4,
        amountKg: 1.3,
        minutes: 52,
        recordedAt: RAW_REPORT.recorded_at,
      },
    ]);
  });

  it('throws a read error the screen can say, for a failure and for a body it cannot read', async () => {
    const offline = clientAnswering({ ok: false, error: { kind: 'network' } });
    const garbled = clientAnswering({ ok: true, status: 200, data: { nothing: true } });

    await expect(createReportsApi(offline).mine()).rejects.toThrow(ReportsReadError);
    await expect(createReportsApi(garbled).season()).rejects.toThrow(ReportsReadError);
    await expect(createReportsApi(garbled).forZone('z')).rejects.toThrow(ReportsReadError);
  });

  it('parses a season with missing figures as zero, and drops unreadable bars', () => {
    expect(
      parseSeason({
        year: 2026,
        harvest_by_report: [
          { report_id: 'r1', kilograms: 1, recorded_at: 'x' },
          'bad',
          { report_id: 'r2' },
        ],
      }),
    ).toEqual({
      year: 2026,
      visitCount: 0,
      reportCount: 0,
      zonesVisited: 0,
      stayHours: 0,
      medianMinutes: null,
      harvestedKg: 0,
      kgPerHour: null,
      harvestByReport: [{ reportId: 'r1', zoneName: null, kilograms: 1, recordedAt: 'x' }],
    });
    expect(parseSeason({ harvest_by_report: [] })).toBeNull();
    expect(parseZoneReportPage({ reports: [] })).toBeNull();
    expect(parseZoneReportPage('x')).toBeNull();
  });

  it('refuses to send a report with no id, and counts an unreadable 2xx as recorded', async () => {
    const { client } = clientAnswering({
      ok: false,
      error: { kind: 'invalid-response', status: 201 },
    });

    await expect(
      createReportsApi({ client }).send({ ...REPORT, clientId: undefined }),
    ).resolves.toBe('refused');
    await expect(
      createReportsApi({ client }).send({ ...REPORT, amountText: '', visitId: undefined }),
    ).resolves.toBe('recorded');
  });
});
