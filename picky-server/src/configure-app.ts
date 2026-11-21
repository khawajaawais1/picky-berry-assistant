import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

/** The prefix every API route is served under, as the OpenAPI document's server names it. */
export const API_PREFIX = 'api/v1';

/**
 * Routing, request ids, the error envelope and validation: the configuration every deployment
 * and the e2e suite share, so the routes a test exercises are the routes production serves.
 *
 * Health is served at `/api/v1/health`, where the OpenAPI document lists it, and at `/health`
 * for platform probes that expect the root path. The alias rewrites the URL before Nest's router
 * sees it, so both paths run the same controller, guards and filters.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);

  app.use((request: Request, response: Response, next: NextFunction) => {
    const candidate =
      request.header('x-request-id') ??
      (request as Request & { id?: string }).id ??
      response.getHeader('x-request-id');
    const requestId =
      typeof candidate === 'string' && /^[\w-]{1,128}$/.test(candidate)
        ? candidate
        : randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  });

  app.use((request: Request, _response: Response, next: NextFunction) => {
    if (request.path === '/health') {
      const query = request.url.slice(request.path.length);
      request.url = `/${API_PREFIX}/health${query}`;
    }
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
}
