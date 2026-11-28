import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryResultRow } from 'pg';
import { helsinkiWindowBounds } from '../common/dates';
import { minimumAnalyticsUsers } from '../common/minimum-analytics-users';
import { DbService } from '../db/db.service';

interface MyVisitSummary extends QueryResultRow {
  count: number;
  zones_visited: number;
  total_stay_min: number;
  median_stay_min: number | null;
  longest_stay_min: number | null;
}

interface MyZoneRow extends QueryResultRow {
  zone_id: string;
  zone_name: string | null;
  visits: number;
  median_stay_min: number;
  last_visit_at: Date;
}

interface MySpeciesRow extends QueryResultRow {
  species: string;
  count: number;
  avg_rating: number | null;
}

interface MyDailyRow extends QueryResultRow {
  date: string;
  visits: number;
  stay_min: number;
  reports: number;
}

interface MyReportCount extends QueryResultRow {
  count: number;
}

interface ZoneRow extends QueryResultRow {
  id: string;
  name: string | null;
}

interface ZoneVisitSummary extends QueryResultRow {
  count: number;
  visitors: number;
  median_stay_min: number | null;
}

interface ZoneReportSummary extends QueryResultRow {
  count: number;
  reporters: number;
  avg_rating: number | null;
}

interface ZoneSpeciesRow extends QueryResultRow {
  species: string;
  reports: number;
  avg_rating: number | null;
}

interface ZoneDailyRow extends QueryResultRow {
  date: string;
  visits: number;
  reports: number;
}

interface RefreshRow extends QueryResultRow {
  refreshed_at: Date;
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function asNumber(value: number | string): number {
  return Number(value);
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly database: DbService,
    private readonly config: ConfigService,
  ) {}

  async mine(
    userId: string,
    days: number,
    top: number,
  ): Promise<Record<string, unknown>> {
    const bounds = helsinkiWindowBounds(days);
    const [visits, zones, reportCount, species, daily] = await Promise.all([
      this.database.pool.query<MyVisitSummary>(
        `SELECT count(*)::int AS count,
                count(DISTINCT zone_id)::int AS zones_visited,
                COALESCE(round(sum(duration_s)::numeric / 60, 1), 0)::float8
                  AS total_stay_min,
                round((percentile_cont(0.5) WITHIN GROUP
                  (ORDER BY duration_s) / 60)::numeric, 1)::float8
                  AS median_stay_min,
                round(max(duration_s)::numeric / 60, 1)::float8
                  AS longest_stay_min
         FROM visits
         WHERE user_id = $1 AND status = 'accepted'
           AND started_at >= $2 AND started_at < $3`,
        [userId, bounds.start, bounds.end],
      ),
      this.database.pool.query<MyZoneRow>(
        `SELECT v.zone_id, z.name AS zone_name, count(*)::int AS visits,
                round((percentile_cont(0.5) WITHIN GROUP
                  (ORDER BY v.duration_s) / 60)::numeric, 1)::float8
                  AS median_stay_min,
                max(v.started_at) AS last_visit_at
         FROM visits v
         JOIN zones z ON z.id = v.zone_id
         WHERE v.user_id = $1 AND v.status = 'accepted'
           AND v.started_at >= $2 AND v.started_at < $3
         GROUP BY v.zone_id, z.name
         ORDER BY visits DESC, last_visit_at DESC
         LIMIT $4`,
        [userId, bounds.start, bounds.end, top],
      ),
      this.database.pool.query<MyReportCount>(
        `SELECT count(*)::int AS count
         FROM reports
         WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
        [userId, bounds.start, bounds.end],
      ),
      this.database.pool.query<MySpeciesRow>(
        `SELECT species, count(*)::int AS count,
                round(avg(rating)::numeric, 1)::float8 AS avg_rating
         FROM reports
         WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
         GROUP BY species ORDER BY species`,
        [userId, bounds.start, bounds.end],
      ),
      this.database.pool.query<MyDailyRow>(
        `WITH calendar AS (
           SELECT generate_series($4::date, $5::date, interval '1 day')::date AS day
         ), visit_daily AS (
           SELECT (started_at AT TIME ZONE 'Europe/Helsinki')::date AS day,
                  count(*)::int AS visits,
                  round(sum(duration_s)::numeric / 60, 1)::float8 AS stay_min
           FROM visits
           WHERE user_id = $1 AND status = 'accepted'
             AND started_at >= $2 AND started_at < $3
           GROUP BY day
         ), report_daily AS (
           SELECT (created_at AT TIME ZONE 'Europe/Helsinki')::date AS day,
                  count(*)::int AS reports
           FROM reports
           WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
           GROUP BY day
         )
         SELECT to_char(c.day, 'YYYY-MM-DD') AS date,
                COALESCE(v.visits, 0)::int AS visits,
                COALESCE(v.stay_min, 0)::float8 AS stay_min,
                COALESCE(r.reports, 0)::int AS reports
         FROM calendar c
         LEFT JOIN visit_daily v ON v.day = c.day
         LEFT JOIN report_daily r ON r.day = c.day
         ORDER BY c.day`,
        [userId, bounds.start, bounds.end, bounds.fromDay, bounds.toDay],
      ),
    ]);

    const visitSummary = visits.rows[0];
    if (!visitSummary) {
      throw new InternalServerErrorException(
        'Unable to calculate visit analytics.',
      );
    }
    return {
      window: {
        days,
        from: bounds.fromDay,
        to: bounds.toDay,
        timezone: 'Europe/Helsinki',
      },
      visits: {
        count: asNumber(visitSummary.count),
        total_stay_min: asNumber(visitSummary.total_stay_min),
        median_stay_min: nullableNumber(visitSummary.median_stay_min),
        longest_stay_min: nullableNumber(visitSummary.longest_stay_min),
      },
      zones_visited: {
        count: asNumber(visitSummary.zones_visited),
        top: zones.rows.map((row) => ({
          zone_id: row.zone_id,
          zone_name: row.zone_name,
          visits: asNumber(row.visits),
          median_stay_min: asNumber(row.median_stay_min),
          last_visit_at: new Date(row.last_visit_at).toISOString(),
        })),
      },
      reports: {
        count: asNumber(reportCount.rows[0]?.count ?? 0),
        by_species: species.rows.map((row) => ({
          species: row.species,
          count: asNumber(row.count),
          avg_rating: nullableNumber(row.avg_rating),
        })),
      },
      daily: daily.rows.map((row) => ({
        date: row.date,
        visits: asNumber(row.visits),
        stay_min: asNumber(row.stay_min),
        reports: asNumber(row.reports),
      })),
    };
  }

  async zone(zoneId: string, days: number): Promise<Record<string, unknown>> {
    const bounds = helsinkiWindowBounds(days);
    const minimumUsers = minimumAnalyticsUsers(this.config);
    const zone = await this.database.pool.query<ZoneRow>(
      'SELECT id, name FROM zones WHERE id = $1',
      [zoneId],
    );
    const zoneRow = zone.rows[0];
    if (!zoneRow) throw new NotFoundException('Zone not found.');

    const [visits, reports, refresh] = await Promise.all([
      this.database.pool.query<ZoneVisitSummary>(
        `SELECT count(*)::int AS count,
                count(DISTINCT user_id)::int AS visitors,
                round((percentile_cont(0.5) WITHIN GROUP
                  (ORDER BY duration_s) / 60)::numeric, 1)::float8
                  AS median_stay_min
         FROM visits
         WHERE zone_id = $1 AND status = 'accepted' AND user_id IS NOT NULL
           AND started_at >= $2 AND started_at < $3`,
        [zoneId, bounds.start, bounds.end],
      ),
      this.database.pool.query<ZoneReportSummary>(
        `SELECT count(*)::int AS count,
                count(DISTINCT user_id)::int AS reporters,
                round(avg(rating)::numeric, 1)::float8 AS avg_rating
         FROM reports
         WHERE zone_id = $1 AND cardinality(flags) = 0 AND user_id IS NOT NULL
           AND created_at >= $2 AND created_at < $3`,
        [zoneId, bounds.start, bounds.end],
      ),
      this.database.pool.query<RefreshRow>(
        `SELECT refreshed_at FROM analytics_refresh
         WHERE name = 'mv_zone_daily'`,
      ),
    ]);
    const visitSummary = visits.rows[0];
    const reportSummary = reports.rows[0];
    const refreshedAt = refresh.rows[0]?.refreshed_at;
    if (!visitSummary || !reportSummary || !refreshedAt) {
      throw new InternalServerErrorException(
        'Analytics refresh metadata is unavailable.',
      );
    }

    const visitsVisible = asNumber(visitSummary.visitors) >= minimumUsers;
    const reportsVisible = asNumber(reportSummary.reporters) >= minimumUsers;
    const species = reportsVisible
      ? await this.database.pool.query<ZoneSpeciesRow>(
          `SELECT species, count(*)::int AS reports,
                  round(avg(rating)::numeric, 1)::float8 AS avg_rating
           FROM reports
           WHERE zone_id = $1 AND cardinality(flags) = 0
             AND user_id IS NOT NULL AND created_at >= $2 AND created_at < $3
           GROUP BY species
           HAVING count(DISTINCT user_id) >= $4
           ORDER BY species`,
          [zoneId, bounds.start, bounds.end, minimumUsers],
        )
      : { rows: [] as ZoneSpeciesRow[] };
    const daily =
      visitsVisible || reportsVisible
        ? await this.database.pool.query<ZoneDailyRow>(
            `WITH calendar AS (
               SELECT generate_series($2::date, $3::date, interval '1 day')::date AS day
             )
             SELECT to_char(c.day, 'YYYY-MM-DD') AS date,
                    COALESCE(m.visits, 0)::int AS visits,
                    COALESCE(m.reports, 0)::int AS reports
             FROM calendar c
             LEFT JOIN mv_zone_daily m ON m.zone_id = $1 AND m.day = c.day
             ORDER BY c.day`,
            [zoneId, bounds.fromDay, bounds.toDay],
          )
        : { rows: [] as ZoneDailyRow[] };

    return {
      zone_id: zoneRow.id,
      zone_name: zoneRow.name,
      window: {
        days,
        from: bounds.fromDay,
        to: bounds.toDay,
        timezone: 'Europe/Helsinki',
      },
      as_of: new Date(refreshedAt).toISOString(),
      min_users: minimumUsers,
      visits: visitsVisible
        ? {
            suppressed: false,
            count: asNumber(visitSummary.count),
            visitors: asNumber(visitSummary.visitors),
            median_stay_min: nullableNumber(visitSummary.median_stay_min),
          }
        : { suppressed: true },
      reports: reportsVisible
        ? {
            suppressed: false,
            count: asNumber(reportSummary.count),
            reporters: asNumber(reportSummary.reporters),
            avg_rating: nullableNumber(reportSummary.avg_rating),
            by_species: species.rows.map((row) => ({
              species: row.species,
              reports: asNumber(row.reports),
              avg_rating: nullableNumber(row.avg_rating),
            })),
          }
        : { suppressed: true },
      daily: daily.rows.map((row) => ({
        date: row.date,
        visits: visitsVisible ? asNumber(row.visits) : null,
        reports: reportsVisible ? asNumber(row.reports) : null,
      })),
    };
  }
}
