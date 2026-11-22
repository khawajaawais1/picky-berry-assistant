import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/environment';
import { DbModule } from './db/db.module';
import { SpeciesModule } from './species/species.module';
import { ZonesModule } from './zones/zones.module';
import { AdminModule } from './admin/admin.module';
import { AuditService } from './audit/audit.service';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { HealthService } from './health/health.service';
import { ReportsModule } from './reports/reports.module';
import { ApiThrottlerGuard } from './auth/api-throttler.guard';
import { VisitsModule } from './visits/visits.module';
import { IncomingMessage, ServerResponse } from 'node:http';

function requestPath(url: string | undefined): string {
  return url?.split('?')[0] ?? '';
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        base: null,
        timestamp: false,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req: (request: IncomingMessage & { id?: string }) => ({
            id: request.id,
            method: request.method,
            url: requestPath(request.url),
          }),
          res: (response: ServerResponse) => ({
            statusCode: response.statusCode,
          }),
          err: (error: Error) => ({ type: error.name }),
        },
        customLogLevel: (
          _request: IncomingMessage,
          response: ServerResponse,
        ) =>
          response.statusCode >= 500
            ? 'error'
            : response.statusCode >= 400
              ? 'warn'
              : 'info',
        customSuccessMessage: (
          request: IncomingMessage,
          _response: ServerResponse,
          responseTime: number,
        ) =>
          `${request.method} ${requestPath(request.url)} completed in ${responseTime}ms`,
        customErrorMessage: (
          request: IncomingMessage,
          response: ServerResponse,
        ) =>
          `${request.method} ${requestPath(request.url)} returned ${response.statusCode}`,
        genReqId: (request, response) => {
          const requestId = request.headers['x-request-id'];
          const validRequestId =
            typeof requestId === 'string' && /^[\w-]{1,128}$/.test(requestId)
              ? requestId
              : randomUUID();
          response.setHeader('x-request-id', validRequestId);
          return validRequestId;
        },
      },
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60_000,
            limit: Number(process.env.THROTTLE_LIMIT ?? 300),
            skipIf: () => process.env.THROTTLE_DISABLED === 'true',
          },
        ],
      }),
    }),
    DbModule,
    AuthModule,
    SpeciesModule,
    ZonesModule,
    AdminModule,
    ReportsModule,
    VisitsModule,
  ],
  controllers: [AppController],
  providers: [
    HealthService,
    AuditService,
    ApiExceptionFilter,
    { provide: APP_GUARD, useClass: ApiThrottlerGuard },
  ],
})
export class AppModule {}
