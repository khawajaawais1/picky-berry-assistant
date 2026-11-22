import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';
import { DbService } from '../db/db.service';
import { EnqueueResult, JobsService } from '../jobs/jobs.service';
import { SpeciesService } from '../species/species.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { PaginationDto } from './dto/pagination.dto';
import { RecomputeDto } from './dto/recompute.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { ZoneSort, ZonesQueryDto } from './dto/zones-query.dto';

const ZONE_ORDER: Record<ZoneSort, string> = {
  name: 'z.name ASC NULLS LAST, z.h3 ASC',
  score: 'best_score DESC NULLS LAST, z.name ASC NULLS LAST',
  updated: 'latest_computed_at DESC NULLS LAST, z.name ASC NULLS LAST',
  reports: 'reports_total DESC, z.name ASC NULLS LAST',
};

interface ZoneOverviewRow extends QueryResultRow {
  zones_total: number;
  zones_scored: number;
  score_rows: number;
  latest_score_at: Date | null;
  stale_scores: number;
}

interface UserOverviewRow extends QueryResultRow {
  total: number;
  pickers: number;
  admins: number;
  buyers: number;
  new_last_7d: number;
}

interface ReportOverviewRow extends QueryResultRow {
  total: number;
  last_24h: number;
  last_7d: number;
}

interface VisitOverviewRow extends QueryResultRow {
  total: number;
  accepted: number;
  rejected: number;
  last_24h: number;
  last_7d: number;
}

interface JobOverviewRow extends QueryResultRow {
  queued: number;
  running: number;
  done: number;
  failed: number;
  done_7d: number;
  failed_7d: number;
  oldest_queued_at: Date | null;
  overdue: number;
}

interface ZoneListRow extends QueryResultRow {
  id: string;
  h3: string;
  name: string | null;
  forest_type: string | null;
  area_km2: number | null;
  lat: number | null;
  lng: number | null;
  species_scored: number;
  best_score: number | null;
  latest_computed_at: Date | null;
  reports_total: number;
}

interface ZoneRow extends QueryResultRow {
  id: string;
  h3: string;
  h3_parent6: string | null;
  name: string | null;
  forest_type: string | null;
  fertility_class: string | null;
  area_km2: number | null;
  source_version: string | null;
  built_at: Date | null;
  lat: number | null;
  lng: number | null;
  geometry: unknown;
}

interface ZoneScoreRow extends QueryResultRow {
  species: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  ripeness: 'unripe' | 'ripening' | 'ripe' | 'past' | 'off_season';
  s_reports: number | null;
  s_model: number | null;
  n_eff: number | null;
  band_width: number | null;
  explanation: Record<string, unknown>;
  computed_at: Date;
}

interface ZoneSpeciesRow extends QueryResultRow {
  species: string;
  suitability: number;
  rules_version: string | null;
}

interface ZoneReportRow extends QueryResultRow {
  id: string;
  species: string;
  rating: number;
  visit_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_nickname: string | null;
  user_deleted: boolean | null;
  trust: number;
  created_at: Date;
}

interface ZoneVisitRow extends QueryResultRow {
  id: string;
  status: 'accepted' | 'rejected';
  manual: boolean;
  started_at: Date;
  ended_at: Date;
  duration_s: number;
  user_email: string | null;
}

interface ZoneJobRow extends QueryResultRow {
  id: string;
  type: string;
  status: string;
  attempts: number;
  created_at: Date;
  finished_at: Date | null;
  last_error: string | null;
}

interface JobRow extends QueryResultRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number;
  run_at: Date;
  locked_at: Date | null;
  finished_at: Date | null;
  last_error: string | null;
  created_at: Date;
}

interface ReportRow extends QueryResultRow {
  id: string;
  zone_id: string;
  zone_name: string | null;
  zone_h3: string;
  species: string;
  rating: number;
  user_id: string | null;
  user_email: string | null;
  user_nickname: string | null;
  user_deleted: boolean | null;
  trust: number;
  created_at: Date;
}

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  nickname: string | null;
  role: 'picker' | 'buyer' | 'admin';
  lang: 'fi' | 'en';
  privacy_level: 'private' | 'shared' | 'public';
  email_verified_at: Date | null;
  created_at: Date;
  trust: number;
  reports_total: number;
  visits_total: number;
  last_sign_in: Date | null;
}

interface AuditRow extends QueryResultRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: Record<string, unknown>;
  request_id: string | null;
  created_at: Date;
}

interface CountRow extends QueryResultRow {
  total: number;
}

interface SpeciesStatsRow extends QueryResultRow {
  code: string;
  name_en: string;
  name_fi: string;
  colour: string;
  zones_supported: number;
  zones_scored: number;
  avg_score: string | null;
  high_confidence: number;
  reports_7d: number;
}

interface DistributionRow extends QueryResultRow {
  species: string;
  bucket: number;
  count: number;
}

interface DailyCountRow extends QueryResultRow {
  date: string;
  count: number;
}

interface DailyJobRow extends QueryResultRow {
  date: string;
  done: number;
  failed: number;
}

interface JobStatusRow extends QueryResultRow {
  status: string;
  count: number;
}

interface TopZoneRow extends QueryResultRow {
  id: string;
  name: string | null;
  h3: string;
  reports_7d: number;
  avg_rating: string | null;
}

function asIso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dayKeys(days: number): string[] {
  const today = new Date();
  const midnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(midnight);
    day.setUTCDate(day.getUTCDate() - (days - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

@Injectable()
export class AdminService {
  constructor(
    private readonly database: DbService,
    private readonly jobs: JobsService,
    private readonly species: SpeciesService,
  ) {}

  async overview(): Promise<Record<string, unknown>> {
    const [
      zoneStats,
      userStats,
      reportStats,
      visitStats,
      jobStats,
      species,
      recentActivity,
    ] = await Promise.all([
      this.database.pool.query<ZoneOverviewRow>(
        `SELECT
           (SELECT count(*) FROM zones)::int AS zones_total,
           (SELECT count(DISTINCT zone_id) FROM zone_scores_current)::int AS zones_scored,
           (SELECT count(*) FROM zone_scores_current)::int AS score_rows,
           (SELECT max(computed_at) FROM zone_scores_current) AS latest_score_at,
           (SELECT count(*) FROM zone_scores_current
             WHERE computed_at < now() - interval '24 hours')::int AS stale_scores`,
      ),
      this.database.pool.query<UserOverviewRow>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE role = 'picker')::int AS pickers,
                count(*) FILTER (WHERE role = 'admin')::int AS admins,
                count(*) FILTER (WHERE role = 'buyer')::int AS buyers,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_last_7d
         FROM users WHERE deleted_at IS NULL`,
      ),
      this.database.pool.query<ReportOverviewRow>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last_24h,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last_7d
         FROM reports`,
      ),
      this.database.pool.query<VisitOverviewRow>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
                count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
                count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last_24h,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last_7d
         FROM visits`,
      ),
      this.database.pool.query<JobOverviewRow>(
        `SELECT count(*) FILTER (WHERE status = 'queued')::int AS queued,
                count(*) FILTER (WHERE status = 'running')::int AS running,
                count(*) FILTER (WHERE status = 'done')::int AS done,
                count(*) FILTER (WHERE status = 'failed')::int AS failed,
                count(*) FILTER (WHERE status = 'done'
                  AND finished_at >= now() - interval '7 days')::int AS done_7d,
                count(*) FILTER (WHERE status = 'failed'
                  AND finished_at >= now() - interval '7 days')::int AS failed_7d,
                min(run_at) FILTER (WHERE status = 'queued') AS oldest_queued_at,
                (SELECT count(*) FROM jobs
                  WHERE status = 'queued'
                    AND run_at < now() - interval '15 minutes')::int AS overdue
         FROM jobs`,
      ),
      this.species.list(),
      this.recentAudit(8),
    ]);

    const zones = zoneStats.rows[0];
    const coverage =
      zones.zones_total === 0
        ? 0
        : Math.round((zones.zones_scored / zones.zones_total) * 1000) / 10;

    return {
      generated_at: new Date().toISOString(),
      zones: {
        total: zones.zones_total,
        scored: zones.zones_scored,
        score_rows: zones.score_rows,
        coverage_pct: coverage,
        latest_score_at: asIso(zones.latest_score_at),
        stale_scores: zones.stale_scores,
      },
      users: userStats.rows[0],
      reports: reportStats.rows[0],
      visits: visitStats.rows[0],
      jobs: {
        ...jobStats.rows[0],
        oldest_queued_at: asIso(jobStats.rows[0].oldest_queued_at),
      },
      species: species.species,
      recent_activity: recentActivity,
    };
  }

  async listZones(query: ZonesQueryDto): Promise<Record<string, unknown>> {
    const q = (query.q ?? '').trim();
    const species = (query.species ?? '').trim() || null;
    const offset = (query.page - 1) * query.page_size;
    const orderBy = ZONE_ORDER[query.sort];

    const [total, rows] = await Promise.all([
      this.database.pool.query<CountRow>(
        `SELECT count(*)::int AS total
         FROM zones z
         WHERE ($1 = '' OR z.name ILIKE '%' || $1 || '%'
                OR z.h3 ILIKE $1 || '%' OR z.id::text = $1)
           AND ($2::text IS NULL OR EXISTS (
             SELECT 1 FROM zone_scores_current c
             WHERE c.zone_id = z.id AND c.species = $2))`,
        [q, species],
      ),
      this.database.pool.query<ZoneListRow>(
        `SELECT z.id, z.h3, z.name, z.forest_type,
                z.area_km2::float8 AS area_km2,
                ST_Y(z.centroid) AS lat, ST_X(z.centroid) AS lng,
                count(c.species)::int AS species_scored,
                max(c.score)::int AS best_score,
                max(c.computed_at) AS latest_computed_at,
                (SELECT count(*) FROM reports r WHERE r.zone_id = z.id)::int AS reports_total
         FROM zones z
         LEFT JOIN zone_scores_current c
           ON c.zone_id = z.id AND ($2::text IS NULL OR c.species = $2)
         WHERE ($1 = '' OR z.name ILIKE '%' || $1 || '%'
                OR z.h3 ILIKE $1 || '%' OR z.id::text = $1)
           AND ($2::text IS NULL OR EXISTS (
             SELECT 1 FROM zone_scores_current c2
             WHERE c2.zone_id = z.id AND c2.species = $2))
         GROUP BY z.id
         ORDER BY ${orderBy}
         LIMIT $3 OFFSET $4`,
        [q, species, query.page_size, offset],
      ),
    ]);

    return {
      zones: rows.rows.map((row) => this.mapZoneListRow(row)),
      page: query.page,
      page_size: query.page_size,
      total: total.rows[0].total,
    };
  }

  async getZone(id: string): Promise<Record<string, unknown>> {
    const zoneResult = await this.database.pool.query<ZoneRow>(
      `SELECT z.id, z.h3, z.h3_parent6, z.name, z.forest_type,
              z.fertility_class, z.area_km2::float8 AS area_km2,
              z.source_version, z.built_at,
              ST_Y(z.centroid) AS lat, ST_X(z.centroid) AS lng,
              ST_AsGeoJSON(z.geom, 6)::json AS geometry
       FROM zones z WHERE z.id = $1`,
      [id],
    );
    const zone = zoneResult.rows[0];
    if (!zone) throw new NotFoundException('Zone not found.');

    const [scores, speciesFit, reports, visits, jobs] = await Promise.all([
      this.database.pool.query<ZoneScoreRow>(
        `SELECT species, score, confidence, ripeness, s_reports, s_model,
                n_eff, band_width, explanation, computed_at
         FROM zone_scores_current WHERE zone_id = $1 ORDER BY species`,
        [id],
      ),
      this.database.pool.query<ZoneSpeciesRow>(
        `SELECT species, suitability::float8 AS suitability, rules_version
         FROM zone_species WHERE zone_id = $1 ORDER BY species`,
        [id],
      ),
      this.database.pool.query<ZoneReportRow>(
        `SELECT r.id, r.species, r.rating, r.visit_id, r.user_id,
                u.email AS user_email, u.nickname AS user_nickname,
                (u.deleted_at IS NOT NULL) AS user_deleted,
                COALESCE(t.trust, 0.5)::float8 AS trust, r.created_at
         FROM reports r
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN user_trust t ON t.user_id = r.user_id
         WHERE r.zone_id = $1
         ORDER BY r.created_at DESC LIMIT 20`,
        [id],
      ),
      this.database.pool.query<ZoneVisitRow>(
        `SELECT v.id, v.status, v.manual, v.started_at, v.ended_at,
                v.duration_s, u.email AS user_email
         FROM visits v LEFT JOIN users u ON u.id = v.user_id
         WHERE v.zone_id = $1
         ORDER BY v.started_at DESC LIMIT 20`,
        [id],
      ),
      this.database.pool.query<ZoneJobRow>(
        `SELECT id, type, status, attempts, created_at, finished_at, last_error
         FROM jobs WHERE payload->>'zone_id' = $1
         ORDER BY created_at DESC LIMIT 10`,
        [id],
      ),
    ]);

    return {
      id: zone.id,
      h3: zone.h3,
      h3_parent6: zone.h3_parent6,
      name: zone.name,
      forest_type: zone.forest_type,
      fertility_class: zone.fertility_class,
      area_km2: asNumber(zone.area_km2),
      source_version: zone.source_version,
      built_at: asIso(zone.built_at),
      centroid:
        zone.lat === null || zone.lng === null
          ? null
          : { lat: Number(zone.lat), lng: Number(zone.lng) },
      geometry: zone.geometry,
      scores: scores.rows.map((score) => ({
        species: score.species,
        score: Number(score.score),
        confidence: score.confidence,
        ripeness: score.ripeness,
        s_reports: asNumber(score.s_reports),
        s_model: asNumber(score.s_model),
        n_eff: asNumber(score.n_eff),
        band_width: asNumber(score.band_width),
        explanation: score.explanation,
        computed_at: asIso(score.computed_at),
      })),
      species_fit: speciesFit.rows.map((fit) => ({
        species: fit.species,
        suitability: Number(fit.suitability),
        rules_version: fit.rules_version,
      })),
      reports: reports.rows.map((report) => ({
        id: report.id,
        species: report.species,
        rating: Number(report.rating),
        visit_id: report.visit_id,
        user_id: report.user_id,
        user_email: report.user_email,
        user_nickname: report.user_nickname,
        user_deleted: Boolean(report.user_deleted),
        trust: Number(report.trust),
        created_at: asIso(report.created_at),
      })),
      visits: visits.rows.map((visit) => ({
        id: visit.id,
        status: visit.status,
        manual: visit.manual,
        started_at: asIso(visit.started_at),
        ended_at: asIso(visit.ended_at),
        duration_s: Number(visit.duration_s),
        user_email: visit.user_email,
      })),
      jobs: jobs.rows.map((job) => ({
        id: Number(job.id),
        type: job.type,
        status: job.status,
        attempts: Number(job.attempts),
        created_at: asIso(job.created_at),
        finished_at: asIso(job.finished_at),
        last_error: job.last_error,
      })),
    };
  }

  async listJobs(query: JobsQueryDto): Promise<Record<string, unknown>> {
    const status = query.status ?? null;
    const type = (query.type ?? '').trim() || null;
    const offset = (query.page - 1) * query.page_size;

    const [total, rows, statusRows] = await Promise.all([
      this.database.pool.query<CountRow>(
        `SELECT count(*)::int AS total FROM jobs
         WHERE ($1::text IS NULL OR status = $1)
           AND ($2::text IS NULL OR type = $2)`,
        [status, type],
      ),
      this.database.pool.query<JobRow>(
        `SELECT id, type, payload, dedupe_key, status, attempts, run_at,
                locked_at, finished_at, last_error, created_at
         FROM jobs
         WHERE ($1::text IS NULL OR status = $1)
           AND ($2::text IS NULL OR type = $2)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [status, type, query.page_size, offset],
      ),
      this.database.pool.query<JobStatusRow>(
        `SELECT status, count(*)::int AS count FROM jobs GROUP BY status`,
      ),
    ]);

    const counts: Record<string, number> = {
      all: 0,
      queued: 0,
      running: 0,
      done: 0,
      failed: 0,
    };
    for (const row of statusRows.rows) {
      counts[row.status] = Number(row.count);
      counts.all += Number(row.count);
    }

    return {
      jobs: rows.rows.map((job) => ({
        id: Number(job.id),
        type: job.type,
        payload: job.payload,
        dedupe_key: job.dedupe_key,
        status: job.status,
        attempts: Number(job.attempts),
        run_at: asIso(job.run_at),
        locked_at: asIso(job.locked_at),
        finished_at: asIso(job.finished_at),
        last_error: job.last_error,
        created_at: asIso(job.created_at),
      })),
      page: query.page,
      page_size: query.page_size,
      total: total.rows[0].total,
      counts,
    };
  }

  async retryJob(
    jobId: number,
    actorId: string,
    requestId: string,
  ): Promise<Record<string, unknown>> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query<JobRow>(
        'SELECT id, type, payload, status FROM jobs WHERE id = $1 FOR UPDATE',
        [jobId],
      );
      const job = found.rows[0];
      if (!job) throw new NotFoundException('Job not found.');
      if (job.status === 'queued' || job.status === 'running') {
        throw new ConflictException({
          error: 'JOB_NOT_FINISHED',
          message: 'Only a finished job can be retried.',
        });
      }
      const result = await this.jobs.enqueue(
        job.type,
        job.payload,
        `retry:${jobId}`,
        client,
      );
      await this.recordAudit(
        client,
        actorId,
        'job.retry',
        'job',
        String(jobId),
        {
          type: job.type,
          previous_status: job.status,
          new_job_id: result.job_id,
          deduplicated: result.deduplicated,
        },
        requestId,
      );
      await client.query('COMMIT');
      return { ...result, source_job_id: jobId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listReports(query: ReportsQueryDto): Promise<Record<string, unknown>> {
    const species = (query.species ?? '').trim() || null;
    const zoneId = query.zone_id ?? null;
    const minRating = query.min_rating ?? null;
    const offset = (query.page - 1) * query.page_size;
    const filter = `WHERE ($1::text IS NULL OR r.species = $1)
                      AND ($2::uuid IS NULL OR r.zone_id = $2)
                      AND ($3::int IS NULL OR r.rating >= $3)`;

    const [total, rows] = await Promise.all([
      this.database.pool.query<CountRow>(
        `SELECT count(*)::int AS total FROM reports r ${filter}`,
        [species, zoneId, minRating],
      ),
      this.database.pool.query<ReportRow>(
        `SELECT r.id, r.zone_id, z.name AS zone_name, z.h3 AS zone_h3,
                r.species, r.rating, r.user_id,
                u.email AS user_email, u.nickname AS user_nickname,
                (u.deleted_at IS NOT NULL) AS user_deleted,
                COALESCE(t.trust, 0.5)::float8 AS trust, r.created_at
         FROM reports r
         JOIN zones z ON z.id = r.zone_id
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN user_trust t ON t.user_id = r.user_id
         ${filter}
         ORDER BY r.created_at DESC
         LIMIT $4 OFFSET $5`,
        [species, zoneId, minRating, query.page_size, offset],
      ),
    ]);

    return {
      reports: rows.rows.map((report) => ({
        id: report.id,
        zone_id: report.zone_id,
        zone_name: report.zone_name,
        zone_h3: report.zone_h3,
        species: report.species,
        rating: Number(report.rating),
        user_id: report.user_id,
        user_email: report.user_email,
        user_nickname: report.user_nickname,
        user_deleted: Boolean(report.user_deleted),
        trust: Number(report.trust),
        created_at: asIso(report.created_at),
      })),
      page: query.page,
      page_size: query.page_size,
      total: total.rows[0].total,
    };
  }

  async listUsers(query: UsersQueryDto): Promise<Record<string, unknown>> {
    const q = (query.q ?? '').trim();
    const role = query.role ?? null;
    const offset = (query.page - 1) * query.page_size;
    const filter = `WHERE u.deleted_at IS NULL
                      AND ($1 = '' OR u.email ILIKE '%' || $1 || '%'
                        OR u.nickname ILIKE '%' || $1 || '%')
                      AND ($2::text IS NULL OR u.role = $2)`;

    const [total, rows] = await Promise.all([
      this.database.pool.query<CountRow>(
        `SELECT count(*)::int AS total FROM users u ${filter}`,
        [q, role],
      ),
      this.database.pool.query<UserRow>(
        `SELECT u.id, u.email, u.nickname, u.role, u.lang, u.privacy_level,
                u.email_verified_at, u.created_at,
                COALESCE(t.trust, 0.5)::float8 AS trust,
                (SELECT count(*) FROM reports r WHERE r.user_id = u.id)::int AS reports_total,
                (SELECT count(*) FROM visits v WHERE v.user_id = u.id)::int AS visits_total,
                (SELECT max(rt.created_at) FROM refresh_tokens rt
                  WHERE rt.user_id = u.id AND rt.revoked_at IS NULL) AS last_sign_in
         FROM users u
         LEFT JOIN user_trust t ON t.user_id = u.id
         ${filter}
         ORDER BY u.created_at DESC
         LIMIT $3 OFFSET $4`,
        [q, role, query.page_size, offset],
      ),
    ]);

    return {
      users: rows.rows.map((user) => ({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        lang: user.lang,
        privacy_level: user.privacy_level,
        email_verified_at: asIso(user.email_verified_at),
        created_at: asIso(user.created_at),
        trust: Number(user.trust),
        reports_total: Number(user.reports_total),
        visits_total: Number(user.visits_total),
        last_sign_in: asIso(user.last_sign_in),
      })),
      page: query.page,
      page_size: query.page_size,
      total: total.rows[0].total,
    };
  }

  async updateUserRole(
    userId: string,
    input: UpdateRoleDto,
    actorId: string,
    requestId: string,
  ): Promise<Record<string, unknown>> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query<{
        id: string;
        email: string;
        role: 'picker' | 'buyer' | 'admin';
      }>(
        `SELECT id, email, role FROM users
         WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [userId],
      );
      const user = found.rows[0];
      if (!user) throw new NotFoundException('Account not found.');
      if (userId === actorId && input.role !== 'admin') {
        throw new ConflictException({
          error: 'SELF_DEMOTION_NOT_ALLOWED',
          message: 'You cannot remove your own admin role.',
        });
      }
      if (user.role !== input.role) {
        await client.query('UPDATE users SET role = $2 WHERE id = $1', [
          userId,
          input.role,
        ]);
        await this.recordAudit(
          client,
          actorId,
          'user.role',
          'user',
          userId,
          { email: user.email, from: user.role, to: input.role },
          requestId,
        );
      }
      await client.query('COMMIT');
      return { id: user.id, email: user.email, role: input.role };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async analytics(query: AnalyticsQueryDto): Promise<Record<string, unknown>> {
    const days = query.days;
    const keys = dayKeys(days);
    const [
      reports,
      visits,
      signups,
      jobs,
      speciesStats,
      distribution,
      topZones,
      jobStatus,
    ] = await Promise.all([
      this.dailyCounts('reports', days),
      this.dailyCounts('visits', days),
      this.dailyCounts('users', days),
      this.dailyJobs(days),
      this.database.pool.query<SpeciesStatsRow>(
        `SELECT s.code, s.name_en, s.name_fi, s.colour,
                (SELECT count(*) FROM zone_species zs
                  WHERE zs.species = s.code AND zs.suitability > 0)::int AS zones_supported,
                (SELECT count(*) FROM zone_scores_current c
                  WHERE c.species = s.code)::int AS zones_scored,
                (SELECT round(avg(c.score)::numeric, 1) FROM zone_scores_current c
                  WHERE c.species = s.code) AS avg_score,
                (SELECT count(*) FROM zone_scores_current c
                  WHERE c.species = s.code AND c.confidence = 'high')::int AS high_confidence,
                (SELECT count(*) FROM reports r
                  WHERE r.species = s.code
                    AND r.created_at >= now() - interval '7 days')::int AS reports_7d
         FROM species s ORDER BY s.code`,
      ),
      this.database.pool.query<DistributionRow>(
        `SELECT species, LEAST(width_bucket(score, 0, 100, 10), 10) AS bucket,
                count(*)::int AS count
         FROM zone_scores_current
         GROUP BY species, bucket
         ORDER BY species, bucket`,
      ),
      this.database.pool.query<TopZoneRow>(
        `SELECT z.id, z.name, z.h3, count(r.id)::int AS reports_7d,
                round(avg(r.rating)::numeric, 1) AS avg_rating
         FROM reports r JOIN zones z ON z.id = r.zone_id
         WHERE r.created_at >= now() - interval '7 days'
         GROUP BY z.id
         ORDER BY reports_7d DESC, avg_rating DESC
         LIMIT 5`,
      ),
      this.database.pool.query<JobStatusRow>(
        `SELECT status, count(*)::int AS count FROM jobs GROUP BY status`,
      ),
    ]);

    const speciesRows = speciesStats.rows;
    const buckets = new Map<string, number[]>();
    for (const species of speciesRows) {
      buckets.set(
        species.code,
        Array.from({ length: 10 }, () => 0),
      );
    }
    for (const row of distribution.rows) {
      const list = buckets.get(row.species);
      const index = Math.min(Math.max(row.bucket - 1, 0), 9);
      if (list) list[index] += Number(row.count);
    }

    const jobStatusCounts: Record<string, number> = {
      queued: 0,
      running: 0,
      done: 0,
      failed: 0,
    };
    for (const row of jobStatus.rows) {
      jobStatusCounts[row.status] = Number(row.count);
    }

    return {
      days,
      reports_daily: keys.map((date) => ({
        date,
        count: reports.get(date) ?? 0,
      })),
      visits_daily: keys.map((date) => ({
        date,
        count: visits.get(date) ?? 0,
      })),
      signups_daily: keys.map((date) => ({
        date,
        count: signups.get(date) ?? 0,
      })),
      jobs_daily: keys.map((date) => ({
        date,
        done: jobs.done.get(date) ?? 0,
        failed: jobs.failed.get(date) ?? 0,
      })),
      job_status: jobStatusCounts,
      species_stats: speciesRows.map((species) => ({
        species: species.code,
        name_en: species.name_en,
        name_fi: species.name_fi,
        colour: species.colour,
        zones_supported: Number(species.zones_supported),
        zones_scored: Number(species.zones_scored),
        avg_score: asNumber(species.avg_score),
        high_confidence: Number(species.high_confidence),
        high_confidence_pct:
          Number(species.zones_scored) === 0
            ? 0
            : Math.round(
                (Number(species.high_confidence) /
                  Number(species.zones_scored)) *
                  1000,
              ) / 10,
        reports_7d: Number(species.reports_7d),
      })),
      score_distribution: speciesRows.map((species) => ({
        species: species.code,
        buckets: (buckets.get(species.code) ?? []).map((count, index) => ({
          min: index * 10,
          max: index === 9 ? 100 : index * 10 + 9,
          count,
        })),
      })),
      top_zones: topZones.rows.map((zone) => ({
        id: zone.id,
        name: zone.name,
        h3: zone.h3,
        reports_7d: Number(zone.reports_7d),
        avg_rating: asNumber(zone.avg_rating),
      })),
    };
  }

  async listAudit(query: PaginationDto): Promise<Record<string, unknown>> {
    const offset = (query.page - 1) * query.page_size;
    const [total, rows] = await Promise.all([
      this.database.pool.query<CountRow>(
        'SELECT count(*)::int AS total FROM audit_log',
      ),
      this.database.pool.query<AuditRow>(
        `SELECT a.id, a.actor_id, u.email AS actor_email, a.action,
                a.target_type, a.target_id, a.detail, a.request_id, a.created_at
         FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        [query.page_size, offset],
      ),
    ]);
    return {
      entries: rows.rows.map((row) => this.mapAuditRow(row)),
      page: query.page,
      page_size: query.page_size,
      total: total.rows[0].total,
    };
  }

  async recompute(
    input: RecomputeDto,
    actorId: string,
    requestId: string,
  ): Promise<EnqueueResult> {
    if (input.species && !input.zone_id) {
      throw new UnprocessableEntityException(
        'species can only be supplied with zone_id.',
      );
    }
    if (input.zone_id) {
      const zone = await this.database.pool.query(
        'SELECT 1 FROM zones WHERE id = $1',
        [input.zone_id],
      );
      if (!zone.rowCount) throw new NotFoundException('Zone not found.');
      if (input.species) await this.species.validate(input.species);
      return this.enqueueWithAudit(
        'recompute_zone_score',
        {
          zone_id: input.zone_id,
          ...(input.species ? { species: input.species } : {}),
        },
        `recompute:${input.zone_id}`,
        actorId,
        requestId,
        {
          zone_id: input.zone_id,
          species: input.species ?? null,
        },
      );
    }
    return this.enqueueWithAudit(
      'recompute_all',
      {},
      'recompute_all',
      actorId,
      requestId,
      {},
    );
  }

  private async enqueueWithAudit(
    type: string,
    payload: Record<string, unknown>,
    dedupeKey: string,
    actorId: string,
    requestId: string,
    detail: Record<string, unknown>,
  ): Promise<EnqueueResult> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.jobs.enqueue(type, payload, dedupeKey, client);
      await this.recordAudit(
        client,
        actorId,
        'scores.recompute',
        'scores',
        typeof payload.zone_id === 'string' ? payload.zone_id : null,
        { ...detail, job_id: result.job_id, deduplicated: result.deduplicated },
        requestId,
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async recordAudit(
    client: PoolClient,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    detail: Record<string, unknown>,
    requestId: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_log
         (actor_id, action, target_type, target_id, detail, request_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        actorId,
        action,
        targetType,
        targetId,
        JSON.stringify(detail),
        requestId,
      ],
    );
  }

  private async recentAudit(limit: number): Promise<unknown[]> {
    const rows = await this.database.pool.query<AuditRow>(
      `SELECT a.id, a.actor_id, u.email AS actor_email, a.action,
              a.target_type, a.target_id, a.detail, a.request_id, a.created_at
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.rows.map((row) => this.mapAuditRow(row));
  }

  private mapAuditRow(row: AuditRow): Record<string, unknown> {
    return {
      id: Number(row.id),
      actor_id: row.actor_id,
      actor_email: row.actor_email,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      detail: row.detail,
      request_id: row.request_id,
      created_at: asIso(row.created_at),
    };
  }

  private mapZoneListRow(row: ZoneListRow): Record<string, unknown> {
    return {
      id: row.id,
      h3: row.h3,
      name: row.name,
      forest_type: row.forest_type,
      area_km2: asNumber(row.area_km2),
      centroid:
        row.lat === null || row.lng === null
          ? null
          : { lat: Number(row.lat), lng: Number(row.lng) },
      species_scored: Number(row.species_scored),
      best_score: asNumber(row.best_score),
      latest_computed_at: asIso(row.latest_computed_at),
      reports_total: Number(row.reports_total),
    };
  }

  private async dailyCounts(
    table: 'reports' | 'visits' | 'users',
    days: number,
  ): Promise<Map<string, number>> {
    const deleted = table === 'users' ? 'AND deleted_at IS NULL' : '';
    const result = await this.database.pool.query<DailyCountRow>(
      `SELECT to_char((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
              count(*)::int AS count
       FROM ${table}
       WHERE created_at >= now() - make_interval(days => $1) ${deleted}
       GROUP BY 1 ORDER BY 1`,
      [days],
    );
    return new Map(result.rows.map((row) => [row.date, Number(row.count)]));
  }

  private async dailyJobs(
    days: number,
  ): Promise<{ done: Map<string, number>; failed: Map<string, number> }> {
    const result = await this.database.pool.query<DailyJobRow>(
      `SELECT to_char((finished_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
              count(*) FILTER (WHERE status = 'done')::int AS done,
              count(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM jobs
       WHERE finished_at >= now() - make_interval(days => $1)
       GROUP BY 1 ORDER BY 1`,
      [days],
    );
    return {
      done: new Map(result.rows.map((row) => [row.date, Number(row.done)])),
      failed: new Map(result.rows.map((row) => [row.date, Number(row.failed)])),
    };
  }
}
