import { createApiClient, type ApiFetch } from '@/services/api';

import { createApiZoneSource, PILOT_BBOX, ZoneSourceError } from '../api-zone-source';

/**
 * The `ZoneSource` adapter for `GET /zones` (ADR-065, the plan's phase 2): the pilot area's
 * zones for one berry, read through the authenticated transport and validated by `parseZones`.
 * A failed read rejects, which is what `useZones` turns into the map's error state.
 */
const BASE = 'https://api.example.test';

const FEATURE = {
  type: 'Feature',
  id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [25.689711, 62.25623],
        [25.69564, 62.253184],
        [25.703822, 62.254551],
        [25.689711, 62.25623],
      ],
    ],
  },
  properties: {
    h3: '8811250e25fffff',
    name: 'Laajavuori 1',
    species: 'bilberry',
    score: 53,
    confidence: 'medium',
    ripeness: 'past',
    updated_at: '2026-08-03T04:02:00.000Z',
  },
};

function collection(mode = 'detail', features: unknown[] = [FEATURE]) {
  return {
    type: 'FeatureCollection',
    features,
    meta: {
      species: 'bilberry',
      mode,
      count: features.length,
      bbox: [0, 0, 1, 1],
      computed_at: null,
    },
  };
}

function sourceAnswering(answer: { status: number; body?: unknown } | 'offline') {
  const fetchImpl = jest.fn<ReturnType<ApiFetch>, Parameters<ApiFetch>>(async () => {
    if (answer === 'offline') throw new TypeError('Network request failed');
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body };
  });
  const client = createApiClient({
    baseUrl: BASE,
    fetchImpl,
    tokens: { accessToken: async () => 'a1', refresh: async () => null },
  });

  return { fetchImpl, source: createApiZoneSource({ client }) };
}

describe('createApiZoneSource', () => {
  it('asks for the pilot area’s zones for one berry, in detail mode', async () => {
    const { fetchImpl, source } = sourceAnswering({ status: 200, body: collection() });

    await source.list({ species: 'bilberry' });

    expect(fetchImpl.mock.calls[0]![0]).toBe(
      `${BASE}/api/v1/zones?bbox=${encodeURIComponent(PILOT_BBOX.join(','))}&species=bilberry&zoom=12`,
    );
  });

  it('keeps the pilot area inside the server’s 50 km detail limit', () => {
    const [west, south, east, north] = PILOT_BBOX;
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLon = kmPerDegreeLat * Math.cos((((south + north) / 2) * Math.PI) / 180);

    expect((east - west) * kmPerDegreeLon).toBeLessThan(50);
    expect((north - south) * kmPerDegreeLat).toBeLessThan(50);
  });

  it('answers the zones the map can draw', async () => {
    const { source } = sourceAnswering({ status: 200, body: collection() });

    const zones = await source.list({ species: 'bilberry' });

    expect(zones).toEqual([
      expect.objectContaining({
        id: FEATURE.id,
        name: 'Laajavuori 1',
        score: 53,
        scores: { bilberry: { score: 53, confidence: 'medium', ripeness: 'past' } },
        updatedAt: '2026-08-03T04:02:00.000Z',
      }),
    ]);
  });

  it('rejects a grouped answer, whose features are H3 parents rather than zones', async () => {
    const { source } = sourceAnswering({ status: 200, body: collection('grouped') });

    await expect(source.list({ species: 'bilberry' })).rejects.toBeInstanceOf(ZoneSourceError);
  });

  it.each<[string, { status: number; body?: unknown } | 'offline', string]>([
    ['the network', 'offline', 'network'],
    [
      'a refusal',
      { status: 422, body: { error: { code: 'BBOX_TOO_LARGE', message: 'x' } } },
      'http',
    ],
    ['a body that is not a collection', { status: 200, body: { nope: true } }, 'invalid-response'],
  ])('rejects when %s fails the read, naming why', async (_, answer, kind) => {
    const { source } = sourceAnswering(answer);

    await expect(source.list({ species: 'bilberry' })).rejects.toMatchObject({
      failure: { kind },
    });
  });
});
