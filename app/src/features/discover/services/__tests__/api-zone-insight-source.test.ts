import { createApiClient, type ApiFetch } from '@/services/api';

import { createApiZoneInsightSource, HISTORY_DAYS } from '../api-zone-insight-source';

/**
 * The `ZoneInsightSource` adapter for `GET /zones/{id}`, `/explanation` and `/history`
 * (ADR-065, the plan's phase 3). No test reaches the network.
 */
const BASE = 'https://api.example.test';
const ZONE = 'cc0e7929-de9f-516a-9049-7a25a1a6d092';

const BODIES: Record<string, unknown> = {
  [`/api/v1/zones/${ZONE}`]: {
    id: ZONE,
    h3: '8811250e25fffff',
    name: 'Laajavuori 1',
    forest_type: null,
    area_km2: 0.7,
    centroid: { lat: 62.25, lng: 25.69 },
    scores: [
      {
        species: 'bilberry',
        score: 53,
        confidence: 'medium',
        ripeness: 'past',
        updated_at: '2026-08-03T04:02:00.000Z',
      },
    ],
    reports_7d: [{ species: 'bilberry', count: 3, avg_rating: 4 }],
  },
  [`/api/v1/zones/${ZONE}/explanation`]: {
    reasons: [{ code: 'warm', text: 'Lämmin kesä.' }],
  },
  [`/api/v1/zones/${ZONE}/history`]: {
    days: 30,
    points: [{ date: '2026-08-01', score: 40, confidence: 'low' }],
  },
};

function source(failing?: string) {
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async (url) => {
    const path = new URL(url).pathname;
    if (path === failing) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => BODIES[path] };
  });
  const client = createApiClient({
    baseUrl: BASE,
    fetchImpl,
    tokens: { accessToken: async () => 'a1', refresh: async () => null },
  });

  return { fetchImpl, insightSource: createApiZoneInsightSource({ client }) };
}

describe('createApiZoneInsightSource', () => {
  it('asks for the zone, its reasons in the screen’s language, and its history', async () => {
    const { fetchImpl, insightSource } = source();

    await insightSource.insight({ zoneId: ZONE, species: 'bilberry', lang: 'fi' });

    expect(fetchImpl.mock.calls.map(([url]) => url).sort()).toEqual(
      [
        `${BASE}/api/v1/zones/${ZONE}`,
        `${BASE}/api/v1/zones/${ZONE}/explanation?species=bilberry&lang=fi`,
        `${BASE}/api/v1/zones/${ZONE}/history?species=bilberry&days=${HISTORY_DAYS}`,
      ].sort(),
    );
  });

  it('answers what the three reads said', async () => {
    const { insightSource } = source();

    expect(await insightSource.insight({ zoneId: ZONE, species: 'bilberry', lang: 'fi' })).toEqual({
      detail: {
        id: ZONE,
        scores: { bilberry: { score: 53, confidence: 'medium', ripeness: 'past' } },
        reports: { bilberry: { count: 3, averageRating: 4 } },
      },
      reasons: ['Lämmin kesä.'],
      history: { days: 30, points: [{ date: '2026-08-01', score: 40 }] },
    });
  });

  it('encodes the zone id, so an id cannot name another path', async () => {
    const { fetchImpl, insightSource } = source();

    await insightSource
      .insight({ zoneId: '../me', species: 'bilberry', lang: 'en' })
      .catch(() => undefined);

    expect(fetchImpl.mock.calls[0]![0]).toContain('/api/v1/zones/..%2Fme');
  });

  it.each([`/api/v1/zones/${ZONE}`, `/api/v1/zones/${ZONE}/explanation`])(
    'rejects when %s cannot be read',
    async (failing) => {
      const { insightSource } = source(failing);

      await expect(
        insightSource.insight({ zoneId: ZONE, species: 'bilberry', lang: 'en' }),
      ).rejects.toMatchObject({ failure: { kind: 'http', status: 404 } });
    },
  );
});
