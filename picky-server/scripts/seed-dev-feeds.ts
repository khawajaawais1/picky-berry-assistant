import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

/**
 * Development fixture for the picker feeds the app reads (alerts and the marketplace), so a
 * local stack shows them before the reasoning job and real sellers exist. Alerts are derived
 * from the current zone scores, the way run_reasoning's "ripe and high" rule would; listings
 * belong to a development seller account. Refuses to run in production; safe to re-run.
 */
const SPECIES_NAMES: Record<string, { en: string; fi: string }> = {
  bilberry: { en: 'Bilberry', fi: 'Mustikka' },
  lingonberry: { en: 'Lingonberry', fi: 'Puolukka' },
  cloudberry: { en: 'Cloudberry', fi: 'Lakka' },
  crowberry: { en: 'Crowberry', fi: 'Variksenmarja' },
};

async function seed(): Promise<void> {
  const config = validateEnvironment(process.env);
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development feeds in production.');
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

    // Alerts: one fresh run of the "high score, ripe or ripening" rule over the current scores.
    const run = await client.query<{ id: string }>(
      `INSERT INTO alert_rules_log (rule_id, rule_version, status)
       VALUES ('ripe_high_yield', 'dev-1', 'ok') RETURNING id`,
    );
    const candidates = await client.query<{
      zone_id: string;
      name: string | null;
      species: string;
      score: number;
      confidence: 'high' | 'medium' | 'low';
      ripeness: 'unripe' | 'ripening' | 'ripe' | 'past';
      suitability: number;
    }>(
      `SELECT c.zone_id, z.name, c.species, c.score, c.confidence, c.ripeness,
              coalesce(s.suitability, 0.5) AS suitability
       FROM zone_scores_current c
       JOIN zones z ON z.id = c.zone_id
       LEFT JOIN zone_species s ON s.zone_id = c.zone_id AND s.species = c.species
       WHERE c.score >= 60 AND c.ripeness IN ('ripe', 'ripening')
       ORDER BY c.score DESC
       LIMIT 25`,
    );
    for (const row of candidates.rows) {
      const names = SPECIES_NAMES[row.species] ?? {
        en: row.species,
        fi: row.species,
      };
      const zoneName = row.name ?? 'Pilot zone';
      await client.query(
        `INSERT INTO alerts
           (run_id, zone_id, species, rule_id, rule_version, score, confidence, ripeness,
            suitability, sentence, place, zone_number, zone_iri, species_iri, name_en, name_fi)
         VALUES ($1, $2, $3, 'ripe_high_yield', 'dev-1', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          run.rows[0].id,
          row.zone_id,
          row.species,
          row.score,
          row.confidence,
          row.ripeness,
          Math.min(1, Math.max(0, Number(row.suitability))),
          `${names.en} in ${zoneName} scores ${row.score}/100 and is ${row.ripeness}.`,
          zoneName.replace(/\s*\d+$/, ''),
          zoneName.match(/(\d+)$/)?.[1] ?? '1',
          `https://picky.fi/zone/${row.zone_id}`,
          `https://picky.fi/species/${row.species}`,
          names.en,
          names.fi,
        ],
      );
    }
    await client.query(
      `UPDATE alert_rules_log SET zone_count = $2, alert_count = $2 WHERE id = $1`,
      [run.rows[0].id, candidates.rowCount],
    );

    // Marketplace: a development seller with a few listings near the pilot area.
    const seller = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role, nickname, email_verified_at)
       VALUES ('seller@example.com', $1, 'picker', 'Matti L.', now())
       ON CONFLICT (lower(email)) WHERE deleted_at IS NULL
       DO UPDATE SET nickname = EXCLUDED.nickname
       RETURNING id`,
      [await hash(randomUUID())],
    );
    const sellerId = seller.rows[0].id;
    await client.query('DELETE FROM market_listings WHERE seller_id = $1', [
      sellerId,
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const listings = [
      [
        'bilberry',
        'Fresh bilberries',
        800,
        20,
        'Laajavuori',
        25.69,
        62.255,
        'Laajavuori car park',
        '17:00–19:00',
      ],
      [
        'lingonberry',
        'Wild lingonberries',
        600,
        8,
        'Palokka',
        25.72,
        62.29,
        'Palokka school yard',
        '16:00–18:00',
      ],
      [
        'cloudberry',
        'Hand-picked cloudberries',
        2200,
        3,
        'Vaajakoski',
        25.88,
        62.245,
        'Vaajakoski harbour',
        '18:00–20:00',
      ],
    ] as const;
    for (const [
      species,
      title,
      price,
      kg,
      area,
      lng,
      lat,
      pickup,
      window,
    ] of listings) {
      await client.query(
        `INSERT INTO market_listings
           (seller_id, species, title, price_cents, available_kg, area, town, location,
            harvested_on, pickup_place, pickup_window)
         VALUES ($1, $2, $3, $4, $5, $6, 'Jyväskylä', ST_SetSRID(ST_MakePoint($7, $8), 4326),
                 $9, $10, $11)`,
        [
          sellerId,
          species,
          title,
          price,
          kg,
          area,
          lng,
          lat,
          today,
          pickup,
          window,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Seeded ${candidates.rowCount} alerts and ${listings.length} market listings (seller@example.com).`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void seed().catch((error: unknown) => {
  console.error('Development feed seeding failed:', error);
  process.exitCode = 1;
});
