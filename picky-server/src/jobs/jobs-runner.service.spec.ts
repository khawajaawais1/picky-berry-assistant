import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { DbService } from '../db/db.service';
import { MlJobsService } from './ml-jobs.service';
import { JobsRunnerService } from './jobs-runner.service';

describe('JobsRunnerService', () => {
  it('logs and returns a bounded summary when a job handler throws', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ stale: false }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '12',
            type: 'process_report',
            payload: { report_id: 'private-report-data' },
            attempts: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const runner = new JobsRunnerService(
      { pool: { query } } as unknown as DbService,
      {
        handle: jest
          .fn()
          .mockRejectedValue(new Error('Report zone is missing')),
      } as unknown as MlJobsService,
      { enqueue: jest.fn() } as never,
      {
        get: (_key: string, defaultValue: unknown) => defaultValue,
      } as unknown as ConfigService,
      logger as unknown as PinoLogger,
    );

    const result = await runner.run();
    expect(result).toEqual({
      ran: 0,
      failed: 1,
      remaining: 0,
      errors: [
        {
          job_id: '12',
          type: 'process_report',
          message: 'Error: Report zone is missing',
        },
      ],
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ job_id: '12', job_type: 'process_report' }),
      'Job execution failed',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('last_error = $4'),
      expect.arrayContaining([
        '12',
        expect.any(String),
        false,
        'Error: Report zone is missing',
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('private-report-data');
  });

  it('reports a lost lease as a warning rather than a handler error', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ stale: false }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '13',
            type: 'process_report',
            payload: {},
            attempts: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ complete_job: false }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const runner = new JobsRunnerService(
      { pool: { query } } as unknown as DbService,
      { handle: jest.fn() } as unknown as MlJobsService,
      { enqueue: jest.fn() } as never,
      {
        get: (_key: string, defaultValue: unknown) => defaultValue,
      } as unknown as ConfigService,
      logger as unknown as PinoLogger,
    );

    await expect(runner.run()).resolves.toMatchObject({
      failed: 1,
      errors: [
        {
          job_id: '13',
          type: 'process_report',
          message: 'Job lease was lost before completion.',
        },
      ],
    });
    expect(logger.warn).toHaveBeenCalledWith(
      { job_id: '13', job_type: 'process_report' },
      'Job lease was lost before completion.',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
