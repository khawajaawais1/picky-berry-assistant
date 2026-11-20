import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

type Ripeness = 'unripe' | 'ripening' | 'ripe' | 'past' | 'off_season';

function stableScore(
  zoneId: string,
  species: string,
  suitability: number,
): number {
  const digest = createHash('sha256').update(`${zoneId}:${species}`).digest();
  const modelScore = digest.readUInt16BE(0) % 101;
  return Math.max(0, Math.min(100, Math.round(modelScore * suitability)));
}

async function seed(): Promise<void> {
  const config = validateEnvironment(process.env);
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development scores in production.');
  }
  const pool = new Pool({
    connectionString: String(config.DATABASE_URL),
    max: 2,
    ssl: config.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
    options: '-c search_path=public,extensions',
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pairs = await client.query<{
      zone_id: string;
      species: string;
      suitability: number;
    }>(
      `SELECT zone_id, species, suitability
       FROM zone_species
       WHERE suitability > 0
       ORDER BY zone_id, species`,
    );
    const computedAt = new Date();
    computedAt.setUTCHours(0, 0, 0, 0);
    for (const pair of pairs.rows) {
      const score = stableScore(
        pair.zone_id,
        pair.species,
        Number(pair.suitability),
      );
      const ripeness: Ripeness[] = [
        'unripe',
        'ripening',
        'ripe',
        'past',
        'off_season',
      ];
      const seedByte = createHash('sha256')
        .update(`${pair.zone_id}:${pair.species}`)
        .digest()[2];
      const state = ripeness[seedByte % ripeness.length];
      const gddValues: Record<Ripeness, number> = {
        unripe: 400,
        ripening: 700,
        ripe: 812,
        past: 1000,
        off_season: 0,
      };
      const explanation = {
        version: 1,
        inputs: {
          gdd_since_apr1: gddValues[state],
          gdd_ripe: 780,
          reports_7d: 0,
          avg_rating_7d: null,
          suitability: Number(pair.suitability),
        },
        reasons: [
          {
            unripe: 'unripe_by_gdd',
            ripening: 'ripening_by_gdd',
            ripe: 'ripe_by_gdd',
            past: 'past_by_gdd',
            off_season: 'off_season',
          }[state],
          'no_reports_baseline',
        ],
        model_version: 'seed-0',
      };
      const values = [
        pair.zone_id,
        pair.species,
        score,
        score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
        state,
        JSON.stringify(explanation),
        computedAt,
      ];
      await client.query(
        `INSERT INTO zone_scores
           (zone_id, species, computed_at, score, confidence, ripeness, explanation)
         VALUES ($1, $2, $7, $3, $4, $5, $6::jsonb)
         ON CONFLICT (zone_id, species, computed_at) DO UPDATE
         SET score = EXCLUDED.score, confidence = EXCLUDED.confidence,
             ripeness = EXCLUDED.ripeness, explanation = EXCLUDED.explanation`,
        values,
      );
      await client.query(
        `INSERT INTO zone_scores_current
           (zone_id, species, score, confidence, ripeness, explanation, computed_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         ON CONFLICT (species, zone_id) DO UPDATE
         SET score = EXCLUDED.score, confidence = EXCLUDED.confidence,
             ripeness = EXCLUDED.ripeness, explanation = EXCLUDED.explanation,
             computed_at = EXCLUDED.computed_at`,
        values,
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${pairs.rowCount} zone/species score pairs.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void seed().catch((error: unknown) => {
  console.error('Development score seeding failed:', error);
  process.exitCode = 1;
});
