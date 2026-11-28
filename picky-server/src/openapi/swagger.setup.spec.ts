import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Server } from 'node:http';
import request from 'supertest';
import { setupSwagger } from './swagger.setup';

@Module({})
class TestModule {}

describe('setupSwagger', () => {
  it('serves CDN-backed Swagger UI and the merged OpenAPI document', async () => {
    const app = await NestFactory.create(TestModule, { logger: false });
    try {
      setupSwagger(app);
      await app.init();
      const server = app.getHttpServer() as Server;

      const docs = await request(server).get('/docs');
      expect(docs.status).toBe(200);
      expect(docs.text).toContain(
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.19.0/swagger-ui-bundle.js',
      );
      expect(docs.headers['content-security-policy']).toContain(
        'https://cdn.jsdelivr.net',
      );

      const initializer = await request(server).get('/docs-init.js');
      expect(initializer.status).toBe(200);
      expect(initializer.text).toContain(
        "window.location.origin + '/docs-json'",
      );

      const spec = await request(server).get('/docs-json');
      expect(spec.status).toBe(200);
      expect(spec.text).toContain('"/auth/login"');
      expect(spec.text).toContain('"/visits"');
      expect(spec.text).toContain('"/visits/{id}/feedback"');
      expect(spec.text).toContain('"/media/analyze"');
      expect(spec.text).toContain('"/admin/ml/health"');
      expect(spec.text).toContain('"/reports"');
      expect(spec.text).toContain('"/me/analytics"');
      expect(spec.text).toContain('"/analytics/zones/{id}"');
      expect(spec.text).toContain('"/admin/analytics/refresh"');
      expect(spec.text).not.toContain('"/alerts"');
      expect(spec.text).not.toContain('"/internal/jobs/cron"');
      expect(spec.text).toContain('"/zones"');
      expect(spec.text).toContain(
        'https://picky-berry-assistant.vercel.app/api/v1',
      );
    } finally {
      await app.close();
    }
  });

  it('keeps the API bootable when the contract files are not deployed', async () => {
    const app = await NestFactory.create(TestModule, { logger: false });
    try {
      expect(setupSwagger(app, '/nonexistent/openapi')).toBe(false);
      await app.init();
      const server = app.getHttpServer() as Server;

      expect((await request(server).get('/docs')).status).toBe(404);
    } finally {
      await app.close();
    }
  });
});
