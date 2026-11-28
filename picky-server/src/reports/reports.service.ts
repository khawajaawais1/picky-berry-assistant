import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { helsinkiDayBounds } from '../common/dates';
import {
  CreateZoneFeedbackDto,
  FeedbackSubmissionDto,
} from './dto/feedback.dto';

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
  submission_id?: string;
  amount_l?: number | string | null;
  flags?: string[];
}

/** Reporters whose trust is at or above this are labelled trusted in a zone's list. */
const TRUSTED_AT = 0.6;

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
    private readonly config: ConfigService,
  ) {}

  async submit(
    userId: string,
    visitId: string | null,
    input: FeedbackSubmissionDto | CreateZoneFeedbackDto,
  ): Promise<{ statusCode: 200 | 201; body: Record<string, unknown> }> {
    const species = input.ratings.map((rating) => rating.species);
    if (new Set(species).size !== species.length) {
      throw new UnprocessableEntityException({
        error: 'DUPLICATE_SPECIES',
        message: 'Each species may appear only once per submission.',
      });
    }
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        userId,
      ]);

      const existing = await client.query<ReportRow>(
        `SELECT r.*, z.name AS zone_name FROM reports r
         JOIN zones z ON z.id = r.zone_id WHERE r.submission_id = $1`,
        [input.submission_id],
      );
      if (existing.rows.length) {
        if (existing.rows.some((row) => row.user_id !== userId)) {
          throw new ConflictException({
            error: 'SUBMISSION_CONFLICT',
            message: 'Submission identifier is already in use.',
          });
        }
        await client.query('COMMIT');
        return {
          statusCode: 200,
          body: {
            submission_id: input.submission_id,
            reports: existing.rows.map((row) => this.toFeedbackReport(row)),
            idempotent_replay: true,
          },
        };
      }

      const linkedPhotos = await client.query<{ user_id: string | null }>(
        'SELECT DISTINCT user_id FROM photos WHERE submission_id = $1',
        [input.submission_id],
      );
      if (linkedPhotos.rows.some((photo) => photo.user_id !== userId)) {
        throw new ConflictException({
          error: 'SUBMISSION_CONFLICT',
          message: 'Submission identifier is already in use.',
        });
      }

      let zoneId = 'zone_id' in input ? input.zone_id : null;
      if (visitId) {
        const visit = await client.query<{
          id: string;
          zone_id: string;
          status: string;
        }>(
          `SELECT id, zone_id, status FROM visits
           WHERE id = $1 AND user_id = $2`,
          [visitId, userId],
        );
        if (!visit.rows[0]) {
          throw new NotFoundException({
            error: 'VISIT_NOT_FOUND',
            message: 'The visit was not found.',
          });
        }
        if (visit.rows[0].status !== 'accepted') {
          throw new UnprocessableEntityException({
            error: 'VISIT_NOT_ELIGIBLE',
            message: 'Feedback requires an accepted visit.',
          });
        }
        zoneId = visit.rows[0].zone_id;
      }

      const zone = await client.query<{ name: string | null }>(
        'SELECT name FROM zones WHERE id = $1',
        [zoneId],
      );
      if (!zone.rowCount) {
        throw new NotFoundException({
          error: 'ZONE_NOT_FOUND',
          message: 'The zone was not found.',
        });
      }

      const { start, end } = helsinkiDayBounds();
      const daily = await client.query<{ count: number }>(
        `SELECT count(DISTINCT submission_id)::int AS count
         FROM reports
         WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
        [userId, start, end],
      );
      const flags =
        Number(daily.rows[0]?.count ?? 0) >=
        this.config.get<number>('MAX_REPORTS_PER_DAY', 10)
          ? ['rate_limit_day']
          : [];
      const results: ReportRow[] = [];
      for (const rating of input.ratings) {
        const reportFlags = [...flags];
        if (visitId) {
          const duplicate = await client.query(
            `SELECT 1 FROM reports
             WHERE user_id = $1 AND visit_id IS NOT NULL
               AND zone_id = $2 AND species = $3
               AND cardinality(flags) = 0
               AND created_at >= $4 AND created_at < $5
             LIMIT 1`,
            [userId, zoneId, rating.species, start, end],
          );
          if (duplicate.rowCount) reportFlags.push('duplicate_day');
        }

        const previousVisitAt = visitId
          ? (
              await client.query<{ started_at: Date }>(
                'SELECT started_at FROM visits WHERE id = $1',
                [visitId],
              )
            ).rows[0]?.started_at
          : new Date();
        const distant = await client.query<{ km: number | null }>(
          `SELECT ST_Distance(target.centroid::geography, previous.centroid::geography)
                    / 1000.0 AS km
           FROM zones target
           CROSS JOIN LATERAL (
             SELECT z.centroid
             FROM visits v JOIN zones z ON z.id = v.zone_id
             WHERE v.user_id = $1 AND v.status = 'accepted'
               AND v.started_at < $2
             ORDER BY v.started_at DESC LIMIT 1
           ) previous
           WHERE target.id = $3`,
          [userId, previousVisitAt ?? new Date(), zoneId],
        );
        if (
          distant.rows[0]?.km !== null &&
          distant.rows[0]?.km !== undefined &&
          Number(distant.rows[0].km) >
            this.config.get<number>('MAX_KM_FROM_LAST_VISIT', 50)
        ) {
          reportFlags.push('far_from_last_visit');
        }

        const inserted = await client.query<ReportRow>(
          `INSERT INTO reports
             (user_id, zone_id, species, rating, visit_id, submission_id,
              amount_l, flags, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
           ON CONFLICT DO NOTHING
           RETURNING id, user_id, zone_id, species, rating, visit_id,
                     submission_id, amount_l, created_at, recorded_at`,
          [
            userId,
            zoneId,
            rating.species,
            rating.rating,
            visitId,
            input.submission_id,
            rating.amount_l ?? null,
            reportFlags,
          ],
        );
        if (!inserted.rows[0]) {
          throw new ConflictException({
            error: 'SUBMISSION_CONFLICT',
            message: 'A report already exists for this visit and species.',
          });
        }
        results.push(inserted.rows[0]);
        await this.jobs.enqueue(
          'process_report',
          { report_id: inserted.rows[0].id },
          `process:${inserted.rows[0].id}`,
          client,
        );
      }
      await client.query('COMMIT');
      return {
        statusCode: 201,
        body: {
          submission_id: input.submission_id,
          reports: results.map((row) =>
            this.toFeedbackReport({
              ...row,
              zone_name: zone.rows[0].name,
            }),
          ),
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
        `SELECT r.id, r.species, r.rating, r.amount_kg, r.amount_l, r.minutes,
                coalesce(r.recorded_at, r.created_at) AS recorded_at, r.created_at,
                t.trust
         FROM reports r
         LEFT JOIN user_trust t ON t.user_id = r.user_id
         WHERE r.zone_id = $1 AND cardinality(r.flags) = 0 ${speciesFilter}
         ORDER BY coalesce(r.recorded_at, r.created_at) DESC
         LIMIT $2`,
        params,
      ),
      this.database.pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM reports r
        WHERE r.zone_id = $1 AND cardinality(r.flags) = 0
          AND r.created_at >= now() - interval '7 days'
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
        amount_l: row.amount_l === null ? null : Number(row.amount_l),
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
           AND cardinality(r.flags) = 0
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
      amount_l: row.amount_l == null ? null : Number(row.amount_l),
      minutes: row.minutes,
      visit_id: row.visit_id,
      recorded_at: new Date(row.recorded_at ?? row.created_at).toISOString(),
    };
  }

  private toFeedbackReport(row: ReportRow): Record<string, unknown> {
    return {
      id: row.id,
      species: row.species,
      rating: Number(row.rating),
      amount_l: row.amount_l == null ? null : Number(row.amount_l),
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}
