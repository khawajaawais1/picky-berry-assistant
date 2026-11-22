import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { AdminService } from './admin.service';

describe('AdminService report triage filters', () => {
  const actorId = '00000000-0000-4000-8000-000000000001';
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

  it('applies rating, trust, age and sort to the report query', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await service.listReports({
      page: 1,
      page_size: 25,
      species: 'bilberry',
      min_rating: 1,
      max_rating: 2,
      max_trust: 0.5,
      days: 7,
      sort: 'oldest',
    });

    const calls = query.mock.calls as unknown[][];
    const rowsSql = String(calls[1]?.[0]);
    const rowsParams = calls[1]?.[1] as unknown[];

    expect(rowsSql).toContain('r.rating <=');
    expect(rowsSql).toContain('COALESCE(t.trust, 0.5) <=');
    expect(rowsSql).toContain('r.created_at >=');
    expect(rowsSql).toContain('ORDER BY r.created_at ASC');
    expect(rowsParams.slice(0, 6)).toEqual([
      'bilberry',
      null,
      1,
      2,
      0.5,
      expect.any(Date),
    ]);
    expect(rowsParams).not.toContain(actorId);
  });
});
