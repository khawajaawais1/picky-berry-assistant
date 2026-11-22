import {
  buildOperationsHealth,
  type OperationsHealthInput,
} from './operations-health';

const NOW = new Date('2026-11-22T12:00:00.000Z');

function input(
  overrides: Partial<OperationsHealthInput> = {},
): OperationsHealthInput {
  return {
    now: NOW,
    zonesTotal: 100,
    zonesScored: 98,
    scoreRows: 392,
    staleScoreRows: 0,
    latestScoreAt: '2026-11-22T10:00:00.000Z',
    species: [
      {
        code: 'bilberry',
        nameEn: 'Bilberry',
        zonesScored: 98,
        latestScoreAt: '2026-11-22T10:00:00.000Z',
      },
      {
        code: 'lingonberry',
        nameEn: 'Lingonberry',
        zonesScored: 95,
        latestScoreAt: '2026-11-22T09:00:00.000Z',
      },
    ],
    queue: {
      queued: 0,
      running: 0,
      overdue: 0,
      oldestQueuedAt: null,
    },
    duplicates: { groups: 0, extra: 0 },
    required: { missingModelVersion: 0 },
    outOfRange: {
      reports: 0,
      scores: 0,
      trust: 0,
      visitDuration: 0,
      alertRadius: 0,
    },
    ingest: {
      available: true,
      runs: [
        {
          source: 'weather',
          status: 'ok',
          startedAt: '2026-11-22T06:00:00.000Z',
          finishedAt: '2026-11-22T06:10:00.000Z',
          rows: 1200,
          error: null,
        },
      ],
    },
    ...overrides,
  };
}

describe('buildOperationsHealth', () => {
  it('builds the full server-side operator check set', () => {
    const health = buildOperationsHealth(input());

    expect(health.status).toBe('ok');
    expect(health.checks.map((check) => check.id)).toEqual([
      'coverage',
      'freshness',
      'stale-scores',
      'queue-age',
      'duplicate-reports',
      'required-fields',
      'out-of-range',
      'ingest-runs',
    ]);
    expect(health.unavailable).toEqual([
      expect.objectContaining({ id: 'expired-leases' }),
    ]);
    expect(health.generated_at).toBe(NOW.toISOString());
    expect(
      health.checks.every((check) => check.checked_at === NOW.toISOString()),
    ).toBe(true);
    expect(
      health.checks.find((check) => check.id === 'coverage')?.breakdown,
    ).toHaveLength(2);
  });

  it('uses the worst species for freshness and coverage', () => {
    const health = buildOperationsHealth(
      input({
        species: [
          {
            code: 'bilberry',
            nameEn: 'Bilberry',
            zonesScored: 98,
            latestScoreAt: '2026-11-22T10:00:00.000Z',
          },
          {
            code: 'lingonberry',
            nameEn: 'Lingonberry',
            zonesScored: 90,
            latestScoreAt: '2026-11-19T10:00:00.000Z',
          },
        ],
      }),
    );

    const coverage = health.checks.find((check) => check.id === 'coverage');
    const freshness = health.checks.find((check) => check.id === 'freshness');

    expect(coverage?.status).toBe('warn');
    expect(
      coverage?.breakdown?.find((item) => item.key === 'lingonberry')?.status,
    ).toBe('warn');
    expect(freshness?.status).toBe('fail');
    expect(
      freshness?.breakdown?.find((item) => item.key === 'lingonberry')?.status,
    ).toBe('fail');
    expect(health.status).toBe('fail');
  });

  it('warns on a short queue delay and fails at five overdue jobs', () => {
    const warn = buildOperationsHealth(
      input({
        queue: {
          queued: 2,
          running: 1,
          overdue: 1,
          oldestQueuedAt: '2026-11-22T11:55:00.000Z',
        },
      }),
    );
    const fail = buildOperationsHealth(
      input({
        queue: {
          queued: 6,
          running: 0,
          overdue: 5,
          oldestQueuedAt: '2026-11-22T11:00:00.000Z',
        },
      }),
    );

    expect(warn.checks.find((check) => check.id === 'queue-age')?.status).toBe(
      'warn',
    );
    expect(fail.checks.find((check) => check.id === 'queue-age')?.status).toBe(
      'fail',
    );
  });

  it('fails the data-quality checks when duplicates, nulls or bad values exist', () => {
    const health = buildOperationsHealth(
      input({
        duplicates: { groups: 3, extra: 4 },
        required: { missingModelVersion: 2 },
        outOfRange: {
          reports: 1,
          scores: 0,
          trust: 1,
          visitDuration: 1,
          alertRadius: 1,
        },
      }),
    );

    expect(
      health.checks.find((check) => check.id === 'duplicate-reports')?.status,
    ).toBe('fail');
    expect(
      health.checks.find((check) => check.id === 'required-fields')?.status,
    ).toBe('fail');
    expect(
      health.checks.find((check) => check.id === 'out-of-range')?.status,
    ).toBe('fail');
    expect(
      health.checks.find((check) => check.id === 'out-of-range')?.detail,
    ).toContain('4');
  });

  it('reads the latest ingest run per source and reacts to failures', () => {
    const health = buildOperationsHealth(
      input({
        ingest: {
          available: true,
          runs: [
            {
              source: 'weather',
              status: 'ok',
              startedAt: '2026-11-22T06:00:00.000Z',
              finishedAt: '2026-11-22T06:10:00.000Z',
              rows: 1200,
              error: null,
            },
            {
              source: 'ndvi',
              status: 'running',
              startedAt: '2026-11-22T11:55:00.000Z',
              finishedAt: null,
              rows: null,
              error: null,
            },
          ],
        },
      }),
    );

    expect(
      health.checks.find((check) => check.id === 'ingest-runs')?.status,
    ).toBe('warn');
    expect(
      health.checks.find((check) => check.id === 'ingest-runs')?.breakdown,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'ndvi', status: 'warn' }),
      ]),
    );

    const failed = buildOperationsHealth(
      input({
        ingest: {
          available: true,
          runs: [
            {
              source: 'ndvi',
              status: 'failed',
              startedAt: '2026-11-22T06:00:00.000Z',
              finishedAt: '2026-11-22T06:01:00.000Z',
              rows: null,
              error: 'tile timeout',
            },
          ],
        },
      }),
    );
    expect(
      failed.checks.find((check) => check.id === 'ingest-runs')?.status,
    ).toBe('fail');
  });

  it('lists capabilities that the schema cannot check instead of inventing a status', () => {
    const health = buildOperationsHealth(
      input({ ingest: { available: false, runs: [] } }),
    );

    expect(
      health.checks.find((check) => check.id === 'ingest-runs'),
    ).toBeUndefined();
    expect(health.unavailable).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'expired-leases' }),
        expect.objectContaining({ id: 'ingest-runs' }),
      ]),
    );
  });

  it('fails coverage, freshness and stale scores on an empty score table', () => {
    const health = buildOperationsHealth(
      input({
        zonesTotal: 0,
        zonesScored: 0,
        scoreRows: 0,
        staleScoreRows: 0,
        latestScoreAt: null,
        species: [],
      }),
    );

    expect(health.checks.find((check) => check.id === 'coverage')?.status).toBe(
      'fail',
    );
    expect(
      health.checks.find((check) => check.id === 'freshness')?.status,
    ).toBe('fail');
    expect(
      health.checks.find((check) => check.id === 'stale-scores')?.status,
    ).toBe('fail');
    expect(health.status).toBe('fail');
  });
});
