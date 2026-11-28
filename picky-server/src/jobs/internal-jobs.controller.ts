import {
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../common/decorators/public.decorator';
import { todayInHelsinki } from '../common/dates';
import { JobsService } from './jobs.service';
import { JobRunResult, JobsRunnerService } from './jobs-runner.service';

@Controller('internal/jobs')
export class InternalJobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly runner: JobsRunnerService,
    private readonly config: ConfigService,
  ) {}

  @Get('cron')
  @Public()
  async cron(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<JobRunResult> {
    const secret = this.config.get<string>('CRON_SECRET', '');
    if (!secret || !secureEqual(authorization ?? '', `Bearer ${secret}`)) {
      throw new UnauthorizedException();
    }
    const date = todayInHelsinki();
    await this.jobs.enqueue(
      'score_zones_daily',
      { date, offset: 0 },
      `daily:${date}:0`,
    );
    return this.runner.run();
  }

  @Post('run')
  @Public()
  run(
    @Headers('x-jobs-token') token: string | undefined,
  ): Promise<JobRunResult> {
    const expected = this.config.get<string>('JOBS_RUN_TOKEN', '');
    if (!expected || !secureEqual(token ?? '', expected)) {
      throw new UnauthorizedException();
    }
    return this.runner.run();
  }
}

function secureEqual(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
