import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthUser } from '../auth/auth-user.interface';
import { SeasonQueryDto, ZoneReportsQueryDto } from './dto/create-report.dto';
import {
  CreateZoneFeedbackDto,
  FeedbackSubmissionDto,
} from './dto/feedback.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Feature 6.4: feedback without a visit, idempotent on submission_id. */
  @Post('reports')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async submitWithoutVisit(
    @Body() input: CreateZoneFeedbackDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, unknown>> {
    const result = await this.reports.submit(request.user.id, null, input);
    response.status(result.statusCode);
    return result.body;
  }

  @Post('visits/:visitId/feedback')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async submitForVisit(
    @Param('visitId', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    visitId: string,
    @Body() input: FeedbackSubmissionDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, unknown>> {
    const result = await this.reports.submit(request.user.id, visitId, input);
    response.status(result.statusCode);
    return result.body;
  }

  @Get('zones/:id/reports')
  forZone(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    zoneId: string,
    @Query() query: ZoneReportsQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.reports.forZone(zoneId, query.species, query.limit);
  }

  @Get('me/reports')
  mine(
    @Query() query: ZoneReportsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.reports.mine(request.user.id, query.limit);
  }

  /** Feature 6.8: the picker's own season figures. */
  @Get('me/season')
  season(
    @Query() query: SeasonQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.reports.season(request.user.id, query.year);
  }
}
