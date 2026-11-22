import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DbService } from '../db/db.service';

interface AlertRow {
  id: string;
  zone_id: string;
  zone_name: string | null;
  species: string;
  rule_id: string;
  score: number;
  confidence: string;
  ripeness: string;
  sentence: string;
  place: string | null;
  zone_number: string;
  name_en: string;
  name_fi: string;
  computed_at: Date;
  distance_m: number | null;
  latest_report_at: Date | null;
  reason_count: number;
}

/** How long an alert stays in the picker's feed. */
const ALERT_WINDOW_DAYS = 7;

@Injectable()
export class AlertsService {
  constructor(private readonly database: DbService) {}

  /**
   * Feature 6.7 layers 5–6: the reasoning job's latest alert per zone × species, filtered at
   * serve time to the picker's species interest and, when the phone sends its position, to the
   * picker's alert radius. Nearest first when the position is known, newest first otherwise.
   */
  async list(
    userId: string,
    origin: { lat?: number; lng?: number },
    limit: number,
  ): Promise<Record<string, unknown>> {
    if ((origin.lat === undefined) !== (origin.lng === undefined)) {
      throw new UnprocessableEntityException(
        'lat and lng must be provided together.',
      );
    }
    const user = await this.database.pool.query<{
      alert_radius_km: number;
      species_interest: string[];
    }>('SELECT alert_radius_km, species_interest FROM users WHERE id = $1', [
      userId,
    ]);
    const radiusKm = Number(user.rows[0]?.alert_radius_km ?? 10);
    const interest = user.rows[0]?.species_interest ?? [];
    const located = origin.lat !== undefined;

    const params: unknown[] = [ALERT_WINDOW_DAYS, interest, limit];
    let distance = 'NULL::double precision';
    let radius = '';
    if (located) {
      params.push(origin.lng, origin.lat, radiusKm * 1000);
      distance =
        'ST_Distance(z.centroid::geography, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography)';
      radius = `AND ${distance} <= $6`;
    }

    const rows = await this.database.pool.query<AlertRow>(
      `SELECT * FROM (
         SELECT DISTINCT ON (a.zone_id, a.species)
                a.id, a.zone_id, z.name AS zone_name, a.species, a.rule_id, a.score,
                a.confidence, a.ripeness, a.sentence, a.place, a.zone_number,
                a.name_en, a.name_fi, a.computed_at,
                ${distance} AS distance_m,
                (SELECT max(coalesce(r.recorded_at, r.created_at)) FROM reports r
                  WHERE r.zone_id = a.zone_id AND r.species = a.species) AS latest_report_at,
                (SELECT count(*)::int FROM alerts b
                  WHERE b.run_id = a.run_id AND b.zone_id = a.zone_id
                    AND b.species = a.species) AS reason_count
         FROM alerts a
         JOIN zones z ON z.id = a.zone_id
         WHERE a.computed_at >= now() - ($1::int * interval '1 day')
           AND (cardinality($2::text[]) = 0 OR a.species = ANY($2::text[]))
           ${radius}
         ORDER BY a.zone_id, a.species, a.computed_at DESC
       ) latest
       ORDER BY ${located ? 'distance_m ASC,' : ''} computed_at DESC, score DESC
       LIMIT $3`,
      params,
    );

    return {
      radius_km: radiusKm,
      species_interest: interest,
      alerts: rows.rows.map((row) => ({
        id: row.id,
        zone_id: row.zone_id,
        zone_name: row.zone_name,
        zone_number: row.zone_number,
        place: row.place,
        species: row.species,
        rule_id: row.rule_id,
        score: Number(row.score),
        confidence: row.confidence,
        ripeness: row.ripeness,
        sentence: row.sentence,
        name: { en: row.name_en, fi: row.name_fi },
        reason_count: Number(row.reason_count),
        distance_m:
          row.distance_m === null ? null : Math.round(Number(row.distance_m)),
        latest_report_at:
          row.latest_report_at === null
            ? null
            : new Date(row.latest_report_at).toISOString(),
        computed_at: new Date(row.computed_at).toISOString(),
      })),
    };
  }
}
