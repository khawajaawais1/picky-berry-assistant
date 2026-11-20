import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DbService } from '../db/db.service';

export interface EnqueueResult {
  job_id: number;
  status: 'queued';
  deduplicated: boolean;
}

@Injectable()
export class JobsService {
  constructor(private readonly database: DbService) {}

  async enqueue(
    type: string,
    payload: Record<string, unknown>,
    dedupeKey: string,
    transaction?: PoolClient,
  ): Promise<EnqueueResult> {
    const queryable = transaction ?? this.database.pool;
    const inserted = await queryable.query<{ id: string }>(
      `INSERT INTO jobs (type, payload, dedupe_key)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (dedupe_key) WHERE status = 'queued' DO NOTHING
       RETURNING id`,
      [type, JSON.stringify(payload), dedupeKey],
    );
    if (inserted.rows[0]) {
      return {
        job_id: Number(inserted.rows[0].id),
        status: 'queued',
        deduplicated: false,
      };
    }

    const existing = await queryable.query<{ id: string }>(
      `SELECT id FROM jobs WHERE dedupe_key = $1 AND status = 'queued'`,
      [dedupeKey],
    );
    if (!existing.rows[0]) {
      throw new InternalServerErrorException(
        'Unable to resolve queued job after de-duplication.',
      );
    }
    return {
      job_id: Number(existing.rows[0].id),
      status: 'queued',
      deduplicated: true,
    };
  }
}
