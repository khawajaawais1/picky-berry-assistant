import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import {
  startAdminIntegrationDatabase,
  resetAdminFixtures,
  type AdminFixtures,
  type AdminIntegrationDatabase,
} from './helpers/admin-integration-db';

jest.setTimeout(120_000);

type AdminMethod = 'get' | 'post' | 'patch';

interface AdminRoute {
  method: AdminMethod;
  path: string;
  status: number;
  body?: Record<string, unknown>;
}

interface ModerationReport {
  id: string;
  species: string;
  rating: number;
  user_email: string;
  trust: number;
}

interface ModerationListResponse {
  total: number;
  reports: ModerationReport[];
}

interface ZoneDetailResponse {
  reports: ModerationReport[];
}

interface RevokeSessionsResponse {
  user_id: string;
  revoked_count: number;
}

interface ProblemResponse {
  error: { code: string };
}

interface RetryResponse {
  job_id: number;
  status: string;
  deduplicated: boolean;
  source_job_id?: number;
}

interface JobListResponse {
  total: number;
  jobs: Array<{
    id: number;
    status: string;
    attempts: number;
    last_error: string | null;
  }>;
}

interface OperationsHealthResponse {
  checks: Array<{
    id: string;
    status: string;
    value: string;
    detail: string;
  }>;
}

interface AuditIntegrityRow {
  actor_id: string | null;
  reason: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  outcome: 'success' | 'failure';
  detail: Record<string, unknown>;
  request_id: string | null;
}

/**
 * The suite covers the current read-only moderation queue: feature 6.5 has not frozen
 * verdict or trust rules. Queue coverage is limited to the retry/dedupe/conflict paths
 * that the current jobs schema implements; lease/reaper tests arrive with P0.2.
 */
describe('Admin API against PostGIS (integration)', () => {
  let app: INestApplication<App>;
  let database: AdminIntegrationDatabase;
  let jwt: JwtService;
  let fixtures: AdminFixtures;
  let adminToken: string;
  let pickerToken: string;

  function adminRoutes(f: AdminFixtures): AdminRoute[] {
    return [
      { method: 'get', path: '/api/v1/admin/overview', status: 200 },
      { method: 'get', path: '/api/v1/admin/operations/health', status: 200 },
      { method: 'get', path: '/api/v1/admin/zones', status: 200 },
      {
        method: 'get',
        path: `/api/v1/admin/zones/${f.zoneId}`,
        status: 200,
      },
      { method: 'get', path: '/api/v1/admin/jobs', status: 200 },
      { method: 'get', path: '/api/v1/admin/reports', status: 200 },
      { method: 'get', path: '/api/v1/admin/users', status: 200 },
      {
        method: 'get',
        path: `/api/v1/admin/users/${f.pickerId}`,
        status: 200,
      },
      { method: 'get', path: '/api/v1/admin/analytics', status: 200 },
      { method: 'get', path: '/api/v1/admin/audit', status: 200 },
      {
        method: 'post',
        path: `/api/v1/admin/jobs/${f.failedJobId}/retry`,
        status: 202,
        body: {},
      },
      {
        method: 'post',
        path: `/api/v1/admin/users/${f.pickerId}/revoke-sessions`,
        status: 200,
        body: { reason: 'authorization matrix' },
      },
      {
        method: 'patch',
        path: `/api/v1/admin/users/${f.targetId}/role`,
        status: 200,
        body: { role: 'buyer', reason: 'authorization matrix' },
      },
      {
        method: 'post',
        path: '/api/v1/admin/scores/recompute',
        status: 202,
        body: {},
      },
    ];
  }

  function sendRoute(
    method: AdminMethod,
    path: string,
    token?: string,
    body?: Record<string, unknown>,
  ) {
    const server = app.getHttpServer();
    const req =
      method === 'get'
        ? request(server).get(path)
        : method === 'post'
          ? request(server).post(path)
          : request(server).patch(path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) req.send(body);
    return req;
  }

  beforeAll(async () => {
    database = await startAdminIntegrationDatabase();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = database.connectionString;
    process.env.DB_SSL = 'disable';
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
    process.env.DEV_AUTH_BYPASS = 'false';
    process.env.THROTTLE_DISABLED = 'true';
    process.env.CORS_ORIGINS =
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081';

    // AppModule loads ConfigModule at import time. Import it only after the container
    // URL is in process.env, otherwise a local .env would win over the throwaway DB.
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    jwt = app.get(JwtService);
    adminToken = jwt.sign({
      sub: '00000000-0000-4000-8000-0000000000a1',
      role: 'admin',
    });
    pickerToken = jwt.sign({
      sub: '00000000-0000-4000-8000-0000000000b1',
      role: 'picker',
    });
  });

  beforeEach(async () => {
    fixtures = await resetAdminFixtures(database.pool);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) {
      await database.pool.end();
      await database.container.stop();
    }
  });

  it('rejects anonymous requests on every admin route', async () => {
    for (const route of adminRoutes(fixtures)) {
      const response = await sendRoute(
        route.method,
        route.path,
        undefined,
        route.body,
      );
      expect(response.status).toBe(401);
    }
  });

  it('rejects a picker on every admin route', async () => {
    for (const route of adminRoutes(fixtures)) {
      const response = await sendRoute(
        route.method,
        route.path,
        pickerToken,
        route.body,
      );
      expect(response.status).toBe(403);
    }
  });

  it('serves every admin route to an admin and never caches the response', async () => {
    for (const route of adminRoutes(fixtures)) {
      const response = await sendRoute(
        route.method,
        route.path,
        adminToken,
        route.body,
      );
      expect(response.status).toBe(route.status);
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });

  it('rejects malformed and expired tokens', async () => {
    const server = app.getHttpServer();
    await request(server)
      .get('/api/v1/admin/overview')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);

    const expired = jwt.sign(
      {
        sub: fixtures.adminId,
        role: 'admin',
      },
      { expiresIn: -1 },
    );
    await request(server)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('allows the configured console origin and rejects a foreign origin', async () => {
    const server = app.getHttpServer();
    const allowed = await request(server)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );

    const denied = await request(server)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Origin', 'https://evil.example')
      .expect(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reads moderation reports with species, rating, trust and age filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .query({
        species: 'bilberry',
        max_rating: 2,
        max_trust: 0.5,
        days: 7,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as ModerationListResponse;
    expect(body.total).toBe(1);
    expect(body.reports).toHaveLength(1);
    const [report] = body.reports;
    expect(report).toMatchObject({
      id: fixtures.lowReportId,
      species: 'bilberry',
      rating: 2,
      user_email: 'picker@example.com',
    });
    expect(report.trust).toBeCloseTo(0.4, 5);
    expect(JSON.stringify(body)).not.toContain('token_hash');
  });

  it('shows reporter trust and evidence in the zone detail', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/zones/${fixtures.zoneId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as ZoneDetailResponse;
    expect(body.reports).toHaveLength(2);
    const lowReport = body.reports.find(
      (report) => report.id === fixtures.lowReportId,
    );
    expect(lowReport).toMatchObject({
      rating: 2,
      user_email: 'picker@example.com',
    });
    expect(lowReport?.trust).toBeCloseTo(0.4, 5);
  });

  it('revokes only active sessions and records the reason and count', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${fixtures.pickerId}/revoke-sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-request-id', 'revoke-sessions-test')
      .send({ reason: 'suspected compromise' })
      .expect(200);

    expect(response.body as RevokeSessionsResponse).toEqual({
      user_id: fixtures.pickerId,
      revoked_count: 1,
    });

    const tokens = await database.pool.query<{
      token_hash: string;
      revoked_at: Date | null;
    }>(
      `SELECT token_hash, revoked_at
       FROM refresh_tokens WHERE user_id = $1`,
      [fixtures.pickerId],
    );
    const byHash = new Map(
      tokens.rows.map((token) => [token.token_hash, token.revoked_at]),
    );
    expect(byHash.get('active-token')).not.toBeNull();
    expect(byHash.get('expired-token')).toBeNull();
    expect(byHash.get('revoked-token')).not.toBeNull();

    const audit = await database.pool.query<AuditIntegrityRow>(
      `SELECT actor_id, reason, before_data, after_data, outcome, detail, request_id
       FROM audit_log
       WHERE action = 'user.sessions_revoke' AND target_id = $1`,
      [fixtures.pickerId],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_id: fixtures.adminId,
      reason: 'suspected compromise',
      before_data: { active_sessions: 1 },
      after_data: { active_sessions: 0, revoked_count: 1 },
      outcome: 'success',
      request_id: 'revoke-sessions-test',
      detail: {
        reason: 'suspected compromise',
        revoked_count: 1,
      },
    });

    const again = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${fixtures.pickerId}/revoke-sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'repeat revoke' })
      .expect(200);
    expect((again.body as RevokeSessionsResponse).revoked_count).toBe(0);
  });

  it('records role changes with a reason and explicit before/after evidence', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${fixtures.targetId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-request-id', 'role-change-test')
      .send({ role: 'buyer', reason: 'moved to the buying team' })
      .expect(200);

    const audit = await database.pool.query<AuditIntegrityRow>(
      `SELECT actor_id, reason, before_data, after_data, outcome, detail, request_id
       FROM audit_log
       WHERE action = 'user.role' AND target_id = $1`,
      [fixtures.targetId],
    );

    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_id: fixtures.adminId,
      reason: 'moved to the buying team',
      before_data: { role: 'picker' },
      after_data: { role: 'buyer' },
      outcome: 'success',
      request_id: 'role-change-test',
    });

    const listed = await request(app.getHttpServer())
      .get('/api/v1/admin/audit')
      .query({
        actor: 'admin@example.com',
        action: 'user.role',
        request_id: 'role-change-test',
        outcome: 'success',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = listed.body as {
      total: number;
      entries: Array<{
        reason: string | null;
        before_data: Record<string, unknown> | null;
        after_data: Record<string, unknown> | null;
        outcome: string;
      }>;
    };
    expect(body.total).toBe(1);
    expect(body.entries[0]).toMatchObject({
      reason: 'moved to the buying team',
      before_data: { role: 'picker' },
      after_data: { role: 'buyer' },
      outcome: 'success',
    });
  });

  it('refuses to remove the caller’s own admin role', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${fixtures.adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'picker', reason: 'attempted self demotion' })
      .expect(409);

    expect((response.body as ProblemResponse).error.code).toBe(
      'SELF_DEMOTION_NOT_ALLOWED',
    );
    const role = await database.pool.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1',
      [fixtures.adminId],
    );
    expect(role.rows[0].role).toBe('admin');

    const audit = await database.pool.query<AuditIntegrityRow>(
      `SELECT actor_id, reason, before_data, after_data, outcome, detail
       FROM audit_log
       WHERE action = 'user.role' AND target_id = $1 AND outcome = 'failure'`,
      [fixtures.adminId],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_id: fixtures.adminId,
      reason: 'attempted self demotion',
      before_data: null,
      after_data: null,
      outcome: 'failure',
      detail: { code: 'SELF_DEMOTION_NOT_ALLOWED' },
    });
  });

  it('records a forbidden privileged attempt without changing the target', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${fixtures.targetId}/role`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .set('x-request-id', 'forbidden-role-attempt')
      .send({ role: 'admin', reason: 'trying to promote myself' })
      .expect(403);

    const audit = await database.pool.query<AuditIntegrityRow>(
      `SELECT actor_id, reason, before_data, after_data, outcome, detail, request_id
       FROM audit_log
       WHERE action = 'user.role' AND target_id = $1 AND outcome = 'failure'`,
      [fixtures.targetId],
    );

    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_id: fixtures.pickerId,
      reason: 'trying to promote myself',
      before_data: null,
      after_data: null,
      outcome: 'failure',
      request_id: 'forbidden-role-attempt',
      detail: { code: 'FORBIDDEN' },
    });
  });

  it('validates the session revoke reason before changing anything', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${fixtures.pickerId}/revoke-sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'x' })
      .expect(422);

    expect((response.body as ProblemResponse).error.code).toBe(
      'VALIDATION_ERROR',
    );
    const tokens = await database.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM refresh_tokens
       WHERE user_id = $1 AND revoked_at IS NOT NULL`,
      [fixtures.pickerId],
    );
    expect(tokens.rows[0].count).toBe(1);
  });

  it('retries a failed job once and deduplicates a repeat retry', async () => {
    const first = await request(app.getHttpServer())
      .post(`/api/v1/admin/jobs/${fixtures.failedJobId}/retry`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-request-id', 'retry-failed-job')
      .send({})
      .expect(202);

    const firstBody = first.body as RetryResponse;
    expect(firstBody).toMatchObject({
      status: 'queued',
      deduplicated: false,
      source_job_id: fixtures.failedJobId,
    });
    const queuedJobId = Number(firstBody.job_id);

    const queued = await database.pool.query<{
      status: string;
      type: string;
      dedupe_key: string;
    }>('SELECT status, type, dedupe_key FROM jobs WHERE id = $1', [
      queuedJobId,
    ]);
    expect(queued.rows[0]).toMatchObject({
      status: 'queued',
      type: 'recompute_all',
      dedupe_key: `retry:${fixtures.failedJobId}`,
    });

    const audit = await database.pool.query<{
      detail: Record<string, unknown>;
      reason: string | null;
      before_data: Record<string, unknown> | null;
      after_data: Record<string, unknown> | null;
      outcome: string;
    }>(
      `SELECT detail, reason, before_data, after_data, outcome FROM audit_log
       WHERE action = 'job.retry' AND target_id = $1`,
      [String(fixtures.failedJobId)],
    );
    expect(audit.rows[0].detail).toMatchObject({
      previous_status: 'failed',
      new_job_id: queuedJobId,
      deduplicated: false,
    });
    expect(audit.rows[0]).toMatchObject({
      reason: null,
      before_data: { status: 'failed', attempts: 2 },
      after_data: {
        status: 'queued',
        job_id: queuedJobId,
        deduplicated: false,
      },
      outcome: 'success',
    });

    const second = await request(app.getHttpServer())
      .post(`/api/v1/admin/jobs/${fixtures.failedJobId}/retry`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(202);
    expect(second.body as RetryResponse).toMatchObject({
      job_id: queuedJobId,
      status: 'queued',
      deduplicated: true,
    });
  });

  it('records explicit before/after evidence when a recompute is queued', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/scores/recompute')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-request-id', 'recompute-zone-audit')
      .send({ zone_id: fixtures.zoneId, species: 'bilberry' })
      .expect(202);
    const jobId = (response.body as RetryResponse).job_id;

    const audit = await database.pool.query<AuditIntegrityRow>(
      `SELECT actor_id, reason, before_data, after_data, outcome, detail, request_id
       FROM audit_log
       WHERE action = 'scores.recompute' AND target_id = $1`,
      [fixtures.zoneId],
    );

    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      actor_id: fixtures.adminId,
      reason: null,
      before_data: { status: 'none', job_id: null },
      after_data: {
        status: 'queued',
        job_id: jobId,
        deduplicated: false,
      },
      outcome: 'success',
      request_id: 'recompute-zone-audit',
      detail: {
        zone_id: fixtures.zoneId,
        species: 'bilberry',
        job_id: jobId,
      },
    });
  });

  it('refuses to retry running, queued or missing jobs', async () => {
    const server = app.getHttpServer();
    for (const jobId of [fixtures.runningJobId, fixtures.queuedJobId]) {
      const response = await request(server)
        .post(`/api/v1/admin/jobs/${jobId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(409);
      expect((response.body as ProblemResponse).error.code).toBe(
        'JOB_NOT_FINISHED',
      );
    }

    await request(server)
      .post('/api/v1/admin/jobs/999999/retry')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(404);

    const audit = await database.pool.query<AuditIntegrityRow>(
      `SELECT outcome, detail FROM audit_log
       WHERE action = 'job.retry' AND target_id = $1 AND outcome = 'failure'`,
      [String(fixtures.runningJobId)],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      outcome: 'failure',
      detail: { code: 'JOB_NOT_FINISHED' },
    });
  });

  it('rejects direct updates and deletes against audit rows', async () => {
    const inserted = await database.pool.query<{ id: string }>(
      `INSERT INTO audit_log (action, target_type)
       VALUES ('test.append_only', 'test') RETURNING id`,
    );
    const id = inserted.rows[0].id;

    await expect(
      database.pool.query('UPDATE audit_log SET reason = $1 WHERE id = $2', [
        'tampered',
        id,
      ]),
    ).rejects.toThrow(/append-only/i);
    await expect(
      database.pool.query('DELETE FROM audit_log WHERE id = $1', [id]),
    ).rejects.toThrow(/append-only/i);

    const row = await database.pool.query<{ reason: string | null }>(
      'SELECT reason FROM audit_log WHERE id = $1',
      [id],
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].reason).toBeNull();
  });

  it('surfaces failed and overdue work through the admin API', async () => {
    const server = app.getHttpServer();
    const failed = await request(server)
      .get('/api/v1/admin/jobs')
      .query({ status: 'failed' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const failedBody = failed.body as JobListResponse;
    expect(failedBody.total).toBe(1);
    expect(failedBody.jobs[0]).toMatchObject({
      id: fixtures.failedJobId,
      status: 'failed',
      attempts: 2,
      last_error: 'worker exploded',
    });

    const health = await request(server)
      .get('/api/v1/admin/operations/health')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const healthBody = health.body as OperationsHealthResponse;
    const queueAge = healthBody.checks.find(
      (check) => check.id === 'queue-age',
    );
    expect(queueAge).toMatchObject({
      status: 'warn',
      value: '1 overdue',
    });
    expect(queueAge?.detail).toContain('1 queued');
  });
});
