import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import {
  Confidence,
  MlDetectionResponse,
  MlExplanation,
  MlHealth,
  MlScoreUpdateRequest,
  MlScoreUpdateResponse,
  MlSpeciesScore,
  MlTrustUpdateRequest,
  MlTrustUpdateResponse,
  MlZonePoint,
  MlZoneScoreResult,
  MlZoneScoresResponse,
  SpeciesCode,
} from './ml.types';
import { SPECIES_CODES } from '../species/species.constants';

@Injectable()
export class MlClientService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly mode: 'live' | 'mock';
  private readonly timeoutMs: number;
  private readonly photoTimeoutMs: number;

  constructor(
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.baseUrl = config
      .getOrThrow<string>('ML_SERVICE_URL')
      .replace(/\/+$/, '');
    this.apiKey = config.get<string>('ML_API_KEY', '');
    this.mode = config.get<'live' | 'mock'>('ML_MODE', 'mock');
    this.timeoutMs = config.get<number>('ML_TIMEOUT_MS', 20_000);
    this.photoTimeoutMs = config.get<number>('ML_TIMEOUT_PHOTO_MS', 60_000);
    this.logger.setContext(MlClientService.name);
    if (this.mode === 'live' && !this.apiKey) {
      throw new Error('ML_API_KEY is required when ML_MODE=live.');
    }
  }

  health(): Promise<MlHealth> {
    if (this.mode === 'mock') {
      return Promise.resolve({
        status: 'ok',
        models: {
          detector: 'mock-detector',
          zone_grid: 'mock-zone-grid',
          yield: 'mock-yield',
          score_rules: 'mock-score-rules',
        },
      });
    }
    return this.requestJson<MlHealth>(
      'GET',
      '/health',
      undefined,
      this.photoTimeoutMs,
    ).then((value) => {
      if (!isMlHealth(value)) throw this.rejected();
      return value;
    });
  }

  analyzePhoto(
    bytes: Buffer,
    contentType: string,
    filename: string,
  ): Promise<MlDetectionResponse> {
    if (this.mode === 'mock') {
      return Promise.resolve({
        counts: {
          bilberry: 0,
          cloudberry: 0,
          crowberry: 0,
          lingonberry: 0,
        },
        total: 0,
        image_size: { width: 1280, height: 720 },
        model_version: 'mock-detector',
      });
    }
    const form = new FormData();
    form.append(
      'photo',
      new Blob([new Uint8Array(bytes)], { type: contentType }),
      filename,
    );
    return this.requestJson<MlDetectionResponse>(
      'POST',
      '/detections?boxes=false',
      form,
      this.photoTimeoutMs,
    ).then((value) => {
      if (!isMlDetectionResponse(value)) throw this.rejected();
      return value;
    });
  }

  scoreZones(
    date: string,
    points: MlZonePoint[],
  ): Promise<MlZoneScoresResponse> {
    if (this.mode === 'mock') {
      const results = points.map((point) => this.mockZone(point, date));
      return Promise.resolve({
        date,
        model_version: 'mock-zone-grid',
        rules_version: 'mock-score-rules',
        results,
      });
    }
    return this.requestJson('POST', '/zone-scores', { date, points });
  }

  updateZoneScore(input: MlScoreUpdateRequest): Promise<MlScoreUpdateResponse> {
    if (this.mode === 'mock') return Promise.resolve(mockUpdate(input));
    return this.requestJson('POST', '/score-updates', input);
  }

  updateTrust(input: MlTrustUpdateRequest): Promise<MlTrustUpdateResponse> {
    if (this.mode === 'mock') {
      const nearby =
        input.rating !== null &&
        input.zone_consensus !== null &&
        Math.abs(input.rating - input.zone_consensus) <= 1;
      const confirms = (input.photo_count ?? 0) > 0;
      const far =
        input.rating !== null &&
        input.zone_consensus !== null &&
        Math.abs(input.rating - input.zone_consensus) > 1;
      const adjustment = confirms || nearby ? 0.05 : far ? -0.1 : 0;
      return Promise.resolve({
        trust: round(Math.max(0.05, Math.min(1, input.trust + adjustment)), 3),
        rules_version: 'mock-score-rules',
      });
    }
    return this.requestJson<MlTrustUpdateResponse>(
      'POST',
      '/trust-updates',
      input,
    ).then((value) => {
      if (!isMlTrustUpdateResponse(value)) throw this.rejected();
      return value;
    });
  }

  private async requestJson<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: object | FormData,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers: Record<string, string> = {
          'X-API-Key': this.apiKey,
        };
        const isForm = body instanceof FormData;
        if (body && !isForm) headers['Content-Type'] = 'application/json';
        const response = await fetch(`${this.baseUrl}/api/v1/ml${path}`, {
          method,
          headers,
          body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status < 500 && response.status !== 429) {
            this.logger.warn(
              { path, status: response.status },
              'ML service rejected request',
            );
            throw this.rejected();
          }
          lastError = new Error(`ML service returned ${response.status}.`);
          if (attempt === 1) throw this.unavailable(lastError);
        } else {
          const value: unknown = await response.json();
          if (typeof value !== 'object' || value === null) {
            throw this.rejected();
          }
          return value as T;
        }
      } catch (error) {
        if (error instanceof BadGatewayException) throw error;
        lastError = error;
        if (attempt === 1) throw this.unavailable(error);
      } finally {
        clearTimeout(timeout);
      }
      await delay(1000);
    }
    throw this.unavailable(lastError);
  }

  private rejected(): BadGatewayException {
    return new BadGatewayException({
      error: 'ML_REJECTED',
      message: 'The ML service rejected the request.',
    });
  }

  private unavailable(cause: unknown): ServiceUnavailableException {
    this.logger.warn(
      { error_type: cause instanceof Error ? cause.name : 'unknown' },
      'ML service unavailable after retry',
    );
    return new ServiceUnavailableException({
      error: 'ML_UNAVAILABLE',
      message: 'The ML service is temporarily unavailable.',
      details: { retry_after_s: 30 },
    });
  }

  private mockZone(point: MlZonePoint, date: string): MlZoneScoreResult {
    if (
      point.lat < 61.9 ||
      point.lat > 62.6 ||
      point.lon < 25.2 ||
      point.lon > 26.3
    ) {
      return {
        ...point,
        coverage: 'none',
        cells: 0,
        forest_share: null,
        scores: null,
      };
    }
    const scores = Object.fromEntries(
      SPECIES_CODES.map((species, index) => {
        const start = monthDay(date, 7, 10 + index);
        const end = monthDay(date, 8, 29 + index);
        const explanation: MlExplanation = {
          model_version: 'mock-zone-grid',
          rules_version: 'mock-score-rules',
          reasons: ['in_ripe_window', 'good_site', 'no_reports_baseline'],
          inputs: {
            site_class: 'good',
            site_potential: 0.6,
            window_start: start,
            window_end: end,
            year_index: 1,
            forest_share: 0.9,
            reports_used: 0,
            evidence_weight: 0,
          },
        };
        const score: MlSpeciesScore = {
          score: 60 - index * 5,
          confidence: 'medium',
          ripeness: 'ripe',
          explanation,
        };
        return [species, score];
      }),
    ) as Record<SpeciesCode, MlSpeciesScore>;
    return {
      ...point,
      coverage: 'grid',
      cells: 8,
      forest_share: 0.9,
      scores,
    };
  }
}

function mockUpdate(input: MlScoreUpdateRequest): MlScoreUpdateResponse {
  let totalWeight = 0;
  let weightedEvidence = 0;
  let photoConfirms = false;
  let reportsUsed = 0;
  let newestCountedAt = Number.NEGATIVE_INFINITY;
  const now = Date.parse(input.now);
  for (const report of input.reports) {
    const ratingScore =
      report.rating === null ? null : (report.rating - 1) * 25;
    const photoScore = report.photo_count
      ? Math.min(100, (100 * report.photo_count) / 30)
      : null;
    const evidence =
      ratingScore === null
        ? photoScore
        : photoScore === null
          ? ratingScore
          : Math.max(ratingScore, photoScore);
    if (evidence === null) continue;
    const ageDays = Math.max(
      0,
      (now - Date.parse(report.created_at)) / 86_400_000,
    );
    const recency = ageDays > 28 ? 0 : 0.5 ** (ageDays / 7);
    const weight =
      report.reporter_trust * recency * (report.visit_backed ? 1 : 0.5);
    if (weight <= 0) continue;
    totalWeight += weight;
    weightedEvidence += weight * evidence;
    reportsUsed += 1;
    newestCountedAt = Math.max(newestCountedAt, Date.parse(report.created_at));
    photoConfirms ||= Boolean(report.photo_count);
  }
  const feedback = totalWeight ? weightedEvidence / totalWeight : null;
  const score =
    feedback === null
      ? input.map_score
      : Math.round(
          (input.map_score + totalWeight * feedback) / (1 + totalWeight),
        );
  const explanation = {
    ...input.map_explanation,
    reasons: [...input.map_explanation.reasons],
    inputs: { ...input.map_explanation.inputs },
  };
  const reason =
    feedback === null
      ? 'no_reports_baseline'
      : feedback >= input.map_score
        ? 'recent_reports_high'
        : 'recent_reports_low';
  explanation.reasons = [
    ...explanation.reasons.filter(
      (code) =>
        ![
          'no_reports_baseline',
          'recent_reports_high',
          'recent_reports_low',
          'photo_confirms_species',
        ].includes(code),
    ),
    reason,
    ...(photoConfirms ? ['photo_confirms_species'] : []),
  ];
  explanation.inputs = {
    ...explanation.inputs,
    reports_used: reportsUsed,
    evidence_weight: round(totalWeight, 3),
  };
  const newestAgeDays = (now - newestCountedAt) / 86_400_000;
  const confidence: Confidence =
    totalWeight >= 2 && newestAgeDays <= 7
      ? 'high'
      : totalWeight >= 0.5
        ? 'medium'
        : input.map_confidence;
  return {
    score,
    confidence,
    s_model: input.map_score,
    s_feedback: feedback === null ? null : round(feedback, 1),
    evidence_weight: round(totalWeight, 3),
    reports_used: reportsUsed,
    explanation,
  };
}

function monthDay(date: string, month: number, day: number): string {
  const year = Number(date.slice(0, 4));
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMlHealth(value: unknown): value is MlHealth {
  if (!isRecord(value) || !isRecord(value.models) || value.status !== 'ok') {
    return false;
  }
  const models = value.models;
  return ['detector', 'zone_grid', 'yield', 'score_rules'].every((key) => {
    const model = models[key];
    return typeof model === 'string' && model.length > 0;
  });
}

function isMlDetectionResponse(value: unknown): value is MlDetectionResponse {
  if (
    !isRecord(value) ||
    !isRecord(value.counts) ||
    !isRecord(value.image_size) ||
    typeof value.total !== 'number' ||
    !Number.isInteger(value.total) ||
    value.total < 0 ||
    typeof value.model_version !== 'string' ||
    !value.model_version
  ) {
    return false;
  }
  const counts = value.counts;
  const imageSize = value.image_size;
  const keys = Object.keys(counts);
  if (
    keys.length !== SPECIES_CODES.length ||
    !SPECIES_CODES.every((species) => {
      const count = counts[species];
      return typeof count === 'number' && Number.isInteger(count) && count >= 0;
    }) ||
    typeof imageSize.width !== 'number' ||
    !Number.isInteger(imageSize.width) ||
    imageSize.width <= 0 ||
    typeof imageSize.height !== 'number' ||
    !Number.isInteger(imageSize.height) ||
    imageSize.height <= 0
  ) {
    return false;
  }
  return (
    SPECIES_CODES.reduce((sum, species) => sum + Number(counts[species]), 0) ===
    value.total
  );
}

function isMlTrustUpdateResponse(
  value: unknown,
): value is MlTrustUpdateResponse {
  return (
    isRecord(value) &&
    typeof value.trust === 'number' &&
    Number.isFinite(value.trust) &&
    value.trust >= 0.05 &&
    value.trust <= 1 &&
    typeof value.rules_version === 'string' &&
    value.rules_version.length > 0
  );
}

function round(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
