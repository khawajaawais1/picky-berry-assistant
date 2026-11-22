import { ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { ReportsService } from './reports.service';

const USER = '00000000-0000-4000-8000-000000000001';
const ZONE = '00000000-0000-4000-8000-000000000002';
const CLIENT_ID = '00000000-0000-4000-8000-000000000003';

function service(query: jest.Mock, clientQuery = jest.fn()) {
  const client = { query: clientQuery, release: jest.fn() };
  const database = {
    pool: { query, connect: jest.fn().mockResolvedValue(client) },
  } as unknown as DbService;
  const enqueue = jest.fn().mockResolvedValue({ status: 'queued' });
  const jobs = { enqueue } as unknown as JobsService;
  return { reports: new ReportsService(database, jobs), enqueue, client };
}

const input = {
  client_id: CLIENT_ID,
  zone_id: ZONE,
  species: 'bilberry',
  rating: 4,
  amount_kg: 1.3,
  minutes: 52,
  recorded_at: new Date(Date.now() - 60_000).toISOString(),
};

describe('ReportsService', () => {
  it('stores a new report and asks for the zone score to be recomputed', async () => {
    const clientQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('WHERE r.client_id'))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes('SELECT name FROM zones'))
        return Promise.resolve({
          rows: [{ name: 'Laajavuori 1' }],
          rowCount: 1,
        });
      if (sql.includes('INSERT INTO reports'))
        return Promise.resolve({
          rows: [
            {
              id: 'r1',
              client_id: CLIENT_ID,
              user_id: USER,
              zone_id: ZONE,
              species: 'bilberry',
              rating: 4,
              amount_kg: '1.30',
              minutes: 52,
              visit_id: null,
              recorded_at: new Date(input.recorded_at),
              created_at: new Date(),
            },
          ],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const { reports, enqueue } = service(jest.fn(), clientQuery);

    const result = await reports.create(USER, input);

    expect(result.statusCode).toBe(201);
    expect(result.body).toMatchObject({
      amount_kg: 1.3,
      zone_name: 'Laajavuori 1',
      idempotent_replay: false,
    });
    expect(enqueue).toHaveBeenCalledWith(
      'recompute_zone_score',
      { zone_id: ZONE },
      `recompute:${ZONE}`,
      expect.anything(),
    );
  });

  it("refuses a client id that already belongs to someone else's report", async () => {
    const clientQuery = jest.fn().mockImplementation((sql: string) =>
      sql.includes('WHERE r.client_id')
        ? Promise.resolve({
            rows: [{ user_id: 'someone-else', zone_id: ZONE }],
            rowCount: 1,
          })
        : Promise.resolve({ rows: [], rowCount: 0 }),
    );
    const { reports, client } = service(jest.fn(), clientQuery);

    await expect(reports.create(USER, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('sums the season from accepted visits and reported harvests', async () => {
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
