import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { DbService } from '../src/db/db.service';
import { JobsRunnerService } from '../src/jobs/jobs-runner.service';
import { MlJobsService } from '../src/jobs/ml-jobs.service';
import {
  ADMIN_ID,
  PICKER_ID,
  TARGET_ID,
  ZONE_ID,
  resetAdminFixtures,
  startAdminIntegrationDatabase,
  type AdminIntegrationDatabase,
} from './helpers/admin-integration-db';

jest.setTimeout(120_000);

const SECOND_ZONE_ID = '41d28714-df79-4218-8000-308bca35cd6d';

interface MyAnalyticsResponse {
  visits: {
    count: number;
    total_stay_min: number;
    median_stay_min: number | null;
    longest_stay_min: number | null;
  };
  zones_visited: {
    count: number;
    top: Array<{ zone_id: string; visits: number }>;
  };
  reports: {
    count: number;
    by_species: Array<{ species: string; count: number }>;
  };
  daily: Array<{
    date: string;
    visits: number;
    stay_min: number;
    reports: number;
  }>;
}

interface ZoneAnalyticsResponse {
  as_of: string;
  visits: Record<string, unknown>;
  reports: Record<string, unknown>;
  daily: Array<{ visits: number | null; reports: number | null }>;
}

describe('Analytics API against PostGIS (integration)', () => {
  let app: INestApplication<App>;
  let database: AdminIntegrationDatabase;
  let jwt: JwtService;
  let adminToken: string;
  let pickerToken: string;

  async function insertVisit(
    userId: string | null,
    zoneId: string | null,
    startedAt: Date,
    durationMinutes: number,
    status: 'accepted' | 'rejected' = 'accepted',
  ): Promise<void> {
    await database.pool.query(
      `INSERT INTO visits (id, user_id, zone_id, started_at, ended_at, status, reject_reason)
       VALUES (
         $1, $2, $3, $4::timestamptz,
         $4::timestamptz + make_interval(mins => $5), $6, $7
       )`,
      [
        randomUUID(),
        userId,
        zoneId,
        startedAt,
        durationMinutes,
        status,
        status === 'rejected' ? 'test_rejected' : null,
      ],
    );
  }

  async function insertReport(
    userId: string | null,
    species: 'bilberry' | 'lingonberry',
    rating: number,
    createdAt = new Date(),
    flags: string[] = [],
  ): Promise<void> {
    await database.pool.query(
      `INSERT INTO reports
         (id, submission_id, user_id, zone_id, species, rating, flags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        randomUUID(),
        userId,
        ZONE_ID,
        species,
        rating,
        flags,
        createdAt,
      ],
    );
  }

  beforeAll(async () => {
    database = await startAdminIntegrationDatabase();
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: database.connectionString,
      DB_SSL: 'disable',
      JWT_SECRET: 'test-secret-with-at-least-thirty-two-characters',
      DEV_AUTH_BYPASS: 'false',
      THROTTLE_DISABLED: 'true',
      CORS_ORIGINS: 'http://localhost:5173',
      ANALYTICS_MIN_USERS: '3',
    });

    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    jwt = app.get(JwtService);
    adminToken = jwt.sign({ sub: ADMIN_ID, role: 'admin' });
    pickerToken = jwt.sign({ sub: PICKER_ID, role: 'picker' });
  });

  beforeEach(async () => {
    await resetAdminFixtures(database.pool);
    await database.pool.query(
      `INSERT INTO zones
         (id, h3, h3_parent6, name, forest_type, fertility_class, area_km2,
          centroid, geom, source_version)
       VALUES
         ($1, '8811964d9dffffe', '8811964d9dffffe', 'Secondary zone',
          'pine', 2, 1.0, ST_SetSRID(ST_MakePoint(25.73, 62.22), 4326),
          ST_GeomFromText(
            'POLYGON((25.72 62.21,25.74 62.21,25.74 62.23,25.72 62.23,25.72 62.21))',
            4326
          ), 'analytics-test')`,
      [SECOND_ZONE_ID],
    );
  });

  afterAll(async () => {
    if (app) {
      const applicationPool = app.get(DbService).pool;
      await app.close();
      if (!applicationPool.ended) await applicationPool.end();
    }
    if (database) {
      await database.pool.end();
      await database.container.stop();
    }
  });

  it('returns zero-filled personal stats and validates query bounds', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/v1/me/analytics').expect(401);

    const response = await request(server)
      .get('/api/v1/me/analytics')
      .query({ days: 4 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = response.body as MyAnalyticsResponse;

    expect(response.headers['cache-control']).toBe('private, max-age=60');
    expect(body).toMatchObject({
      window: { days: 4, timezone: 'Europe/Helsinki' },
      visits: {
        count: 0,
        total_stay_min: 0,
        median_stay_min: null,
        longest_stay_min: null,
      },
      zones_visited: { count: 0, top: [] },
      reports: { count: 0, by_species: [] },
    });
    expect(body.daily).toHaveLength(4);
    expect(body.daily).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ visits: 0, stay_min: 0, reports: 0 }),
      ]),
    );

    for (const query of [{ days: 0 }, { days: 366 }, { top: 21 }]) {
      await request(server)
        .get('/api/v1/me/analytics')
        .query(query)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    }
  });

  it('counts only the caller’s accepted visits and includes their flagged reports', async () => {
    const now = Date.now();
    await insertVisit(
      PICKER_ID,
      ZONE_ID,
      new Date(now - 2 * 24 * 60 * 60 * 1000),
      50,
    );
    await insertVisit(
      PICKER_ID,
      SECOND_ZONE_ID,
      new Date(now - 24 * 60 * 60 * 1000),
      30,
    );
    await insertVisit(
      PICKER_ID,
      null,
      new Date(now - 12 * 60 * 60 * 1000),
      100,
      'rejected',
    );
    await insertVisit(
      TARGET_ID,
      ZONE_ID,
      new Date(now - 6 * 60 * 60 * 1000),
      90,
    );
    await insertReport(PICKER_ID, 'bilberry', 5, new Date(), ['flagged_test']);

    const response = await request(app.getHttpServer())
      .get('/api/v1/me/analytics')
      .query({ days: 30, top: 1 })
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const body = response.body as MyAnalyticsResponse;

    expect(body).toMatchObject({
      visits: {
        count: 2,
        total_stay_min: 80,
        median_stay_min: 40,
        longest_stay_min: 50,
      },
      zones_visited: {
        count: 2,
        top: [
          expect.objectContaining({
            zone_id: SECOND_ZONE_ID,
            visits: 1,
          }),
        ],
      },
      reports: { count: 2 },
    });
    expect(body.reports.by_species).toEqual([
      expect.objectContaining({ species: 'bilberry', count: 2 }),
    ]);
  });

  it('buckets visits by Helsinki date across the autumn clock change', async () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const autumnSunday = new Date(Date.UTC(year, 9, 31));
    autumnSunday.setUTCDate(autumnSunday.getUTCDate() - autumnSunday.getUTCDay());
    if (autumnSunday.getTime() > now.getTime()) {
      autumnSunday.setUTCFullYear(year - 1);
    }

    const localDate = `${autumnSunday.getUTCFullYear()}-10-${String(
      autumnSunday.getUTCDate(),
    ).padStart(2, '0')}`;
    const nextDate = new Date(
      Date.UTC(
        autumnSunday.getUTCFullYear(),
        9,
        autumnSunday.getUTCDate() + 1,
      ),
    )
      .toISOString()
      .slice(0, 10);
    await insertVisit(
      PICKER_ID,
      ZONE_ID,
      new Date(
        Date.UTC(
          autumnSunday.getUTCFullYear(),
          9,
          autumnSunday.getUTCDate(),
          21,
          30,
        ),
      ),
      30,
    );
    await insertVisit(
      PICKER_ID,
      ZONE_ID,
      new Date(
        Date.UTC(
          autumnSunday.getUTCFullYear(),
          9,
          autumnSunday.getUTCDate(),
          22,
          30,
        ),
      ),
      30,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/me/analytics')
      .query({ days: 365 })
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const body = response.body as MyAnalyticsResponse;
    const byDate = new Map(body.daily.map((row) => [row.date, row.visits]));

    expect(byDate.get(localDate)).toBe(1);
    expect(byDate.get(nextDate)).toBe(1);
  });

  it('suppresses repeat visits by one or two people and reveals the group at three', async () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000);
    for (let index = 0; index < 5; index += 1) {
      await insertVisit(PICKER_ID, ZONE_ID, recent, 20 + index);
    }

    const twoVisitors = await request(app.getHttpServer())
      .get(`/api/v1/analytics/zones/${ZONE_ID}`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const twoVisitorBody = twoVisitors.body as ZoneAnalyticsResponse;
    expect(twoVisitors.headers['cache-control']).toBe('private, max-age=300');
    expect(twoVisitorBody.visits).toEqual({ suppressed: true });

    await insertVisit(TARGET_ID, ZONE_ID, recent, 30);
    const twoVisitorAgain = await request(app.getHttpServer())
      .get(`/api/v1/analytics/zones/${ZONE_ID}`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    expect((twoVisitorAgain.body as ZoneAnalyticsResponse).visits).toEqual({
      suppressed: true,
    });

    await insertVisit(ADMIN_ID, ZONE_ID, recent, 40);
    const threeVisitors = await request(app.getHttpServer())
      .get(`/api/v1/analytics/zones/${ZONE_ID}`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const threeVisitorBody = threeVisitors.body as ZoneAnalyticsResponse;
    expect(threeVisitorBody.visits).toMatchObject({
      suppressed: false,
      count: 7,
      visitors: 3,
    });
  });

  it('suppresses reports independently, filters anonymous and flagged rows, and never exposes identities', async () => {
    await insertReport(ADMIN_ID, 'bilberry', 4);
    await insertReport(TARGET_ID, 'bilberry', 3);
    await insertReport(ADMIN_ID, 'bilberry', 1, new Date(), ['flagged_test']);
    await insertReport(null, 'lingonberry', 5);
    await insertVisit(null, ZONE_ID, new Date(), 60);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/analytics/zones/${ZONE_ID}`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const body = response.body as ZoneAnalyticsResponse;

    expect(body.visits).toEqual({ suppressed: true });
    expect(body.reports).toMatchObject({
      suppressed: false,
      count: 4,
      reporters: 3,
      by_species: [{ species: 'bilberry', reports: 3 }],
    });
    expect(body.daily.length).toBe(30);
    expect(body.daily[0]?.visits).toBeNull();
    expect(typeof body.daily[0]?.reports).toBe('number');

    const serialized = JSON.stringify(body);
    for (const privateValue of [
      ADMIN_ID,
      PICKER_ID,
      TARGET_ID,
      'admin@example.com',
      'picker@example.com',
      'target@example.com',
      'Admin',
      'Picker',
      'Target',
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it('serves live summaries before refreshed daily data, then advances the view marker', async () => {
    await database.pool.query('DELETE FROM reports');
    await database.pool.query('DELETE FROM visits');
    await database.pool.query(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_daily',
    );
    await database.pool.query(
      `UPDATE analytics_refresh SET refreshed_at = now() - interval '1 day'
       WHERE name = 'mv_zone_daily'`,
    );

    const recent = new Date(Date.now() - 60 * 60 * 1000);
    for (const userId of [PICKER_ID, TARGET_ID, ADMIN_ID]) {
      await insertVisit(userId, ZONE_ID, recent, 30);
      await insertReport(userId, 'bilberry', 4);
    }
    await insertVisit(null, ZONE_ID, recent, 60);
    await insertReport(null, 'lingonberry', 1);
    await insertReport(ADMIN_ID, 'lingonberry', 1, new Date(), ['flagged_test']);

    const before = await request(app.getHttpServer())
      .get(`/api/v1/analytics/zones/${ZONE_ID}`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const beforeBody = before.body as ZoneAnalyticsResponse;
    expect(beforeBody.visits).toMatchObject({ count: 3 });
    expect(beforeBody.reports).toMatchObject({ count: 3 });
    expect(beforeBody.daily).toHaveLength(30);
    expect(
      beforeBody.daily.reduce(
        (sum: number, row: { visits: number | null }) =>
          sum + (row.visits ?? 0),
        0,
      ),
    ).toBe(0);
    expect(
      beforeBody.daily.reduce(
        (sum: number, row: { reports: number | null }) =>
          sum + (row.reports ?? 0),
        0,
      ),
    ).toBe(0);

    await app.get(MlJobsService).handle('refresh_analytics', {});
    const after = await request(app.getHttpServer())
      .get(`/api/v1/analytics/zones/${ZONE_ID}`)
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(200);
    const afterBody = after.body as ZoneAnalyticsResponse;

    expect(new Date(afterBody.as_of).getTime()).toBeGreaterThan(
      new Date(beforeBody.as_of).getTime(),
    );
    expect(
      afterBody.daily.reduce(
        (sum: number, row: { visits: number | null }) =>
          sum + (row.visits ?? 0),
        0,
      ),
    ).toBe(3);
    expect(
      afterBody.daily.reduce(
        (sum: number, row: { reports: number | null }) =>
          sum + (row.reports ?? 0),
        0,
      ),
    ).toBe(3);
  });

  it('refreshes lazily when stale and does not enqueue when fresh', async () => {
    await database.pool.query('TRUNCATE TABLE jobs RESTART IDENTITY CASCADE');
    await database.pool.query(
      `UPDATE analytics_refresh SET refreshed_at = now() - interval '2 hours'
       WHERE name = 'mv_zone_daily'`,
    );

    const runner = app.get(JobsRunnerService);
    await runner.run();
    for (let index = 0; index < 10; index += 1) await runner.run();

    const refreshedJobs = await database.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM jobs WHERE type = 'refresh_analytics'`,
    );
    expect(refreshedJobs.rows[0].count).toBe(1);

    await database.pool.query('TRUNCATE TABLE jobs RESTART IDENTITY CASCADE');
    await runner.run();
    const freshJobs = await database.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM jobs WHERE type = 'refresh_analytics'`,
    );
    expect(freshJobs.rows[0].count).toBe(0);
  });

  it('returns 404 for an unknown zone and 422 for a malformed id', async () => {
    const server = app.getHttpServer();
    await request(server)
      .get('/api/v1/analytics/zones/41d28714-df79-4218-8000-308bca35cd99')
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(404);
    await request(server)
      .get('/api/v1/analytics/zones/not-a-uuid')
      .set('Authorization', `Bearer ${pickerToken}`)
      .expect(422);
  });
});
