import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import compression from 'compression';
import helmet from 'helmet';
import { Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { setupSwagger } from './openapi/swagger.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('etag', false);
  const logger = app.get(Logger);
  app.useLogger(logger);
  configureApp(app);
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: '*' });
  setupSwagger(app);

  await app.listen(Number(process.env.PORT ?? 3000));
  const port = new URL(await app.getUrl()).port;
  const localUrl = `http://localhost:${port}`;
  logger.log(`API listening at ${localUrl}`);
  logger.log(`Swagger docs available at ${localUrl}/docs`);
}

void bootstrap();
