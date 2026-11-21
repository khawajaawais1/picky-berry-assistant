import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import compression from 'compression';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { Express, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { setupSwagger } from './openapi/swagger.setup';

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
  app.enableCors({ origin: '*' });
  app.useGlobalFilters(app.get(ApiExceptionFilter));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 422,
    }),
  );
  setupSwagger(app);

  await app.listen(Number(process.env.PORT ?? 3000));
  const port = new URL(await app.getUrl()).port;
  const localUrl = `http://localhost:${port}`;
  logger.log(`API listening at ${localUrl}`);
  logger.log(`Swagger docs available at ${localUrl}/docs`);
}

void bootstrap();
