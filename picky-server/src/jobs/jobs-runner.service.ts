import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { DbService } from '../db/db.service';
import { MlJobsService } from './ml-jobs.service';

export interface JobRunFailure {
  job_id: string;
  type: string;
  message: string;
}

export interface JobRunResult {
  ran: number;
  failed: number;
  remaining: number;
  errors: JobRunFailure[];
}

interface ClaimedJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

@Injectable()
export class JobsRunnerService {
  constructor(
    private readonly database: DbService,
    private readonly handlers: MlJobsService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JobsRunnerService.name);
  }

  async run(): Promise<JobRunResult> {
    const workerId = randomUUID();
    const stopAt =
      Date.now() + this.config.get<number>('JOBS_RUN_BUDGET_MS', 40_000);
    let ran = 0;
    let failed = 0;
    const errors: JobRunFailure[] = [];
    while (Date.now() < stopAt) {
      const claimed = await this.database.pool.query<ClaimedJob>(
        'SELECT id, type, payload, attempts FROM claim_job($1, 300)',
        [workerId],
      );
      const job = claimed.rows[0];
      if (!job) break;
      try {
        await this.handlers.handle(job.type, job.payload);
        const completed = await this.database.pool.query<{
          complete_job: boolean;
        }>('SELECT complete_job($1, $2)', [job.id, workerId]);
        if (!completed.rows[0]?.complete_job) {
          failed += 1;
          const failure: JobRunFailure = {
            job_id: job.id,
            type: job.type,
            message: 'Job lease was lost before completion.',
          };
          errors.push(failure);
          this.logger.warn(
            { job_id: job.id, job_type: job.type },
            failure.message,
          );
          continue;
        }
        ran += 1;
      } catch (error) {
        failed += 1;
        const message = describeError(error);
        errors.push({ job_id: job.id, type: job.type, message });
        this.logger.error(
          {
            err: error,
            job_id: job.id,
            job_type: job.type,
            attempts: job.attempts,
          },
          'Job execution failed',
        );
        await this.recordFailure(job, workerId, error, message);
      }
    }
    const remaining = await this.database.pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM jobs
       WHERE status = 'queued' AND run_at <= now()`,
    );
    return {
      ran,
      failed,
      remaining: Number(remaining.rows[0]?.count ?? 0),
      errors,
    };
  }

  private async recordFailure(
    job: ClaimedJob,
    workerId: string,
    error: unknown,
    message: string,
  ): Promise<void> {
    const permanent = error instanceof BadGatewayException;
    const terminal = permanent || job.attempts >= 3;
    await this.database.pool.query(
      `UPDATE jobs
       SET status = CASE WHEN $3 THEN 'failed' ELSE 'queued' END,
           run_at = CASE WHEN $3 THEN run_at
                         ELSE now() + make_interval(mins => attempts * 2) END,
           finished_at = CASE WHEN $3 THEN now() ELSE NULL END,
           locked_at = NULL, worker_id = NULL, heartbeat_at = NULL,
           lease_expires_at = NULL, last_error = $4
       WHERE id = $1 AND status = 'running' AND worker_id = $2
         AND lease_expires_at > now()`,
      [job.id, workerId, terminal, message.slice(0, 4000)],
    );
  }
}

function describeError(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response.slice(0, 1000);
    if (isRecord(response)) {
      const message = response.message;
      if (typeof message === 'string') return message.slice(0, 1000);
      if (
        Array.isArray(message) &&
        message.every((item) => typeof item === 'string')
      ) {
        return message.join('; ').slice(0, 1000);
      }
    }
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 1000);
  }
  return String(error).slice(0, 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
