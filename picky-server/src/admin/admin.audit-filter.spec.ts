import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { AdminService } from './admin.service';

describe('AdminService audit filters', () => {
  it('searches action, actor, target and request id and applies a time window', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    const service = new AdminService(
      { pool: { query } } as unknown as DbService,
      {} as JobsService,
      {} as SpeciesService,
    );

    await service.listAudit({
      page: 2,
      page_size: 25,
      q: 'user.role',
      target_type: 'user',
      days: 30,
      actor: 'admin@example.com',
      action: 'user.role',
      request_id: 'req-123',
      outcome: 'failure',
    });

    const calls = query.mock.calls as unknown[][];
    const countSql = String(calls[0]?.[0]);
    const rowsSql = String(calls[1]?.[0]);
    const rowsParams = calls[1]?.[1] as unknown[];

    expect(countSql).toContain('u.email ILIKE');
    expect(rowsSql).toContain('a.action ILIKE');
    expect(rowsSql).toContain('a.target_id::text ILIKE');
    expect(rowsSql).toContain('a.request_id::text ILIKE');
    expect(rowsSql).toContain('a.reason ILIKE');
    expect(rowsSql).toContain('a.target_type = $2');
    expect(rowsSql).toContain('a.created_at >= $3');
    expect(rowsSql).toContain('u.email ILIKE');
    expect(rowsSql).toContain('a.outcome = $7');
    expect(rowsSql).toContain('LIMIT $8 OFFSET $9');
    expect(rowsParams[0]).toBe('user.role');
    expect(rowsParams[1]).toBe('user');
    expect(rowsParams[2]).toEqual(expect.any(Date));
    expect(rowsParams.slice(3)).toEqual([
      'admin@example.com',
      'user.role',
      'req-123',
      'failure',
      25,
      25,
    ]);
  });
});
