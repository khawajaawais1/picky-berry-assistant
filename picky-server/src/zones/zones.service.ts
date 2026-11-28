import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { cellToBoundary } from 'h3-js';
import { QueryResultRow } from 'pg';
import { DbService } from '../db/db.service';
import { SpeciesService } from '../species/species.service';
import { bboxKm, Bbox } from '../common/utils/bbox';
import { buildEtag, matchesEtag } from '../common/utils/etag';
import { ExplanationService } from './explanation/explanation.service';

type Confidence = 'high' | 'medium' | 'low';
type Ripeness = 'unripe' | 'ripening' | 'ripe' | 'past' | 'off_season';
type GeoJsonGeometry = { type: 'Polygon'; coordinates: number[][][] };

interface FeatureRow extends QueryResultRow {
  id: string;
  h3: string;
  name: string | null;
  geometry: GeoJsonGeometry | string;
  score: number;
  confidence: Confidence;
  ripeness: Ripeness;
  computed_at: Date;
}

interface AggregateRow extends QueryResultRow {
  max_computed_at: Date | null;
  count: number;
}

export interface ConditionalResponse<T> {
  etag: string;
  not_modified: boolean;
  body?: T;
}

interface NearbyRow extends QueryResultRow {
  id: string;
  name: string | null;
  h3: string;
  score: number;
  confidence: Confidence;
  ripeness: Ripeness;
  computed_at: Date;
  distance_km: number;
  lat: number;
  lng: number;
}

interface GeofenceRow extends QueryResultRow {
  id: string;
  name: string | null;
  h3: string;
  distance_km: number;
  lat: number;
  lng: number;
}

interface SnapshotRow extends QueryResultRow {
  id: string;
  h3: string;
  name: string | null;
  forest_type: string | null;
  geometry: GeoJsonGeometry | string;
  scores: Record<string, unknown>;
}

interface ZoneStatsRow extends QueryResultRow {
  id: string;
  max_computed_at: Date | null;
  report_count: number;
}

interface ZoneDetailRow extends QueryResultRow {
  id: string;
  h3: string;
  name: string | null;
  forest_type: string | null;
  area_km2: number;
  lat: number;
  lng: number;
  distance_km: number | null;
}

interface CurrentScoreRow extends QueryResultRow {
  species: string;
  score: number;
  confidence: Confidence;
  ripeness: Ripeness;
  computed_at: Date;
}

interface ReportAggregateRow extends QueryResultRow {
  species: string;
  count: number;
  avg_rating: number | null;
}

interface ExplanationRow extends QueryResultRow {
  explanation: Record<string, unknown>;
  computed_at: Date;
}

interface HistoryRow extends QueryResultRow {
  date: string | Date;
  score: number;
  confidence: Confidence;
}

interface GroupedRow extends QueryResultRow {
  h3: string;
  score: number;
  confidence: Confidence;
  ripeness: Ripeness;
  computed_at: Date;
  zone_count: number;
}

@Injectable()
export class ZonesService {
  constructor(
    private readonly database: DbService,
    private readonly species: SpeciesService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
    private readonly explanationService: ExplanationService,
  ) {
    this.logger.setContext(ZonesService.name);
  }

  async listZones(
    bbox: Bbox,
    species: string,
    zoom: number,
    ifNoneMatch?: string,
  ): Promise<ConditionalResponse<Record<string, unknown>>> {
    await this.species.validate(species);
    const mode = zoom < 10 ? 'grouped' : 'detail';
    const maxKm = this.config.get<number>(
      mode === 'detail' ? 'MAX_BBOX_KM_DETAIL' : 'MAX_BBOX_KM_GROUPED',
      mode === 'detail' ? 50 : 150,
    );
    this.assertBboxSize(bbox, maxKm);

    const aggregate = await this.database.pool.query<AggregateRow>(
      `SELECT max(c.computed_at) AS max_computed_at,
              ${mode === 'detail' ? 'count(*)' : 'count(DISTINCT z.h3_parent6)'}::int AS count
       FROM zones z
       JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
       WHERE z.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)`,
      [species, ...bbox],
    );
    const stats = aggregate.rows[0];
    const etag = buildEtag([
      species,
      mode,
      bbox.join(','),
      stats.max_computed_at,
      stats.count,
    ]);
    if (matchesEtag(ifNoneMatch, etag)) return { etag, not_modified: true };

    const features =
      mode === 'detail'
        ? await this.getDetailFeatures(bbox, species)
        : await this.getGroupedFeatures(bbox, species);
    return {
      etag,
      not_modified: false,
      body: {
        type: 'FeatureCollection',
        features,
        meta: {
          species,
          mode,
          count: features.length,
          bbox,
          computed_at: stats.max_computed_at?.toISOString() ?? null,
        },
      },
    };
  }

  async nearby(
    lat: number,
    lng: number,
    species: string | undefined,
    radiusKm: number,
    limit: number,
    sort: 'score' | 'distance' = 'score',
  ): Promise<Record<string, unknown>> {
    if (sort === 'distance') {
      const result = await this.database.pool.query<GeofenceRow>(
        `SELECT z.id, z.name, z.h3,
                ST_Y(z.centroid) AS lat, ST_X(z.centroid) AS lng,
                ST_Distance(z.centroid::geography, p.g) / 1000.0 AS distance_km
         FROM zones z
         CROSS JOIN (
           SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS g
         ) p
         WHERE ST_DWithin(z.centroid::geography, p.g, $3)
         ORDER BY distance_km ASC
         LIMIT $4`,
        [lng, lat, radiusKm * 1000, limit],
      );
      return {
        origin: { lat, lng },
        radius_km: radiusKm,
        zones: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          h3: row.h3,
          centroid: { lat: Number(row.lat), lng: Number(row.lng) },
          distance_km: Math.round(Number(row.distance_km) * 10) / 10,
        })),
      };
    }

    if (!species) {
      throw new UnprocessableEntityException(
        'species is required for score sorting.',
      );
    }
    await this.species.validate(species);
    const result = await this.database.pool.query<NearbyRow>(
      `SELECT z.id, z.name, z.h3,
              ST_Y(z.centroid) AS lat, ST_X(z.centroid) AS lng,
              c.score, c.confidence, c.ripeness,
              c.computed_at, ST_Distance(z.centroid::geography, p.g) / 1000.0 AS distance_km
       FROM zones z
       JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
       CROSS JOIN (
         SELECT ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography AS g
       ) p
       WHERE c.ripeness <> 'off_season'
         AND ST_DWithin(z.centroid::geography, p.g, $4)
       ORDER BY c.score DESC, distance_km ASC
       LIMIT $5`,
      [species, lng, lat, radiusKm * 1000, limit],
    );
    return {
      species,
      origin: { lat, lng },
      radius_km: radiusKm,
      zones: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        h3: row.h3,
        centroid: { lat: Number(row.lat), lng: Number(row.lng) },
        distance_km: Math.round(Number(row.distance_km) * 10) / 10,
        score: Number(row.score),
        confidence: row.confidence,
        ripeness: row.ripeness,
        updated_at: new Date(row.computed_at).toISOString(),
      })),
    };
  }

  async snapshot(
    bbox: Bbox,
    since: string | undefined,
    ifNoneMatch?: string,
  ): Promise<ConditionalResponse<Record<string, unknown>>> {
    const maxKm = this.config.get<number>('MAX_BBOX_KM_SNAPSHOT', 60);
    this.assertBboxSize(bbox, maxKm);
    const aggregate = await this.database.pool.query<AggregateRow>(
      `SELECT max(c.computed_at) AS max_computed_at, count(*)::int AS count
       FROM zones z
       JOIN zone_scores_current c ON c.zone_id = z.id
       WHERE z.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
         AND ($5::timestamptz IS NULL OR c.computed_at > $5::timestamptz)`,
      [...bbox, since ?? null],
    );
    const stats = aggregate.rows[0];
    const etag = buildEtag([
      'snapshot',
      bbox.join(','),
      since ?? '',
      stats.max_computed_at,
      stats.count,
    ]);
    if (matchesEtag(ifNoneMatch, etag)) return { etag, not_modified: true };

    const result = await this.database.pool.query<SnapshotRow>(
      `SELECT z.id, z.h3, z.name, z.forest_type,
              ST_AsGeoJSON(z.geom, 6)::json AS geometry,
              jsonb_object_agg(c.species, jsonb_build_object(
                'score', c.score,
                'confidence', c.confidence,
                'ripeness', c.ripeness,
                'updated_at', c.computed_at
              )) AS scores
       FROM zones z
       JOIN zone_scores_current c ON c.zone_id = z.id
       WHERE z.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
         AND ($5::timestamptz IS NULL OR c.computed_at > $5::timestamptz)
       GROUP BY z.id
       ORDER BY z.id`,
      [...bbox, since ?? null],
    );
    return {
      etag,
      not_modified: false,
      body: {
        type: 'FeatureCollection',
        features: result.rows.map((row) => ({
          type: 'Feature',
          id: row.id,
          geometry: row.geometry,
          properties: {
            h3: row.h3,
            name: row.name,
            forest_type: row.forest_type,
            scores: row.scores,
          },
        })),
        meta: {
          generated_at: new Date().toISOString(),
          since: since ?? null,
          bbox,
          count: result.rowCount,
        },
      },
    };
  }

  async detail(
    zoneId: string,
    origin: { lat?: number; lng?: number },
    ifNoneMatch?: string,
  ): Promise<ConditionalResponse<Record<string, unknown>>> {
    if ((origin.lat === undefined) !== (origin.lng === undefined)) {
      throw new UnprocessableEntityException(
        'lat and lng must be provided together.',
      );
    }

    const statsResult = await this.database.pool.query<ZoneStatsRow>(
      `SELECT z.id, max(c.computed_at) AS max_computed_at,
              count(DISTINCT r.id)::int AS report_count
       FROM zones z
       LEFT JOIN zone_scores_current c ON c.zone_id = z.id
       LEFT JOIN reports r ON r.zone_id = z.id
         AND r.created_at >= now() - interval '7 days'
         AND cardinality(r.flags) = 0
       WHERE z.id = $1
       GROUP BY z.id`,
      [zoneId],
    );
    const stats = statsResult.rows[0];
    if (!stats) throw new NotFoundException('Zone not found.');
    const etag = buildEtag([stats.max_computed_at, Number(stats.report_count)]);
    if (matchesEtag(ifNoneMatch, etag)) return { etag, not_modified: true };

    const zoneResult = await this.database.pool.query<ZoneDetailRow>(
      `SELECT z.id, z.h3, z.name, z.forest_type, z.area_km2,
              ST_Y(z.centroid) AS lat, ST_X(z.centroid) AS lng,
              ${
                origin.lat === undefined
                  ? 'NULL::double precision'
                  : 'ST_Distance(z.centroid::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) / 1000.0'
              } AS distance_km
       FROM zones z
       WHERE z.id = $1`,
      origin.lat === undefined ? [zoneId] : [zoneId, origin.lng, origin.lat],
    );
    const zone = zoneResult.rows[0];
    const [scoresResult, reportsResult] = await Promise.all([
      this.database.pool.query<CurrentScoreRow>(
        `SELECT species, score, confidence, ripeness, computed_at
         FROM zone_scores_current WHERE zone_id = $1 ORDER BY species`,
        [zoneId],
      ),
      this.database.pool.query<ReportAggregateRow>(
        `SELECT species, count(*)::int AS count,
                CASE WHEN count(DISTINCT user_id) >= $2
                  THEN round(avg(rating)::numeric, 1)
                  ELSE NULL
                END AS avg_rating
         FROM reports
         WHERE zone_id = $1 AND created_at >= now() - interval '7 days'
           AND cardinality(flags) = 0
         GROUP BY species ORDER BY species`,
        [zoneId, this.config.get<number>('MIN_REPORTERS_FOR_AVERAGE', 3)],
      ),
    ]);

    return {
      etag,
      not_modified: false,
      body: {
        id: zone.id,
        h3: zone.h3,
        name: zone.name,
        forest_type: zone.forest_type,
        area_km2: Number(zone.area_km2),
        centroid: { lat: Number(zone.lat), lng: Number(zone.lng) },
        ...(zone.distance_km === null
          ? {}
          : { distance_km: Math.round(Number(zone.distance_km) * 10) / 10 }),
        scores: scoresResult.rows.map((score) => ({
          species: score.species,
          score: Number(score.score),
          confidence: score.confidence,
          ripeness: score.ripeness,
          updated_at: new Date(score.computed_at).toISOString(),
        })),
        reports_7d: reportsResult.rows.map((report) => ({
          species: report.species,
          count: Number(report.count),
          avg_rating:
            report.avg_rating === null ? null : Number(report.avg_rating),
        })),
      },
    };
  }

  async explanation(
    zoneId: string,
    species: string,
    lang: 'fi' | 'en',
  ): Promise<Record<string, unknown>> {
    await this.species.validate(species);
    const result = await this.database.pool.query<ExplanationRow>(
      `SELECT explanation, computed_at
       FROM zone_scores_current
       WHERE zone_id = $1 AND species = $2`,
      [zoneId, species],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Score explanation not found.');
    const explanation = row.explanation as {
      inputs?: Record<string, unknown>;
      reasons?: unknown[];
      model_version?: string;
    };
    if (typeof explanation.model_version !== 'string') {
      throw new Error('Stored score explanation is missing model_version.');
    }
    const inputs = explanation.inputs ?? {};
    const codes = Array.isArray(explanation.reasons)
      ? explanation.reasons.filter(
          (code): code is string => typeof code === 'string',
        )
      : [];
    if (codes.length < 2) {
      this.logger.warn(
        { zone_id: zoneId, species, reason_count: codes.length },
        'Score explanation has fewer than two reasons',
      );
    }
    return {
      zone_id: zoneId,
      species,
      lang,
      reasons: codes.map((code) => ({
        code,
        text: this.explanationService.renderReason(code, inputs, lang),
      })),
      inputs,
      model_version: explanation.model_version,
      computed_at: new Date(row.computed_at).toISOString(),
    };
  }

  async history(
    zoneId: string,
    species: string,
    days: number,
  ): Promise<Record<string, unknown>> {
    await this.species.validate(species);
    const result = await this.database.pool.query<HistoryRow>(
      `SELECT DISTINCT ON (d) d AS date, score, confidence
       FROM (
         SELECT (computed_at AT TIME ZONE 'Europe/Helsinki')::date AS d,
                score, confidence, computed_at
         FROM zone_scores
         WHERE zone_id = $1 AND species = $2
           AND computed_at >= now() - make_interval(days => $3)
       ) t
       ORDER BY d, computed_at DESC`,
      [zoneId, species, days],
    );
    return {
      zone_id: zoneId,
      species,
      days,
      points: result.rows.map((point) => ({
        date: new Date(point.date).toISOString().slice(0, 10),
        score: Number(point.score),
        confidence: point.confidence,
      })),
    };
  }

  private async getDetailFeatures(
    bbox: Bbox,
    species: string,
  ): Promise<Record<string, unknown>[]> {
    const result = await this.database.pool.query<FeatureRow>(
      `SELECT z.id, z.h3, z.name,
              ST_AsGeoJSON(z.geom, 6)::json AS geometry,
              c.score, c.confidence, c.ripeness, c.computed_at
       FROM zones z
       JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
       WHERE z.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
       ORDER BY z.id`,
      [species, ...bbox],
    );
    return result.rows.map((row) => ({
      type: 'Feature',
      id: row.id,
      geometry: this.parseGeometry(row.geometry),
      properties: {
        h3: row.h3,
        name: row.name,
        species,
        score: Number(row.score),
        confidence: row.confidence,
        ripeness: row.ripeness,
        updated_at: new Date(row.computed_at).toISOString(),
      },
    }));
  }

  private async getGroupedFeatures(
    bbox: Bbox,
    species: string,
  ): Promise<Record<string, unknown>[]> {
    const result = await this.database.pool.query<GroupedRow>(
      `SELECT DISTINCT ON (z.h3_parent6)
              z.h3_parent6 AS h3, c.score, c.confidence, c.ripeness,
              c.computed_at, count(*) OVER (PARTITION BY z.h3_parent6)::int AS zone_count
       FROM zones z
       JOIN zone_scores_current c ON c.zone_id = z.id AND c.species = $1
       WHERE z.geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
       ORDER BY z.h3_parent6, c.score DESC, c.computed_at DESC`,
      [species, ...bbox],
    );
    return result.rows.map((row) => {
      const boundary = cellToBoundary(String(row.h3), true);
      const ring: number[][] = boundary.map(([lng, lat]) => [lng, lat]);
      if (ring.length) ring.push([...ring[0]]);
      return {
        type: 'Feature',
        id: row.h3,
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          h3: row.h3,
          species,
          score: Number(row.score),
          confidence: row.confidence,
          ripeness: row.ripeness,
          updated_at: new Date(row.computed_at).toISOString(),
          zone_count: Number(row.zone_count),
          grouped: true,
        },
      };
    });
  }

  private assertBboxSize(bbox: Bbox, maxKm: number): void {
    const dimensions = bboxKm(bbox);
    if (dimensions.width > maxKm || dimensions.height > maxKm) {
      throw new UnprocessableEntityException({
        error: 'BBOX_TOO_LARGE',
        message: 'Area is too large. Zoom in.',
        details: {
          max_km: maxKm,
          width_km: Math.round(dimensions.width * 10) / 10,
          height_km: Math.round(dimensions.height * 10) / 10,
        },
      });
    }
  }

  private parseGeometry(geometry: GeoJsonGeometry | string): GeoJsonGeometry {
    return typeof geometry === 'string'
      ? (JSON.parse(geometry) as GeoJsonGeometry)
      : geometry;
  }
}
