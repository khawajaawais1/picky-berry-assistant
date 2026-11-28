import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { JobsService } from './jobs.service';
import { MlClientService } from '../ml/ml-client.service';
import { MlJobsService } from './ml-jobs.service';

describe('MlJobsService report trust processing', () => {
  it('enqueues an analytics refresh after daily score finalization', async () => {
    const clientQuery = jest.fn().mockResolvedValue({ rows: [] });
    const poolQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });
    const client = { query: clientQuery, release: jest.fn() };
    const jobs = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = new MlJobsService(
      {
        pool: {
          query: poolQuery,
          connect: jest.fn().mockResolvedValue(client),
        },
      } as unknown as DbService,
      jobs as unknown as JobsService,
      {
        health: jest.fn().mockResolvedValue({ status: 'ok' }),
      } as unknown as MlClientService,
      {
        get: (_key: string, defaultValue: unknown) => defaultValue,
      } as unknown as ConfigService,
    );

    await service.handle('score_zones_daily', {
      date: '2026-11-28',
      offset: 0,
    });

    expect(jobs.enqueue).toHaveBeenCalledWith(
      'refresh_analytics',
      {},
      'refresh_analytics',
      client,
    );
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('uses the report timestamp as a timestamptz for the weekly consensus window', async () => {
    const reportId = 'c0a80101-0000-4000-8000-000000000001';
    const createdAt = new Date('2026-11-28T00:00:00.000Z');
    const report = {
      id: reportId,
      user_id: 'c0a80101-0000-4000-8000-000000000002',
      zone_id: 'c0a80101-0000-4000-8000-000000000003',
      species: 'bilberry',
      rating: 4,
      submission_id: 'c0a80101-0000-4000-8000-000000000004',
      visit_id: null,
      created_at: createdAt,
      flags: [],
      trust_processed_at: null,
      photo_count: 0,
    };
    const clientQuery = jest.fn((sql: string) => {
      if (sql.includes('SELECT trust FROM user_trust')) {
        return { rows: [{ trust: 0.5 }] };
      }
      if (sql.includes('SELECT trust_processed_at FROM reports')) {
        return { rows: [{ trust_processed_at: null }] };
      }
      if (sql.includes('SELECT avg(rating)::float AS mean')) {
        return { rows: [{ mean: null, users: 0 }] };
      }
      return { rows: [] };
    });
    const poolQuery = jest.fn().mockResolvedValue({ rows: [report] });
    const database = {
      pool: {
        query: poolQuery,
        connect: jest.fn().mockResolvedValue({
          query: clientQuery,
          release: jest.fn(),
        }),
      },
    } as unknown as DbService;
    const updateTrust = jest
      .fn()
      .mockResolvedValue({ trust: 0.5, rules_version: 'test-rules' });
    const ml = { updateTrust } as unknown as MlClientService;
    const jobs = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: (_key: string, defaultValue: unknown) => defaultValue,
    } as unknown as ConfigService;
    const service = new MlJobsService(
      database,
      jobs as unknown as JobsService,
      ml,
      config,
    );

    await service.handle('process_report', { report_id: reportId });

    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        "created_at >= $4::timestamptz - interval '7 days'",
      ),
      [report.zone_id, report.species, report.user_id, createdAt],
    );
    expect(updateTrust).toHaveBeenCalledWith(
      expect.objectContaining({ zone_consensus: null }),
    );
    expect(jobs.enqueue).toHaveBeenCalled();
  });

  it('refreshes analytics outside a transaction and advances its marker', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const service = new MlJobsService(
      { pool: { query } } as unknown as DbService,
      { enqueue: jest.fn() } as unknown as JobsService,
      {} as MlClientService,
      {
        get: (_key: string, defaultValue: unknown) => defaultValue,
      } as unknown as ConfigService,
    );

    await service.handle('refresh_analytics', {});
    await service.handle('refresh_analytics', {});

    expect(query).toHaveBeenNthCalledWith(
      1,
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_daily',
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO analytics_refresh'),
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_daily',
    );
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO analytics_refresh'),
    );
    expect(query).not.toHaveBeenCalledWith('BEGIN');
  });
});
