import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth/auth-user.interface';
import { AnalyticsService } from './analytics.service';
import {
  MyAnalyticsQueryDto,
  ZoneAnalyticsQueryDto,
} from './dto/analytics-query.dto';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('me/analytics')
  @Header('Cache-Control', 'private, max-age=60')
  mine(
    @Query() query: MyAnalyticsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.analytics.mine(request.user.id, query.days, query.top);
  }

  @Get('analytics/zones/:id')
  @Header('Cache-Control', 'private, max-age=300')
  zone(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    zoneId: string,
    @Query() query: ZoneAnalyticsQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.analytics.zone(zoneId, query.days);
  }
}
