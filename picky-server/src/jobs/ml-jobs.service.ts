import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { MlClientService } from '../ml/ml-client.service';
import {
  MlExplanation,
  MlReport,
  MlScoreUpdateResponse,
  MlSpeciesScore,
  MlZonePoint,
  MlZoneScoresResponse,
  SpeciesCode,
} from '../ml/ml.types';
import { todayInHelsinki } from '../common/dates';
import { JobsService } from './jobs.service';

import { SPECIES_CODES } from '../species/species.constants';

interface JobPayload {
  zone_id?: unknown;
  species?: unknown;
  date?: unknown;
  offset?: unknown;
  report_id?: unknown;
}

interface Baseline {
  zone_id: string;
  species: SpeciesCode;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  ripeness: string;
  explanation: MlExplanation;
  score_date: Date | string;
  model_version: string;
  rules_version: string;
}

@Injectable()
export class MlJobsService {
  private readonly logger = new Logger(MlJobsService.name);

  constructor(
    private readonly database: DbService,
    private readonly jobs: JobsService,
    private readonly ml: MlClientService,
    private readonly config: ConfigService,
  ) {}

  async handle(type: string, payload: JobPayload): Promise<void> {
    if (type === 'score_zones_daily') {
      return this.scoreZonesDaily(payload);
    }
    if (type === 'recompute_zone_score') {
      return this.recomputeZoneScore(payload);
    }
    if (type === 'process_report') {
      return this.processReport(payload);
    }
    if (type === 'refresh_analytics') {
      return this.refreshAnalytics();
    }
    throw new Error(`Unsupported job type: ${type}`);
  }

  private async refreshAnalytics(): Promise<void> {
    // CONCURRENTLY cannot run inside a transaction block.
    await this.database.pool.query(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_daily',
    );
    await this.database.pool.query(
      `INSERT INTO analytics_refresh (name, refreshed_at)
       VALUES ('mv_zone_daily', now())
       ON CONFLICT (name) DO UPDATE
       SET refreshed_at = EXCLUDED.refreshed_at`,
    );
  }

  private async scoreZonesDaily(payload: JobPayload): Promise<void> {
    const date =
      typeof payload.date === 'string' ? payload.date : todayInHelsinki();
    const offset =
      typeof payload.offset === 'number' && Number.isInteger(payload.offset)
        ? payload.offset
        : 0;
    const batchSize = this.config.get<number>('ML_BATCH_SIZE', 1500);
    if (offset === 0) await this.ml.health();

    const [zones, total] = await Promise.all([
      this.database.pool.query<MlZonePoint>(
        `SELECT id::text AS id, h3, ST_Y(centroid::geometry) AS lat,
                ST_X(centroid::geometry) AS lon
         FROM zones WHERE centroid IS NOT NULL
         ORDER BY id LIMIT $1 OFFSET $2`,
        [batchSize, offset],
      ),
      this.database.pool.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM zones WHERE centroid IS NOT NULL',
      ),
    ]);

    if (zones.rows.length) {
      const scored = await this.ml.scoreZones(date, zones.rows);
      this.validateBatchResponse(scored, zones.rows);
      await this.storeBaselineBatch(scored, date);
    }

    if (offset + zones.rows.length < Number(total.rows[0]?.count ?? 0)) {
      const nextOffset = offset + batchSize;
      await this.jobs.enqueue(
        'score_zones_daily',
        { date, offset: nextOffset },
        `daily:${date}:${nextOffset}`,
      );
      return;
    }

    await this.finalizeDailyScores(date);
  }

  private validateBatchResponse(
    response: MlZoneScoresResponse,
    requested: MlZonePoint[],
  ): void {
    if (
      !Array.isArray(response.results) ||
      response.results.length !== requested.length
    ) {
      throw new BadGatewayException({
        error: 'ML_REJECTED',
        message: 'The ML service returned an invalid zone batch.',
      });
    }
    for (let index = 0; index < requested.length; index += 1) {
      const result = response.results[index];
      if (
        !result ||
        result.id !== requested[index].id ||
        result.h3 !== requested[index].h3 ||
        (result.coverage !== 'grid' && result.coverage !== 'none')
      ) {
        throw invalidBatchResponse();
      }
      if (result.coverage === 'none') {
        if (result.scores !== null) throw invalidBatchResponse();
        continue;
      }
      if (
        !result.scores ||
        typeof result.forest_share !== 'number' ||
        result.forest_share < 0 ||
        result.forest_share > 1
      ) {
        throw invalidBatchResponse();
      }
      for (const species of SPECIES_CODES) {
        const score = result.scores[species];
        if (
          !score ||
          !Number.isInteger(score.score) ||
          score.score < 0 ||
          score.score > 100 ||
          !isConfidence(score.confidence) ||
          !isRipeness(score.ripeness) ||
          !isExplanation(score.explanation)
        ) {
          throw invalidBatchResponse();
        }
      }
    }
  }

  private async storeBaselineBatch(
    response: MlZoneScoresResponse,
    date: string,
  ): Promise<void> {
    const rows: Array<Record<string, unknown>> = [];
    for (const result of response.results) {
      if (result.coverage !== 'grid' || !result.scores) continue;
      for (const species of SPECIES_CODES) {
        const score = result.scores[species];
        if (!score) {
          throw new BadGatewayException({
            error: 'ML_REJECTED',
            message: 'The ML service omitted a species score.',
          });
        }
        rows.push({
          zone_id: result.id,
          species,
          score: score.score,
          confidence: score.confidence,
          ripeness: storedRipeness(score),
          explanation: score.explanation,
          score_date: date,
          model_version: score.explanation.model_version,
          rules_version: score.explanation.rules_version,
        });
      }
    }
    if (!rows.length) return;
    await this.database.pool.query(
      `INSERT INTO zone_model_scores
         (zone_id, species, score, confidence, ripeness, explanation,
          score_date, model_version, rules_version, computed_at)
       SELECT zone_id, species, score, confidence, ripeness, explanation,
              score_date, model_version, rules_version, now()
       FROM jsonb_to_recordset($1::jsonb) AS x(
         zone_id uuid, species text, score smallint, confidence text,
         ripeness text, explanation jsonb, score_date date,
         model_version text, rules_version text
       )
       ON CONFLICT (species, zone_id) DO UPDATE SET
         score = EXCLUDED.score, confidence = EXCLUDED.confidence,
         ripeness = EXCLUDED.ripeness, explanation = EXCLUDED.explanation,
         score_date = EXCLUDED.score_date, model_version = EXCLUDED.model_version,
         rules_version = EXCLUDED.rules_version, computed_at = now()`,
      [JSON.stringify(rows)],
    );
  }

  private async finalizeDailyScores(date: string): Promise<void> {
    const windowDays = this.config.get<number>('REPORT_WINDOW_DAYS', 28);
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO zone_scores_current
           (zone_id, species, score, confidence, ripeness, s_model, s_reports,
            n_eff, band_width, explanation, computed_at)
         SELECT m.zone_id, m.species, m.score, m.confidence, m.ripeness,
                m.score, NULL, 0, NULL, m.explanation, now()
         FROM zone_model_scores m
         WHERE m.score_date = $1
           AND NOT EXISTS (
             SELECT 1 FROM reports r
             WHERE r.zone_id = m.zone_id AND r.species = m.species
               AND cardinality(r.flags) = 0
               AND r.created_at >= now() - make_interval(days => $2)
           )
         ON CONFLICT (species, zone_id) DO UPDATE SET
           score = EXCLUDED.score, confidence = EXCLUDED.confidence,
           ripeness = EXCLUDED.ripeness, s_model = EXCLUDED.s_model,
           s_reports = NULL, n_eff = 0, band_width = NULL,
           explanation = EXCLUDED.explanation, computed_at = EXCLUDED.computed_at`,
        [date, windowDays],
      );
      await client.query(
        `INSERT INTO zone_scores
           (zone_id, species, computed_at, score, confidence, ripeness,
            s_model, s_reports, n_eff, band_width, explanation)
         SELECT c.zone_id, c.species, c.computed_at, c.score, c.confidence,
                c.ripeness, c.s_model, c.s_reports, c.n_eff, c.band_width,
                c.explanation
         FROM zone_scores_current c
         JOIN zone_model_scores m
           ON m.zone_id = c.zone_id AND m.species = c.species
         WHERE m.score_date = $1
           AND NOT EXISTS (
             SELECT 1 FROM reports r
             WHERE r.zone_id = m.zone_id AND r.species = m.species
               AND cardinality(r.flags) = 0
               AND r.created_at >= now() - make_interval(days => $2)
           )`,
        [date, windowDays],
      );
      const reportedPairs = await client.query<{
        zone_id: string;
        species: SpeciesCode;
      }>(
        `SELECT DISTINCT r.zone_id, r.species
         FROM reports r
         JOIN zone_model_scores m
           ON m.zone_id = r.zone_id AND m.species = r.species
         WHERE m.score_date = $1 AND cardinality(r.flags) = 0
           AND r.created_at >= now() - make_interval(days => $2)`,
        [date, windowDays],
      );
      for (const pair of reportedPairs.rows) {
        await this.jobs.enqueue(
          'recompute_zone_score',
          pair,
          `recompute:${pair.zone_id}:${pair.species}`,
          client,
        );
      }
      await client.query(
        `DELETE FROM zone_scores_current
         WHERE explanation->>'model_version' = 'seed-0'`,
      );
      await client.query(
        `DELETE FROM zone_scores WHERE explanation->>'model_version' = 'seed-0'`,
      );
      await this.jobs.enqueue(
        'refresh_analytics',
        {},
        'refresh_analytics',
        client,
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async recomputeZoneScore(payload: JobPayload): Promise<void> {
    const zoneId = stringValue(payload.zone_id);
    const species = speciesValue(payload.species);
    const baselineResult = await this.database.pool.query<Baseline>(
      `SELECT zone_id, species, score, confidence, ripeness, explanation,
              score_date, model_version, explanation->>'rules_version' AS rules_version
       FROM zone_model_scores WHERE zone_id = $1 AND species = $2`,
      [zoneId, species],
    );
    const baseline = baselineResult.rows[0];
    if (!baseline) {
      this.logger.warn(
        `Skipping score recompute: baseline missing for ${zoneId}/${species}.`,
      );
      return;
    }
    const windowDays = this.config.get<number>('REPORT_WINDOW_DAYS', 28);
    const reportResult = await this.database.pool.query<
      MlReport & { photo_count: number | null }
    >(
      `SELECT r.created_at, r.rating,
              (SELECT sum((p.counts->>$2)::int)::int
               FROM photos p WHERE p.submission_id = r.submission_id) AS photo_count,
              COALESCE(t.trust, 0.5)::float AS reporter_trust,
              (r.visit_id IS NOT NULL) AS visit_backed
       FROM reports r
       LEFT JOIN user_trust t ON t.user_id = r.user_id
       WHERE r.zone_id = $1 AND r.species = $2
         AND cardinality(r.flags) = 0
         AND r.created_at >= now() - make_interval(days => $3)
       ORDER BY r.created_at DESC LIMIT 500`,
      [zoneId, species, windowDays],
    );
    const reports = reportResult.rows;
    if (!reports.length) {
      await this.copyBaseline(zoneId, species);
      return;
    }

    const result = await this.ml.updateZoneScore({
      map_score: Number(baseline.score),
      map_confidence: baseline.confidence,
      map_explanation: baseline.explanation,
      reports: reports.map((report) => ({
        created_at: new Date(report.created_at).toISOString(),
        rating: report.rating === null ? null : Number(report.rating),
        photo_count:
          report.photo_count === null ? null : Number(report.photo_count),
        reporter_trust: Number(report.reporter_trust),
        visit_backed: report.visit_backed,
      })),
      now: new Date().toISOString(),
    });
    this.validateScoreUpdate(result);
    await this.storeFinalScore(zoneId, species, baseline.ripeness, result);
  }

  private async copyBaseline(
    zoneId: string,
    species: SpeciesCode,
  ): Promise<void> {
    const baseline = await this.database.pool.query<Baseline>(
      `SELECT zone_id, species, score, confidence, ripeness, explanation,
              score_date, model_version, explanation->>'rules_version' AS rules_version
       FROM zone_model_scores WHERE zone_id = $1 AND species = $2`,
      [zoneId, species],
    );
    const row = baseline.rows[0];
    if (!row) return;
    await this.storeFinalScore(zoneId, species, row.ripeness, {
      score: Number(row.score),
      confidence: row.confidence,
      s_model: Number(row.score),
      s_feedback: null,
      evidence_weight: 0,
      reports_used: 0,
      explanation: row.explanation,
    });
  }

  private async storeFinalScore(
    zoneId: string,
    species: SpeciesCode,
    ripeness: string,
    result: MlScoreUpdateResponse,
  ): Promise<void> {
    const computedAt = new Date();
    const sReports =
      result.s_feedback === null ? null : Math.round(result.s_feedback);
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO zone_scores_current
           (zone_id, species, score, confidence, ripeness, s_model, s_reports,
            n_eff, band_width, explanation, computed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9::jsonb, $10)
         ON CONFLICT (species, zone_id) DO UPDATE SET
           score = EXCLUDED.score, confidence = EXCLUDED.confidence,
           ripeness = EXCLUDED.ripeness, s_model = EXCLUDED.s_model,
           s_reports = EXCLUDED.s_reports, n_eff = EXCLUDED.n_eff,
           band_width = NULL, explanation = EXCLUDED.explanation,
           computed_at = EXCLUDED.computed_at`,
        [
          zoneId,
          species,
          result.score,
          result.confidence,
          ripeness,
          result.s_model,
          sReports,
          result.evidence_weight,
          JSON.stringify(result.explanation),
          computedAt,
        ],
      );
      await client.query(
        `INSERT INTO zone_scores
           (zone_id, species, computed_at, score, confidence, ripeness,
            s_model, s_reports, n_eff, band_width, explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10::jsonb)`,
        [
          zoneId,
          species,
          computedAt,
          result.score,
          result.confidence,
          ripeness,
          result.s_model,
          sReports,
          result.evidence_weight,
          JSON.stringify(result.explanation),
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async processReport(payload: JobPayload): Promise<void> {
    const reportId = stringValue(payload.report_id);
    const query = await this.database.pool.query<{
      id: string;
      user_id: string | null;
      zone_id: string;
      species: SpeciesCode;
      rating: number;
      submission_id: string;
      visit_id: string | null;
      created_at: Date;
      flags: string[];
      trust_processed_at: Date | null;
      photo_count: number | null;
    }>(
      `SELECT r.id, r.user_id, r.zone_id, r.species, r.rating,
              r.submission_id, r.visit_id, r.created_at, r.flags,
              r.trust_processed_at,
              (SELECT sum((p.counts->>r.species)::int)::int
               FROM photos p WHERE p.submission_id = r.submission_id) AS photo_count
       FROM reports r WHERE r.id = $1`,
      [reportId],
    );
    const report = query.rows[0];
    if (!report) return;
    if (!report.trust_processed_at) {
      if (report.flags.length || !report.user_id) {
        await this.database.pool.query(
          'UPDATE reports SET trust_processed_at = now() WHERE id = $1',
          [reportId],
        );
      } else {
        await this.updateReportTrust(report, report.user_id);
      }
    }
    await this.jobs.enqueue(
      'recompute_zone_score',
      { zone_id: report.zone_id, species: report.species },
      `recompute:${report.zone_id}:${report.species}`,
    );
  }

  private async updateReportTrust(
    report: {
      id: string;
      zone_id: string;
      species: SpeciesCode;
      rating: number;
      created_at: Date;
      photo_count: number | null;
    },
    userId: string,
  ): Promise<void> {
    const minimumUsers = this.config.get<number>('CONSENSUS_MIN_USERS', 3);
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_trust (user_id, trust)
         VALUES ($1, 0.5) ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      const trustResult = await client.query<{ trust: number }>(
        'SELECT trust FROM user_trust WHERE user_id = $1 FOR UPDATE',
        [userId],
      );
      const currentReport = await client.query<{
        trust_processed_at: Date | null;
      }>('SELECT trust_processed_at FROM reports WHERE id = $1 FOR UPDATE', [
        report.id,
      ]);
      if (currentReport.rows[0]?.trust_processed_at) {
        await client.query('COMMIT');
        return;
      }
      const consensus = await client.query<{
        mean: number | null;
        users: number;
      }>(
        `SELECT avg(rating)::float AS mean, count(DISTINCT user_id)::int AS users
         FROM reports
         WHERE zone_id = $1 AND species = $2
           AND user_id IS NOT NULL AND user_id <> $3
           AND cardinality(flags) = 0
           AND created_at >= $4::timestamptz - interval '7 days'
           AND created_at < $4::timestamptz`,
        [report.zone_id, report.species, userId, report.created_at],
      );
      const row = consensus.rows[0];
      const zoneConsensus =
        Number(row?.users ?? 0) >= minimumUsers ? (row?.mean ?? null) : null;
      const updated = await this.ml.updateTrust({
        trust: Number(trustResult.rows[0]?.trust ?? 0.5),
        rating: Number(report.rating),
        photo_count:
          report.photo_count === null ? null : Number(report.photo_count),
        species: report.species,
        zone_consensus: zoneConsensus,
      });
      await client.query(
        'UPDATE user_trust SET trust = $2, updated_at = now() WHERE user_id = $1',
        [userId, updated.trust],
      );
      await client.query(
        'UPDATE reports SET trust_processed_at = now() WHERE id = $1',
        [report.id],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private validateScoreUpdate(result: MlScoreUpdateResponse): void {
    if (
      !Number.isInteger(result.score) ||
      result.score < 0 ||
      result.score > 100 ||
      !isConfidence(result.confidence) ||
      !Number.isInteger(result.s_model) ||
      result.s_model < 0 ||
      result.s_model > 100 ||
      (result.s_feedback !== null &&
        (!Number.isFinite(result.s_feedback) ||
          result.s_feedback < 0 ||
          result.s_feedback > 100)) ||
      !Number.isFinite(result.evidence_weight) ||
      result.evidence_weight < 0 ||
      !Number.isInteger(result.reports_used) ||
      result.reports_used < 0 ||
      !isExplanation(result.explanation)
    ) {
      throw new BadGatewayException({
        error: 'ML_REJECTED',
        message: 'The ML service returned an invalid score.',
      });
    }
  }
}

function invalidBatchResponse(): BadGatewayException {
  return new BadGatewayException({
    error: 'ML_REJECTED',
    message: 'The ML service returned an invalid zone batch.',
  });
}

function isConfidence(value: unknown): value is 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isRipeness(
  value: unknown,
): value is 'unripe' | 'ripening' | 'ripe' | 'past' {
  return (
    value === 'unripe' ||
    value === 'ripening' ||
    value === 'ripe' ||
    value === 'past'
  );
}

function isExplanation(
  value: MlExplanation | undefined,
): value is MlExplanation {
  return Boolean(
    value &&
      typeof value.model_version === 'string' &&
      value.model_version &&
      typeof value.rules_version === 'string' &&
      value.rules_version &&
      Array.isArray(value.reasons) &&
      value.reasons.length > 0 &&
      value.reasons.every((reason) => typeof reason === 'string') &&
      value.inputs &&
      Number.isInteger(value.inputs.reports_used) &&
      Number.isFinite(value.inputs.evidence_weight),
  );
}

function storedRipeness(score: MlSpeciesScore): string {
  return score.explanation.reasons.includes('off_season')
    ? 'off_season'
    : score.ripeness;
}

function stringValue(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Invalid job payload.');
  }
  return value;
}

function speciesValue(value: unknown): SpeciesCode {
  if (
    typeof value === 'string' &&
    SPECIES_CODES.includes(value as SpeciesCode)
  ) {
    return value as SpeciesCode;
  }
  throw new Error('Invalid job species.');
}
