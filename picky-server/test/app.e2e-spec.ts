import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB_SERVICE } from '../src/db/db.constants';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';

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
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: 0 }],
    });
    app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId =
        req.header('x-request-id') ??
        (req as Request & { id?: string }).id ??
        res.getHeader('x-request-id') ??
        randomUUID();
      res.setHeader('x-request-id', requestId);
      next();
    });
    app.useGlobalFilters(app.get(ApiExceptionFilter));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: 422,
      }),
    );
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

  it('protects API routes without a bearer token', () => {
    return request(app.getHttpServer()).get('/api/v1/species').expect(401);
  });

  it('rejects a picker on the admin recompute route', async () => {
    const token = app.get(JwtService).sign({
      sub: '00000000-0000-4000-8000-000000000001',
      role: 'picker',
    });
    await request(app.getHttpServer())
      .post('/api/v1/admin/scores/recompute')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
