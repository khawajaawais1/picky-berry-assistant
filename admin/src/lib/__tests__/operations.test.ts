import { describe, expect, it } from 'vitest';
import type { JobsResponse, Overview } from '../../api/types';
import { buildOperationsChecks, overallStatus } from '../operations';

const now = new Date('2026-11-22T12:00:00.000Z');

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    generated_at: now.toISOString(),
    zones: {
      total: 100,
      scored: 98,
      score_rows: 392,
      coverage_pct: 98,
      latest_score_at: '2026-11-22T10:00:00.000Z',
      stale_scores: 0,
    },
    users: {
      total: 20,
      pickers: 18,
      admins: 2,
      buyers: 0,
      new_last_7d: 2,
    },
    reports: { total: 30, last_24h: 2, last_7d: 12 },
    visits: {
      total: 15,
      accepted: 14,
      rejected: 1,
      last_24h: 1,
      last_7d: 8,
    },
    jobs: {
      queued: 0,
      running: 0,
      done: 20,
      failed: 0,
      done_7d: 10,
      failed_7d: 0,
      oldest_queued_at: null,
      overdue: 0,
    },
    species: [],
    recent_activity: [],
    ...overrides,
  };
}

function jobs(overrides: Partial<JobsResponse> = {}): JobsResponse {
  return {
    jobs: [],
    page: 1,
    page_size: 100,
    total: 0,
    counts: { all: 0, queued: 0, running: 0, done: 0, failed: 0 },
    ...overrides,
  };
}

describe('buildOperationsChecks', () => {
  it('reports a healthy pipeline when coverage, freshness and queue are healthy', () => {
    const checks = buildOperationsChecks(overview(), jobs(), now);

    expect(checks.map((check) => check.id)).toEqual([
      'coverage',
      'freshness',
      'stale-scores',
      'queue-delay',
      'job-failures',
    ]);
    expect(checks.every((check) => check.status === 'ok')).toBe(true);
  });

  it('fails coverage below 80 percent and warns between 80 and 95 percent', () => {
    const warn = buildOperationsChecks(
      overview({ zones: { ...overview().zones, coverage_pct: 88 } }),
      jobs(),
      now,
    );
    const fail = buildOperationsChecks(
      overview({ zones: { ...overview().zones, coverage_pct: 60 } }),
      jobs(),
      now,
    );

    expect(warn.find((check) => check.id === 'coverage')?.status).toBe('warn');
    expect(fail.find((check) => check.id === 'coverage')?.status).toBe('fail');
  });

  it('fails when the newest score is older than 48 hours', () => {
    const checks = buildOperationsChecks(
      overview({
        zones: {
          ...overview().zones,
          latest_score_at: '2026-11-20T10:00:00.000Z',
        },
      }),
      jobs(),
      now,
    );

    expect(checks.find((check) => check.id === 'freshness')?.status).toBe(
      'fail',
    );
  });

  it('warns when a queued job is overdue and fails when a running job has a stale lock', () => {
    const checks = buildOperationsChecks(
      overview({
        jobs: {
          ...overview().jobs,
          queued: 2,
          running: 1,
          overdue: 1,
        },
      }),
      jobs({
        jobs: [
          {
            id: 7,
            type: 'recompute_zone_score',
            payload: {},
            dedupe_key: null,
            status: 'running',
            attempts: 1,
            run_at: '2026-11-22T10:00:00.000Z',
            locked_at: '2026-11-22T10:00:00.000Z',
            finished_at: null,
            last_error: null,
            created_at: '2026-11-22T10:00:00.000Z',
          },
        ],
      }),
      now,
    );

    expect(checks.find((check) => check.id === 'queue-delay')?.status).toBe(
      'warn',
    );
    expect(checks.find((check) => check.id === 'stale-lock')?.status).toBe(
      'fail',
    );
  });

  it('reports the worst check as the overall status', () => {
    const checks = buildOperationsChecks(
      overview({
        zones: { ...overview().zones, coverage_pct: 60 },
        jobs: { ...overview().jobs, failed_7d: 4 },
      }),
      jobs(),
      now,
    );

    expect(overallStatus(checks)).toBe('fail');
  });
});
