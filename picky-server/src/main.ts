import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import compression from 'compression';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { Express, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.ALL }],
  });

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('etag', false);
  const logger = app.get(Logger);
  app.useLogger(logger);
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
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
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
  const swaggerEnabled = process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const openApiDirectory = resolve(process.cwd(), 'docs', 'openapi');
    const [zones, auth, visits] = ['zones.yaml', 'auth.yaml', 'visits.yaml'].map(
      (fileName) =>
        load(readFileSync(resolve(openApiDirectory, fileName), 'utf8')) as
          | OpenAPIObject
          | undefined,
    );
    if (!zones || !auth || !visits) {
      throw new Error('Unable to load OpenAPI contracts for Swagger UI.');
    }
    const contract: OpenAPIObject = {
      ...zones,
      paths: {
        ...zones.paths,
        ...auth.paths,
        ...visits.paths,
      },
      components: {
        ...zones.components,
        ...auth.components,
        ...visits.components,
        securitySchemes: {
          ...zones.components?.securitySchemes,
          ...auth.components?.securitySchemes,
          ...visits.components?.securitySchemes,
        },
        responses: {
          ...zones.components?.responses,
          ...auth.components?.responses,
          ...visits.components?.responses,
        },
        schemas: {
          ...zones.components?.schemas,
          ...auth.components?.schemas,
          ...visits.components?.schemas,
        },
      },
    };
    SwaggerModule.setup('docs', app, contract, { useGlobalPrefix: false });
  }
  await app.listen(Number(process.env.PORT ?? 3000));
  const port = new URL(await app.getUrl()).port;
  const localUrl = `http://localhost:${port}`;
  logger.log(`API listening at ${localUrl}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs available at ${localUrl}/docs`);
  }
}

void bootstrap();
