import { NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { AdminService } from './admin.service';

describe('AdminService account investigation', () => {
  const userId = '00000000-0000-4000-8000-000000000010';
  let service: AdminService;
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn();
    service = new AdminService(
      {
        pool: {
          query,
          connect: jest.fn(),
        },
      } as unknown as DbService,
      {} as JobsService,
      {} as SpeciesService,
    );
  });

  it('returns one account with sessions, reports, visits and audit without token hashes', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'picker@example.com',
            nickname: 'Picker',
            role: 'picker',
            lang: 'en',
            privacy_level: 'private',
            email_verified_at: new Date('2026-11-01T10:00:00.000Z'),
            created_at: new Date('2026-10-01T10:00:00.000Z'),
            trust: 0.62,
            reports_total: 3,
            visits_total: 2,
            last_sign_in: new Date('2026-11-22T09:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'session-1',
            created_at: new Date('2026-11-22T09:00:00.000Z'),
            expires_at: new Date('2026-11-23T09:00:00.000Z'),
            user_agent: 'Safari',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            zone_id: 'zone-1',
            zone_name: 'Laajavuori',
            zone_h3: '8811964d9dfffff',
            species: 'bilberry',
            rating: 4,
            created_at: new Date('2026-11-20T09:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'visit-1',
            zone_id: 'zone-1',
            zone_name: 'Laajavuori',
            zone_h3: '8811964d9dfffff',
            status: 'accepted',
            manual: false,
            started_at: new Date('2026-11-20T08:00:00.000Z'),
            duration_s: 3600,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '9',
            actor_id: userId,
            actor_email: 'admin@example.com',
            action: 'user.sessions_revoke',
            target_type: 'user',
            target_id: userId,
            detail: { reason: 'suspected compromise' },
            request_id: 'req-1',
            created_at: new Date('2026-11-22T09:05:00.000Z'),
          },
        ],
      });

    const account = await service.getUser(userId);

    expect(account).toMatchObject({
      id: userId,
      email: 'picker@example.com',
      trust: 0.62,
      sessions: [
        {
          id: 'session-1',
          user_agent: 'Safari',
        },
      ],
      reports: [{ id: 'report-1', zone_name: 'Laajavuori' }],
      visits: [{ id: 'visit-1', duration_s: 3600 }],
      audit: [{ action: 'user.sessions_revoke', request_id: 'req-1' }],
    });
    expect(JSON.stringify(account)).not.toContain('token_hash');
  });

  it('revokes every active refresh token and records the reason', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: userId, email: 'picker@example.com' }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 's1' }, { id: 's2' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const connect = jest.fn().mockResolvedValue({
      query: clientQuery,
      release: jest.fn(),
    });
    service = new AdminService(
      { pool: { query, connect } } as unknown as DbService,
      {} as JobsService,
      {} as SpeciesService,
    );

    const result = await service.revokeSessions(
      userId,
      'suspected compromise',
      '00000000-0000-4000-8000-000000000001',
      'req-revoke',
    );

    expect(result).toEqual({ user_id: userId, revoked_count: 2 });
    const calls = clientQuery.mock.calls as unknown[][];
    const auditCall = calls.find((call) =>
      String(call[0]).includes('INSERT INTO audit_log'),
    );
    expect(auditCall).toBeDefined();
    const auditParams = auditCall?.[1] as unknown[] | undefined;
    expect(JSON.parse(String(auditParams?.[4]))).toMatchObject({
      email: 'picker@example.com',
      revoked_count: 2,
      reason: 'suspected compromise',
    });
    expect(calls.at(-1)?.[0]).toBe('COMMIT');
  });

  it('refuses to revoke sessions for a missing account', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    service = new AdminService(
      {
        pool: {
          query,
          connect: jest.fn().mockResolvedValue({
            query: clientQuery,
            release: jest.fn(),
          }),
        },
      } as unknown as DbService,
      {} as JobsService,
      {} as SpeciesService,
    );

    await expect(
      service.revokeSessions(
        userId,
        'suspected compromise',
        '00000000-0000-4000-8000-000000000001',
        'req-missing',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    const calls = clientQuery.mock.calls as unknown[][];
    expect(calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
});
