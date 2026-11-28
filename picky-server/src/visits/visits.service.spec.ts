import { getVisitRejectReason } from './visits.service';
import { VisitsService } from './visits.service';
import { DbService } from '../db/db.service';

describe('getVisitRejectReason', () => {
  const now = new Date('2026-11-17T12:00:00.000Z');

  it('prioritizes future dates over shorter-than-minimum duration', () => {
    expect(
      getVisitRejectReason(
        new Date('2026-11-17T12:04:00.000Z'),
        new Date('2026-11-17T12:06:00.000Z'),
        now,
      ),
    ).toBe('in_future');
  });

  describe('VisitsService', () => {
    it('records an accepted visit without enqueuing a score recomputation', async () => {
      const zoneId = '00000000-0000-4000-8000-000000000002';
      const visitId = '00000000-0000-4000-8000-000000000003';
      const startedAt = new Date(Date.now() - 600_000).toISOString();
      const endedAt = new Date(Date.now() - 300_000).toISOString();
      const clientQuery = jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, name FROM zones')) {
          return Promise.resolve({
            rows: [{ id: zoneId, name: 'Forest zone' }],
            rowCount: 1,
          });
        }
        if (sql.includes('SELECT 1 FROM visits')) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (sql.includes('INSERT INTO visits')) {
          return Promise.resolve({
            rows: [
              {
                id: visitId,
                user_id: '00000000-0000-4000-8000-000000000001',
                zone_id: zoneId,
                started_at: new Date(startedAt),
                ended_at: new Date(endedAt),
                duration_s: 300,
                manual: false,
                status: 'accepted',
                reject_reason: null,
              },
            ],
            rowCount: 1,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      const client = { query: clientQuery, release: jest.fn() };
      const database = {
        pool: { connect: jest.fn().mockResolvedValue(client) },
      };
      const service = new VisitsService(database as unknown as DbService);

      const created = await service.create(
        '00000000-0000-4000-8000-000000000001',
        {
          client_id: visitId,
          zone_id: zoneId,
          started_at: startedAt,
          ended_at: endedAt,
          manual: false,
        },
      );

      expect(created.statusCode).toBe(201);
      expect(created.body).toMatchObject({
        id: visitId,
        status: 'accepted',
        idempotent_replay: false,
      });
      expect(clientQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO jobs'),
        expect.anything(),
      );
      expect(clientQuery).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['00000000-0000-4000-8000-000000000001'],
      );
    });
  });

  it('accepts visits at the exact minimum and maximum durations', () => {
    expect(
      getVisitRejectReason(new Date(now.getTime() - 300_000), now, now),
    ).toBeUndefined();
    expect(
      getVisitRejectReason(new Date(now.getTime() - 36_000_000), now, now),
    ).toBeUndefined();
  });

  it('rejects invalid ranges before evaluating duration', () => {
    expect(
      getVisitRejectReason(new Date('2026-11-17T12:01:00.000Z'), now, now),
    ).toBe('invalid_range');
  });
});
