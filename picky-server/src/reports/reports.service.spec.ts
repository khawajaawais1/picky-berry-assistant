import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { ReportsService } from './reports.service';

const USER = '00000000-0000-4000-8000-000000000001';
const ZONE = '00000000-0000-4000-8000-000000000002';
const SUBMISSION_ID = '00000000-0000-4000-8000-000000000003';

function service(query: jest.Mock, clientQuery = jest.fn()) {
  const client = { query: clientQuery, release: jest.fn() };
  const database = {
    pool: { query, connect: jest.fn().mockResolvedValue(client) },
  } as unknown as DbService;
  const enqueue = jest.fn().mockResolvedValue({ status: 'queued' });
  const jobs = { enqueue } as unknown as JobsService;
  const config = {
    get: (_key: string, defaultValue: unknown) => defaultValue,
  } as unknown as ConfigService;
  return {
    reports: new ReportsService(database, jobs, config),
    enqueue,
    client,
  };
}

const input = {
  submission_id: SUBMISSION_ID,
  zone_id: ZONE,
  ratings: [{ species: 'bilberry', rating: 4, amount_l: 3 }],
};

describe('ReportsService', () => {
  it('stores a report, hides flags, and enqueues trust processing', async () => {
    const clientQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT r.*, z.name AS zone_name')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes('SELECT DISTINCT user_id FROM photos')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes('SELECT name FROM zones')) {
        return Promise.resolve({
          rows: [{ name: 'Laajavuori 1' }],
          rowCount: 1,
        });
      }
      if (sql.includes('count(DISTINCT submission_id)')) {
        return Promise.resolve({ rows: [{ count: 0 }], rowCount: 1 });
      }
      if (sql.includes('INSERT INTO reports')) {
        return Promise.resolve({
          rows: [
            {
              id: 'report-1',
              user_id: USER,
              zone_id: ZONE,
              species: 'bilberry',
              rating: 4,
              amount_l: 3,
              created_at: new Date('2026-08-20T10:00:00Z'),
              flags: ['hidden-from-response'],
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const { reports, enqueue } = service(jest.fn(), clientQuery);

    const result = await reports.submit(USER, null, input);

    expect(result.statusCode).toBe(201);
    expect(result.body).toMatchObject({
      submission_id: SUBMISSION_ID,
      reports: [
        {
          id: 'report-1',
          species: 'bilberry',
          rating: 4,
          amount_l: 3,
        },
      ],
    });
    expect(JSON.stringify(result.body)).not.toContain('hidden-from-response');
    expect(enqueue).toHaveBeenCalledWith(
      'process_report',
      { report_id: 'report-1' },
      'process:report-1',
      expect.anything(),
    );
  });

  it('replays a submission for its owner without enqueuing duplicate jobs', async () => {
    const clientQuery = jest.fn().mockImplementation((sql: string) =>
      sql.includes('SELECT r.*, z.name AS zone_name')
        ? Promise.resolve({
            rows: [
              {
                id: 'report-1',
                user_id: USER,
                species: 'bilberry',
                rating: 4,
                amount_l: null,
                created_at: new Date('2026-08-20T10:00:00Z'),
              },
            ],
            rowCount: 1,
          })
        : Promise.resolve({ rows: [], rowCount: 0 }),
    );
    const { reports, enqueue } = service(jest.fn(), clientQuery);

    const result = await reports.submit(USER, null, input);

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      submission_id: SUBMISSION_ID,
      idempotent_replay: true,
    });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('sums the season from accepted visits and unflagged harvest reports', async () => {
    const query = jest.fn().mockImplementation((sql: string) =>
      sql.includes('FROM visits')
        ? Promise.resolve({
            rows: [
              { zone_id: ZONE, duration_s: 3000 },
              { zone_id: ZONE, duration_s: 1800 },
              { zone_id: 'z2', duration_s: 2400 },
            ],
          })
        : Promise.resolve({
            rows: [
              {
                id: 'r1',
                zone_id: ZONE,
                zone_name: 'Laajavuori 1',
                species: 'bilberry',
                amount_kg: '1.50',
                minutes: 60,
                recorded_at: new Date('2026-08-20T10:00:00Z'),
                created_at: new Date('2026-08-20T10:00:00Z'),
              },
              {
                id: 'r2',
                zone_id: ZONE,
                zone_name: 'Laajavuori 1',
                species: 'bilberry',
                amount_kg: null,
                minutes: 30,
                recorded_at: null,
                created_at: new Date('2026-08-21T10:00:00Z'),
              },
            ],
          }),
    );
    const { reports } = service(query);

    const season = await reports.season(USER, 2026);

    expect(season).toMatchObject({
      year: 2026,
      visit_count: 3,
      report_count: 2,
      zones_visited: 2,
      stay_hours: 2,
      median_minutes: 40,
      harvested_kg: 1.5,
      kg_per_hour: 1.5,
    });
    expect(season.harvest_by_report).toHaveLength(1);
  });
});
