import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { AdminService } from './admin.service';

const NOW = new Date('2026-11-22T12:00:00.000Z');

describe('AdminService operations health', () => {
  let service: AdminService;
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn();
    service = new AdminService(
      { pool: { query } } as unknown as DbService,
      {} as JobsService,
      {} as SpeciesService,
    );
  });

  function mockHealthyQueries(ingestAvailable = true) {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            zones_total: 100,
            zones_scored: 98,
            score_rows: 392,
            stale_score_rows: 0,
            latest_score_at: new Date('2026-11-22T10:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            code: 'bilberry',
            name_en: 'Bilberry',
            zones_scored: 98,
            latest_score_at: new Date('2026-11-22T10:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            queued: 0,
            running: 0,
            overdue: 0,
            oldest_queued_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ duplicate_groups: 0, extra_reports: 0 }],
      })
      .mockResolvedValueOnce({ rows: [{ missing_model_version: 0 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            report_rating: 0,
            score: 0,
            trust: 0,
            visit_duration: 0,
            alert_radius: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ available: ingestAvailable }] });

    if (ingestAvailable) {
      query.mockResolvedValueOnce({
        rows: [
          {
            source: 'weather',
            status: 'ok',
            started_at: new Date('2026-11-22T06:00:00.000Z'),
            finished_at: new Date('2026-11-22T06:10:00.000Z'),
            rows: 1200,
            error: null,
          },
        ],
      });
    }
  }

  it('reads the real tables and returns the server-side check set', async () => {
    mockHealthyQueries();

    const health = await service.operationsHealth(NOW);

    expect(health.status).toBe('ok');
    expect(health.generated_at).toBe(NOW.toISOString());
    expect(
      health.checks.find((check) => check.id === 'coverage'),
    ).toMatchObject({
      status: 'ok',
      value: '98%',
    });
    expect(
      health.checks.find((check) => check.id === 'ingest-runs'),
    ).toMatchObject({
      status: 'ok',
      breakdown: [expect.objectContaining({ key: 'weather' })],
    });
    const calls = query.mock.calls as unknown[][];
    const sql = calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain('FROM zone_scores_current');
    expect(sql).toContain('FROM species');
    expect(sql).toContain('FROM jobs');
    expect(sql).toContain('FROM reports');
    expect(sql).toContain("explanation->>'model_version'");
    expect(sql).toContain('FROM ingest_runs');
  });

  it('skips the ingest query and reports it unavailable when its table is absent', async () => {
    mockHealthyQueries(false);

    const health = await service.operationsHealth(NOW);

    expect(
      health.checks.find((check) => check.id === 'ingest-runs'),
    ).toBeUndefined();
    expect(health.unavailable).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ingest-runs' }),
        expect.objectContaining({ id: 'expired-leases' }),
      ]),
    );
    expect(
      (query.mock.calls as unknown[][]).some((call) =>
        String(call[0]).includes('FROM ingest_runs'),
      ),
    ).toBe(false);
  });
});
