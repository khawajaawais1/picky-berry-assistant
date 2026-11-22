import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { MapQueryDto } from './dto/map-query.dto';

/** The pilot has ~3,500 zones; the cap keeps one response bounded if that grows. */
export const MAP_SPOT_LIMIT = 10_000;

export interface MapSpot {
  id: string;
  h3: string;
  name: string | null;
  forest_type: string | null;
  lat: number;
  lng: number;
  best_score: number | null;
  species_scored: number;
  reports_total: number;
  latest_computed_at: string | null;
}

export interface MapBounds {
  min_lat: number;
  min_lng: number;
  max_lat: number;
  max_lng: number;
}

export interface AdminMap {
  generated_at: string;
  species: string | null;
  total: number;
  truncated: boolean;
  bounds: MapBounds | null;
  spots: MapSpot[];
}

interface SpotRow {
  id: string;
  h3: string;
  name: string | null;
  forest_type: string | null;
  lat: number;
  lng: number;
  best_score: number | null;
  species_scored: number;
  reports_total: number;
  latest_computed_at: Date | null;
  total: number;
}

/**
 * Every zone ("spot") with a centroid, for the operator map. Unlike the public
 * /zones endpoint this is not limited to a bounding box: the console needs the
 * whole pilot area at once. Points only — polygons stay on the zone page.
 */
@Injectable()
export class AdminMapService {
  constructor(private readonly database: DbService) {}

  async spots(query: MapQueryDto, now: Date = new Date()): Promise<AdminMap> {
    const species = (query.species ?? '').trim() || null;
    const result = await this.database.pool.query<SpotRow>(
      `SELECT z.id, z.h3::text AS h3, z.name, z.forest_type,
              ST_Y(z.centroid)::float8 AS lat, ST_X(z.centroid)::float8 AS lng,
              max(c.score)::int AS best_score,
              count(c.species)::int AS species_scored,
              (SELECT count(*) FROM reports r WHERE r.zone_id = z.id)::int AS reports_total,
              max(c.computed_at) AS latest_computed_at,
              count(*) OVER ()::int AS total
       FROM zones z
       LEFT JOIN zone_scores_current c
         ON c.zone_id = z.id AND ($1::text IS NULL OR c.species = $1)
       WHERE z.centroid IS NOT NULL
         AND ($1::text IS NULL OR EXISTS (
           SELECT 1 FROM zone_scores_current c2
           WHERE c2.zone_id = z.id AND c2.species = $1))
       GROUP BY z.id
       ORDER BY z.id
       LIMIT $2`,
      [species, MAP_SPOT_LIMIT],
    );

    const spots = result.rows.map(
      (row): MapSpot => ({
        id: row.id,
        h3: row.h3,
        name: row.name,
        forest_type: row.forest_type,
        lat: row.lat,
        lng: row.lng,
        best_score: row.best_score,
        species_scored: row.species_scored,
        reports_total: row.reports_total,
        latest_computed_at: row.latest_computed_at
          ? row.latest_computed_at.toISOString()
          : null,
      }),
    );
    const total = result.rows[0]?.total ?? 0;

    return {
      generated_at: now.toISOString(),
      species,
      total,
      truncated: total > spots.length,
      bounds: boundsOf(spots),
      spots,
    };
  }
}

export function boundsOf(
  spots: Pick<MapSpot, 'lat' | 'lng'>[],
): MapBounds | null {
  if (spots.length === 0) return null;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const { lat, lng } of spots) {
    minLat = Math.min(minLat, lat);
    minLng = Math.min(minLng, lng);
    maxLat = Math.max(maxLat, lat);
    maxLng = Math.max(maxLng, lng);
  }
  return { min_lat: minLat, min_lng: minLng, max_lat: maxLat, max_lng: maxLng };
}
