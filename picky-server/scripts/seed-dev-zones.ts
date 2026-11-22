import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cellToParent } from 'h3-js';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

/**
 * Local-only geography stub: loads the committed 50-zone GeoJSON fixture into the reference
 * tables, so the API, the map and the admin console have something real to read before the
 * data engineer's backfill lands. It refuses to run in production and marks every row with a
 * stub source version.
 */

interface StubZoneFeature {
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  properties: {
    h3: string;
    name?: string;
    forest_type?: string;
    scores?: Record<string, { score?: number }>;
  };
}

interface StubZoneCollection {
  type: 'FeatureCollection';
  features: StubZoneFeature[];
}

const SPECIES = [
  {
    code: 'bilberry',
    latin: 'Vaccinium myrtillus',
    name_fi: 'mustikka',
    name_en: 'bilberry',
    colour: '#5b4a9e',
    season_start_doy: 190,
    season_end_doy: 260,
  },
  {
    code: 'lingonberry',
    latin: 'Vaccinium vitis-idaea',
    name_fi: 'puolukka',
    name_en: 'lingonberry',
    colour: '#c0392b',
    season_start_doy: 200,
    season_end_doy: 280,
  },
  {
    code: 'cloudberry',
    latin: 'Rubus chamaemorus',
    name_fi: 'lakka (hilla)',
    name_en: 'cloudberry',
    colour: '#e39b2b',
    season_start_doy: 170,
    season_end_doy: 230,
  },
  {
    code: 'crowberry',
    latin: 'Empetrum nigrum',
    name_fi: 'variksenmarja',
    name_en: 'crowberry',
    colour: '#2f6f5e',
    season_start_doy: 180,
    season_end_doy: 250,
  },
];

async function seedZones(): Promise<void> {
  const config = validateEnvironment(process.env);
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to seed stub zones in production.');
  }
  const fixturePath = resolve(__dirname, '../../data/test_zones.geojson');
  const fixture = JSON.parse(
    readFileSync(fixturePath, 'utf8'),
  ) as StubZoneCollection;
  if (!Array.isArray(fixture.features) || fixture.features.length === 0) {
    throw new Error(`No features in ${fixturePath}.`);
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
    for (const species of SPECIES) {
      await client.query(
        `INSERT INTO species
           (code, latin, name_fi, name_en, colour, season_start_doy, season_end_doy)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE
         SET latin = EXCLUDED.latin, name_fi = EXCLUDED.name_fi,
             name_en = EXCLUDED.name_en, colour = EXCLUDED.colour,
             season_start_doy = EXCLUDED.season_start_doy,
             season_end_doy = EXCLUDED.season_end_doy`,
        [
          species.code,
          species.latin,
          species.name_fi,
          species.name_en,
          species.colour,
          species.season_start_doy,
          species.season_end_doy,
        ],
      );
    }

    let zoneSpeciesRows = 0;
    for (const feature of fixture.features) {
      const h3 = feature.properties.h3;
      if (!h3) throw new Error('Fixture feature is missing properties.h3.');
      const forestType = feature.properties.forest_type ?? 'forest_unknown';
      const parent = cellToParent(h3, 6);
      const geometry = JSON.stringify(feature.geometry);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO zones
           (h3, h3_parent6, name, forest_type, forest_fraction, mire_fraction,
            habitat, fertility_class, area_km2, centroid, geom, source_version)
         VALUES (
           $1, $2, $3, $4, 0.8, 0.2, $5::jsonb, 3,
           ST_Area(ST_GeomFromGeoJSON($6)::geography) / 1000000.0,
           ST_Centroid(ST_GeomFromGeoJSON($6)),
           ST_GeomFromGeoJSON($6),
           'test_zones.geojson/stub/v1')
         ON CONFLICT (h3) DO UPDATE
         SET name = EXCLUDED.name, forest_type = EXCLUDED.forest_type,
             habitat = EXCLUDED.habitat, area_km2 = EXCLUDED.area_km2,
             centroid = EXCLUDED.centroid, geom = EXCLUDED.geom,
             source_version = EXCLUDED.source_version
         RETURNING id`,
        [
          h3,
          parent,
          feature.properties.name ?? null,
          forestType,
          JSON.stringify({ source: 'test_zones.geojson', stub: true }),
          geometry,
        ],
      );
      const zoneId = inserted.rows[0].id;
      for (const species of SPECIES) {
        const fixtureScore = feature.properties.scores?.[species.code]?.score;
        const suitability = Math.max(
          0.05,
          Math.min(1, (fixtureScore ?? 50) / 100),
        );
        await client.query(
          `INSERT INTO zone_species (zone_id, species, suitability, rules_version)
           VALUES ($1, $2, $3, 'seed-dev')
           ON CONFLICT (zone_id, species) DO UPDATE
           SET suitability = EXCLUDED.suitability,
               rules_version = EXCLUDED.rules_version`,
          [zoneId, species.code, suitability],
        );
        zoneSpeciesRows += 1;
      }
    }
    await client.query('COMMIT');
    console.log(
      `Seeded ${fixture.features.length} stub zones and ${zoneSpeciesRows} zone/species rows from ${fixturePath}.`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void seedZones().catch((error: unknown) => {
  console.error('Stub zone seeding failed:', error);
  process.exitCode = 1;
});
