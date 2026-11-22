import { Controller, Get, Header, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth/auth-user.interface';
import { AlertsQueryDto } from './alerts.dto';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @Query() query: AlertsQueryDto,
    @Req() request: Request & { user: AuthUser },
  ): Promise<Record<string, unknown>> {
    return this.alerts.list(
      request.user.id,
      { lat: query.lat, lng: query.lng },
      query.limit,
    );
  }
}
