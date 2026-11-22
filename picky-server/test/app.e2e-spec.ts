import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB_SERVICE } from '../src/db/db.constants';
import { Pool } from 'pg';
import { JwtService } from '@nestjs/jwt';
import { configureApp } from '../src/configure-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/picky';
    process.env.DB_SSL = 'disable';
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
    process.env.DEV_AUTH_BYPASS = 'false';
    process.env.THROTTLE_DISABLED = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DB_SERVICE)
      .useValue({
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        end: jest.fn().mockResolvedValue(undefined),
      } as unknown as Pool)
      .compile();

    app = moduleFixture.createNestApplication();
    // The same configuration `main.ts` applies, so the routes tested are the routes served.
    configureApp(app);
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'e2e-health-check')
      .expect(200)
      .expect({ status: 'ok', db: 'ok' })
      .expect('x-request-id', 'e2e-health-check');
  });

  it('/api/v1/health (GET), where the OpenAPI document lists it', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', db: 'ok' });
  });

  it('serves the password reset routes publicly, validating their bodies', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/api/v1/auth/password-reset')
      .send({ email: 'not-an-email' })
      .expect(422);
    await request(server)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: 'abc', password: 'short' })
      .expect(422);
  });

  it('protects API routes without a bearer token', () => {
    return request(app.getHttpServer()).get('/api/v1/species').expect(401);
  });

  const adminReadRoutes = [
    '/api/v1/admin/overview',
    '/api/v1/admin/zones',
    '/api/v1/admin/jobs',
    '/api/v1/admin/reports',
    '/api/v1/admin/users',
    '/api/v1/admin/analytics',
    '/api/v1/admin/audit',
  ];

  it('protects every admin read route from anonymous requests', async () => {
    for (const route of adminReadRoutes) {
      await request(app.getHttpServer()).get(route).expect(401);
    }
  });

  it('rejects a picker on every admin route', async () => {
    const token = app.get(JwtService).sign({
      sub: '00000000-0000-4000-8000-000000000001',
      role: 'picker',
    });
    const server = app.getHttpServer();

    for (const route of adminReadRoutes) {
      await request(server)
        .get(route)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    }
    await request(server)
      .get('/api/v1/admin/zones/00000000-0000-4000-8000-000000000002')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(server)
      .post('/api/v1/admin/jobs/1/retry')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(server)
      .patch('/api/v1/admin/users/00000000-0000-4000-8000-000000000001/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' })
      .expect(403);
    await request(server)
      .post('/api/v1/admin/scores/recompute')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
