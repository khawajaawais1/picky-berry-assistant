import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateReportDto } from './dto/create-report.dto';

interface ReportRow {
  id: string;
  client_id: string | null;
  user_id: string | null;
  zone_id: string;
  zone_name: string | null;
  species: string;
  rating: number;
  amount_kg: string | null;
  minutes: number | null;
  visit_id: string | null;
  recorded_at: Date | null;
  created_at: Date;
}

/** Reporters whose trust is at or above this are labelled trusted in a zone's list. */
const TRUSTED_AT = 0.6;
const FUTURE_TOLERANCE_MS = 5 * 60_000;

function kilograms(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly database: DbService,
    private readonly jobs: JobsService,
  ) {}

  async create(
    userId: string,
    input: CreateReportDto,
  ): Promise<{ statusCode: 200 | 201; body: Record<string, unknown> }> {
    if (Date.parse(input.recorded_at) > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new UnprocessableEntityException({
        error: 'REPORT_IN_FUTURE',
        message: 'recorded_at is in the future.',
      });
    }

    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query<ReportRow>(
        `SELECT r.*, z.name AS zone_name FROM reports r
         JOIN zones z ON z.id = r.zone_id WHERE r.client_id = $1`,
        [input.client_id],
      );
      const replay = existing.rows[0];
      if (replay) {
        if (replay.user_id !== userId) {
          throw new ConflictException({
            error: 'REPORT_ID_CONFLICT',
            message: 'Report identifier is already in use.',
          });
        }
        await client.query('COMMIT');
        return {
          statusCode: 200,
          body: { ...this.toOwnReport(replay), idempotent_replay: true },
        };
      }

      const zone = await client.query<{ name: string | null }>(
        'SELECT name FROM zones WHERE id = $1',
        [input.zone_id],
      );
      if (!zone.rowCount) {
        throw new UnprocessableEntityException({
          error: 'ZONE_NOT_FOUND',
          message: 'The zone does not exist.',
        });
      }

      // A visit is linked only when it is the reporter's own.
      let visitId: string | null = null;
      if (input.visit_id) {
        const visit = await client.query(
          'SELECT 1 FROM visits WHERE id = $1 AND user_id = $2',
          [input.visit_id, userId],
        );
        visitId = visit.rowCount ? input.visit_id : null;
      }

      const inserted = await client.query<ReportRow>(
        `INSERT INTO reports
           (client_id, user_id, zone_id, species, rating, amount_kg, minutes, visit_id, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.client_id,
          userId,
          input.zone_id,
          input.species,
          input.rating,
          input.amount_kg ?? null,
          input.minutes ?? null,
          visitId,
          input.recorded_at,
        ],
      );
      await this.jobs.enqueue(
        'recompute_zone_score',
        { zone_id: input.zone_id },
        `recompute:${input.zone_id}`,
        client,
      );
      await client.query('COMMIT');
      return {
        statusCode: 201,
        body: {
          ...this.toOwnReport({
            ...inserted.rows[0],
            zone_name: zone.rows[0].name,
          }),
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

  /** A zone's recent reports, without who sent them: rating, harvest, trust label, time. */
  async forZone(
    zoneId: string,
    species: string | undefined,
    limit: number,
  ): Promise<Record<string, unknown>> {
    const zone = await this.database.pool.query<{ name: string | null }>(
      'SELECT name FROM zones WHERE id = $1',
      [zoneId],
    );
    if (!zone.rowCount) {
      throw new NotFoundException({
        error: 'ZONE_NOT_FOUND',
        message: 'The zone does not exist.',
      });
    }
    const params: unknown[] = [zoneId, limit];
    const speciesFilter = species ? 'AND r.species = $3' : '';
    if (species) params.push(species);

    const [rows, week] = await Promise.all([
      this.database.pool.query<ReportRow & { trust: number | null }>(
        `SELECT r.id, r.species, r.rating, r.amount_kg, r.minutes,
                coalesce(r.recorded_at, r.created_at) AS recorded_at, r.created_at,
                t.trust
         FROM reports r
         LEFT JOIN user_trust t ON t.user_id = r.user_id
         WHERE r.zone_id = $1 ${speciesFilter}
         ORDER BY coalesce(r.recorded_at, r.created_at) DESC
         LIMIT $2`,
        params,
      ),
      this.database.pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM reports r
         WHERE r.zone_id = $1 AND r.created_at >= now() - interval '7 days'
         ${species ? 'AND r.species = $2' : ''}`,
        species ? [zoneId, species] : [zoneId],
      ),
    ]);

    return {
      zone_id: zoneId,
      zone_name: zone.rows[0].name,
      count_7d: Number(week.rows[0]?.count ?? 0),
      reports: rows.rows.map((row) => ({
        id: row.id,
        species: row.species,
        rating: Number(row.rating),
        amount_kg: kilograms(row.amount_kg),
        minutes: row.minutes,
        trust:
          row.trust !== null && Number(row.trust) >= TRUSTED_AT
            ? 'trusted'
            : 'unverified',
        recorded_at: new Date(row.recorded_at!).toISOString(),
      })),
    };
  }

  async mine(userId: string, limit: number): Promise<Record<string, unknown>> {
    const rows = await this.database.pool.query<ReportRow>(
      `SELECT r.*, z.name AS zone_name FROM reports r
       JOIN zones z ON z.id = r.zone_id
       WHERE r.user_id = $1
       ORDER BY coalesce(r.recorded_at, r.created_at) DESC
       LIMIT $2`,
      [userId, limit],
    );
    return { reports: rows.rows.map((row) => this.toOwnReport(row)) };
  }

  /**
   * The picker's season: totals over their accepted visits and their reports in one calendar
   * year (Helsinki time), plus the harvest per report for the chart.
   */
  async season(
    userId: string,
    year: number = Number(
      new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/Helsinki',
        year: 'numeric',
      }).format(new Date()),
    ),
  ): Promise<Record<string, unknown>> {
    const [visits, reports] = await Promise.all([
      this.database.pool.query<{ zone_id: string; duration_s: number }>(
        `SELECT zone_id, duration_s FROM visits
         WHERE user_id = $1 AND status = 'accepted'
           AND extract(year FROM started_at AT TIME ZONE 'Europe/Helsinki') = $2`,
        [userId, year],
      ),
      this.database.pool.query<ReportRow>(
        `SELECT r.*, z.name AS zone_name FROM reports r
         JOIN zones z ON z.id = r.zone_id
         WHERE r.user_id = $1
           AND extract(year FROM coalesce(r.recorded_at, r.created_at)
                       AT TIME ZONE 'Europe/Helsinki') = $2
         ORDER BY coalesce(r.recorded_at, r.created_at)`,
        [userId, year],
      ),
    ]);

    const minutes = visits.rows.map((visit) => Number(visit.duration_s) / 60);
    const stayHours = minutes.reduce((sum, value) => sum + value, 0) / 60;
    const harvests = reports.rows.filter((row) => row.amount_kg !== null);
    const harvestedKg = harvests.reduce(
      (sum, row) => sum + Number(row.amount_kg),
      0,
    );
    const harvestMinutes = harvests.reduce(
      (sum, row) => sum + (row.minutes ?? 0),
      0,
    );
    const zones = new Set([
      ...visits.rows.map((visit) => visit.zone_id),
      ...reports.rows.map((row) => row.zone_id),
    ]);
    const medianMinutes = median(minutes);

    return {
      year,
      visit_count: visits.rows.length,
      report_count: reports.rows.length,
      zones_visited: zones.size,
      stay_hours: round1(stayHours),
      median_minutes: medianMinutes === null ? null : Math.round(medianMinutes),
      harvested_kg: round1(harvestedKg),
      kg_per_hour:
        harvestMinutes > 0 ? round1(harvestedKg / (harvestMinutes / 60)) : null,
      harvest_by_report: harvests.map((row) => ({
        report_id: row.id,
        zone_id: row.zone_id,
        zone_name: row.zone_name,
        species: row.species,
        kilograms: kilograms(row.amount_kg),
        recorded_at: new Date(row.recorded_at ?? row.created_at).toISOString(),
      })),
    };
  }

  private toOwnReport(row: ReportRow): Record<string, unknown> {
    return {
      id: row.id,
      client_id: row.client_id,
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      species: row.species,
      rating: Number(row.rating),
      amount_kg: kilograms(row.amount_kg),
      minutes: row.minutes,
      visit_id: row.visit_id,
      recorded_at: new Date(row.recorded_at ?? row.created_at).toISOString(),
    };
  }
}
