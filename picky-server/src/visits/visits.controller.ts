import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthUser } from '../auth/auth-user.interface';
import { CreateVisitDto } from './dto/create-visit.dto';
import { ListVisitsQueryDto } from './dto/list-visits-query.dto';
import { VisitsService } from './visits.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async create(
    @Body() input: CreateVisitDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, unknown>> {
    const result = await this.visits.create(
      request.user.id,
      input,
      idempotencyKey,
    );
    response.status(result.statusCode);
    return result.body;
  }

  @Get()
  list(
    @Query() query: ListVisitsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.visits.list(request.user.id, query);
  }
}
