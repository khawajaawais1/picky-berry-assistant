import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthUser } from '../auth/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { EnqueueResult } from '../jobs/jobs.service';
import { AdminMap, AdminMapService } from './admin-map.service';
import { AdminService } from './admin.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { MapQueryDto } from './dto/map-query.dto';
import { RecomputeDto } from './dto/recompute.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { RevokeSessionsDto } from './dto/revoke-sessions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import type { OperationsHealth } from './operations-health';
import { ZonesQueryDto } from './dto/zones-query.dto';

type AdminRequest = Request & { user: AuthUser; id?: string };

function requestIdOf(request: AdminRequest): string {
  const header = request.headers['x-request-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  return request.id ?? 'unknown';
}

function requestMetaOf(request: AdminRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  const userAgent = request.headers['user-agent'];
  return {
    ip: request.ip ?? null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  };
}

/**
 * The operator surface's only door. Every route is admin-only and no-store: the data is
 * operational, includes account emails, and must never be cached by a browser or proxy.
 */
@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly adminMap: AdminMapService,
  ) {}

  @Get('overview')
  @Header('Cache-Control', 'no-store')
  overview(): Promise<Record<string, unknown>> {
    return this.admin.overview();
  }

  @Get('operations/health')
  @Header('Cache-Control', 'no-store')
  operationsHealth(): Promise<OperationsHealth> {
    return this.admin.operationsHealth();
  }

  @Get('map')
  @Header('Cache-Control', 'no-store')
  map(@Query() query: MapQueryDto): Promise<AdminMap> {
    return this.adminMap.spots(query);
  }

  @Get('zones')
  @Header('Cache-Control', 'no-store')
  listZones(@Query() query: ZonesQueryDto): Promise<Record<string, unknown>> {
    return this.admin.listZones(query);
  }

  @Get('zones/:id')
  @Header('Cache-Control', 'no-store')
  getZone(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    zoneId: string,
  ): Promise<Record<string, unknown>> {
    return this.admin.getZone(zoneId);
  }

  @Get('jobs')
  @Header('Cache-Control', 'no-store')
  listJobs(@Query() query: JobsQueryDto): Promise<Record<string, unknown>> {
    return this.admin.listJobs(query);
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  retryJob(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 422 }))
    jobId: number,
    @Req() request: AdminRequest,
  ): Promise<Record<string, unknown>> {
    const meta = requestMetaOf(request);
    return this.admin.retryJob(
      jobId,
      request.user.id,
      requestIdOf(request),
      meta.ip,
      meta.userAgent,
    );
  }

  @Get('reports')
  @Header('Cache-Control', 'no-store')
  listReports(
    @Query() query: ReportsQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.admin.listReports(query);
  }

  @Get('users')
  @Header('Cache-Control', 'no-store')
  listUsers(@Query() query: UsersQueryDto): Promise<Record<string, unknown>> {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @Header('Cache-Control', 'no-store')
  getUser(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    userId: string,
  ): Promise<Record<string, unknown>> {
    return this.admin.getUser(userId);
  }

  @Post('users/:id/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  revokeSessions(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    userId: string,
    @Body() body: RevokeSessionsDto,
    @Req() request: AdminRequest,
  ): Promise<Record<string, unknown>> {
    const meta = requestMetaOf(request);
    return this.admin.revokeSessions(
      userId,
      body.reason,
      request.user.id,
      requestIdOf(request),
      meta.ip,
      meta.userAgent,
    );
  }

  @Patch('users/:id/role')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  updateUserRole(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    userId: string,
    @Body() body: UpdateRoleDto,
    @Req() request: AdminRequest,
  ): Promise<Record<string, unknown>> {
    const meta = requestMetaOf(request);
    return this.admin.updateUserRole(
      userId,
      body,
      request.user.id,
      requestIdOf(request),
      meta.ip,
      meta.userAgent,
    );
  }

  @Get('analytics')
  @Header('Cache-Control', 'no-store')
  analytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.admin.analytics(query);
  }

  @Get('audit')
  @Header('Cache-Control', 'no-store')
  listAudit(@Query() query: AuditQueryDto): Promise<Record<string, unknown>> {
    return this.admin.listAudit(query);
  }

  @Post('scores/recompute')
  @HttpCode(HttpStatus.ACCEPTED)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  recompute(
    @Body() body: RecomputeDto = new RecomputeDto(),
    @Req() request: AdminRequest,
  ): Promise<EnqueueResult> {
    const meta = requestMetaOf(request);
    return this.admin.recompute(
      body,
      request.user.id,
      requestIdOf(request),
      meta.ip,
      meta.userAgent,
    );
  }
}
