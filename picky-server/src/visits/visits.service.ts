import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';
import { DbService } from '../db/db.service';
import {
  FUTURE_TOLERANCE_S,
  MAX_VISIT_S,
  MIN_VISIT_S,
} from '../config/visit-limits';
import { CreateVisitDto } from './dto/create-visit.dto';
import { ListVisitsQueryDto } from './dto/list-visits-query.dto';

type RejectReason =
  | 'invalid_range'
  | 'in_future'
  | 'too_short'
  | 'too_long'
  | 'zone_not_found'
  | 'overlap';

interface VisitRow extends QueryResultRow {
  id: string;
  zone_id: string | null;
  zone_name: string | null;
  started_at: Date;
  ended_at: Date;
  duration_s: number;
  manual: boolean;
  status: 'accepted' | 'rejected';
  reject_reason: RejectReason | null;
  user_id?: string | null;
  cursor_timestamp?: string;
}

interface VisitCursor {
  startedAt: string;
  id: string;
}

export interface CreatedVisit {
  statusCode: 200 | 201;
  body: Record<string, unknown>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cursorTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

function visitError(
  code: string,
  message: string,
): UnprocessableEntityException {
  return new UnprocessableEntityException({ error: code, message });
}

export function getVisitRejectReason(
  startedAt: Date,
  endedAt: Date,
  now: Date,
): RejectReason | undefined {
  const durationSeconds = (endedAt.getTime() - startedAt.getTime()) / 1000;
  if (endedAt.getTime() <= startedAt.getTime()) return 'invalid_range';
  if (endedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_S * 1000) {
    return 'in_future';
  }
  if (durationSeconds < MIN_VISIT_S) return 'too_short';
  if (durationSeconds > MAX_VISIT_S) return 'too_long';
  return undefined;
}

@Injectable()
export class VisitsService {
  constructor(private readonly database: DbService) {}

  async create(
    userId: string,
    input: CreateVisitDto,
    idempotencyKey?: string,
  ): Promise<CreatedVisit> {
    if (
      idempotencyKey !== undefined &&
      idempotencyKey.toLowerCase() !== input.client_id.toLowerCase()
    ) {
      throw visitError(
        'IDEMPOTENCY_KEY_MISMATCH',
        'Idempotency-Key must equal client_id.',
      );
    }

    const startedAt = new Date(input.started_at);
    const endedAt = new Date(input.ended_at);
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        userId,
      ]);

      const replay = await this.findById(client, input.client_id);
      if (replay) {
        if (replay.user_id !== userId) {
          throw new ConflictException({
            error: 'VISIT_ID_CONFLICT',
            message: 'Visit identifier is already in use.',
          });
        }
        await client.query('COMMIT');
        return {
          statusCode: 200,
          body: { ...this.toVisit(replay), idempotent_replay: true },
        };
      }

      let rejectReason = getVisitRejectReason(startedAt, endedAt, new Date());
      const zone = await client.query<{ id: string; name: string | null }>(
        'SELECT id, name FROM zones WHERE id = $1',
        [input.zone_id],
      );
      const zoneId = zone.rows[0]?.id ?? null;
      if (!rejectReason && !zoneId) rejectReason = 'zone_not_found';

      if (!rejectReason && zoneId) {
        const overlap = await client.query(
          `SELECT 1 FROM visits
           WHERE user_id = $1 AND status = 'accepted'
             AND tstzrange(started_at, ended_at, '[)')
                 && tstzrange($2::timestamptz, $3::timestamptz, '[)')
           LIMIT 1`,
          [userId, input.started_at, input.ended_at],
        );
        if (overlap.rowCount) rejectReason = 'overlap';
      }

      const inserted = await client.query<VisitRow>(
        `INSERT INTO visits
           (id, user_id, zone_id, started_at, ended_at, manual, status, reject_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING
         RETURNING id, zone_id, started_at, ended_at, duration_s, manual,
                   status, reject_reason, user_id`,
        [
          input.client_id,
          userId,
          zoneId,
          input.started_at,
          input.ended_at,
          input.manual ?? false,
          rejectReason ? 'rejected' : 'accepted',
          rejectReason ?? null,
        ],
      );
      const row = inserted.rows[0];
      if (!row) {
        const conflict = await this.findById(client, input.client_id);
        if (conflict?.user_id !== userId) {
          throw new ConflictException({
            error: 'VISIT_ID_CONFLICT',
            message: 'Visit identifier is already in use.',
          });
        }
        if (!conflict) {
          throw new Error('Visit conflict could not be resolved.');
        }
        await client.query('COMMIT');
        return {
          statusCode: 200,
          body: { ...this.toVisit(conflict), idempotent_replay: true },
        };
      }

      await client.query('COMMIT');
      return {
        statusCode: 201,
        body: {
          ...this.toVisit({ ...row, zone_name: zone.rows[0]?.name ?? null }),
          idempotent_replay: false,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(
    userId: string,
    query: ListVisitsQueryDto,
  ): Promise<Record<string, unknown>> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const values: unknown[] = [userId, query.status];
    let cursorClause = '';
    if (cursor) {
      values.push(cursor.startedAt, cursor.id);
      cursorClause = `AND (v.started_at, v.id) < ($3::timestamptz, $4::uuid)`;
    }
    values.push(query.limit + 1);
    const result = await this.database.pool.query<VisitRow>(
      `SELECT v.id, v.zone_id, z.name AS zone_name, v.started_at,
              to_char(v.started_at AT TIME ZONE 'UTC',
                      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_timestamp,
              v.ended_at,
              v.duration_s, v.manual, v.status, v.reject_reason
       FROM visits v LEFT JOIN zones z ON z.id = v.zone_id
       WHERE v.user_id = $1 AND ($2 = 'all' OR v.status = $2)
         ${cursorClause}
       ORDER BY v.started_at DESC, v.id DESC
       LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    return {
      visits: rows.map((row) => this.toVisit(row)),
      next_cursor:
        hasMore && rows.length
          ? this.encodeCursor(rows[rows.length - 1])
          : null,
    };
  }

  private async findById(
    client: PoolClient,
    visitId: string,
  ): Promise<VisitRow | undefined> {
    const result = await client.query<VisitRow>(
      `SELECT v.id, v.zone_id, z.name AS zone_name, v.started_at, v.ended_at,
              v.duration_s, v.manual, v.status, v.reject_reason, v.user_id
       FROM visits v LEFT JOIN zones z ON z.id = v.zone_id
       WHERE v.id = $1`,
      [visitId],
    );
    return result.rows[0];
  }

  private toVisit(row: VisitRow): Record<string, unknown> {
    return {
      id: row.id,
      zone_id: row.zone_id,
      zone_name: row.zone_name ?? null,
      started_at: new Date(row.started_at).toISOString(),
      ended_at: new Date(row.ended_at).toISOString(),
      duration_s: Number(row.duration_s),
      manual: row.manual,
      status: row.status,
      reject_reason: row.reject_reason,
    };
  }

  private encodeCursor(row: VisitRow): string {
    return Buffer.from(
      `${row.cursor_timestamp ?? new Date(row.started_at).toISOString()}|${row.id}`,
    ).toString('base64url');
  }

  private decodeCursor(value: string): VisitCursor {
    try {
      const decoded = Buffer.from(value, 'base64url').toString('utf8');
      if (Buffer.from(decoded).toString('base64url') !== value) {
        throw new Error('Invalid cursor encoding.');
      }
      const separator = decoded.lastIndexOf('|');
      const timestamp = decoded.slice(0, separator);
      const id = decoded.slice(separator + 1);
      if (
        separator < 0 ||
        !cursorTimestampPattern.test(timestamp) ||
        !Number.isFinite(new Date(timestamp).getTime()) ||
        !uuidPattern.test(id)
      ) {
        throw new Error('Invalid cursor value.');
      }
      return { startedAt: timestamp, id };
    } catch {
      throw visitError('INVALID_CURSOR', 'Visit cursor is invalid.');
    }
  }
}
