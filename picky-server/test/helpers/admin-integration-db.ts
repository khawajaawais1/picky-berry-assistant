import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
export const PICKER_ID = '00000000-0000-4000-8000-0000000000b1';
export const TARGET_ID = '00000000-0000-4000-8000-0000000000c1';
export const ZONE_ID = '41d28714-df79-4218-bb99-308bca35cd6c';
export const LOW_REPORT_ID = '10000000-0000-4000-8000-000000000001';
export const HIGH_REPORT_ID = '10000000-0000-4000-8000-000000000002';

export interface AdminFixtures {
  adminId: string;
  pickerId: string;
  targetId: string;
  zoneId: string;
  lowReportId: string;
  highReportId: string;
  failedJobId: number;
  runningJobId: number;
  queuedJobId: number;
}

export interface AdminIntegrationDatabase {
  container: StartedPostgreSqlContainer;
  pool: Pool;
  connectionString: string;
}

/**
 * The official PostGIS image is amd64-only for 17-3.5. Apple Silicon needs the
 * multi-architecture imresamu build. CI can pin either through POSTGIS_TEST_IMAGE.
 */
export function postgisTestImage(): string {
  return (
    process.env.POSTGIS_TEST_IMAGE ??
    (process.arch === 'arm64'
      ? 'imresamu/postgis:17-3.5'
      : 'postgis/postgis:17-3.5')
  );
}

export async function startAdminIntegrationDatabase(): Promise<AdminIntegrationDatabase> {
  const container = await new PostgreSqlContainer(postgisTestImage())
    .withDatabase('picky_admin_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  const connectionString = container.getConnectionUri();
  const pool = new Pool({
    connectionString,
    max: 10,
    options: '-c search_path=public,extensions',
  });

  try {
    await pool.query(
      await readFile(
        path.resolve(__dirname, '../fixtures/admin-integration-baseline.sql'),
        'utf8',
      ),
    );

    const migrationsDirectory = path.resolve(__dirname, '../../migrations');
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of migrationFiles) {
      const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
      const up = sql.split('-- Down Migration')[0];
      await pool.query(up);
    }

    return { container, pool, connectionString };
  } catch (error) {
    await pool.end();
    await container.stop();
    throw error;
  }
}

export async function resetAdminFixtures(pool: Pool): Promise<AdminFixtures> {
  await pool.query(
    `TRUNCATE TABLE audit_log, reports, visits, refresh_tokens, user_trust,
       zone_scores_current, zone_scores, jobs, zone_species, zones, species,
       users, ingest_runs
     RESTART IDENTITY CASCADE`,
  );

  await pool.query(
    `INSERT INTO species
       (code, latin, name_fi, name_en, colour, season_start_doy, season_end_doy)
     VALUES
       ('bilberry', 'Vaccinium myrtillus', 'Mustikka', 'Bilberry', '#5b4a9e', 150, 240),
       ('lingonberry', 'Vaccinium vitis-idaea', 'Puolukka', 'Lingonberry', '#a13d5a', 160, 250)`,
  );

  await pool.query(
    `INSERT INTO zones
       (id, h3, h3_parent6, name, forest_type, fertility_class, area_km2,
        centroid, geom, source_version)
     VALUES
       ($1, '8811964d9dfffff', '8811964d9dfffff', 'Laajavuori', 'spruce', 2, 1.2,
        ST_SetSRID(ST_MakePoint(25.7, 62.2), 4326),
        ST_GeomFromText(
          'POLYGON((25.69 62.19,25.71 62.19,25.71 62.21,25.69 62.21,25.69 62.19))',
          4326
        ),
        'integration-test')`,
    [ZONE_ID],
  );

  await pool.query(
    `INSERT INTO zone_species (zone_id, species, suitability, rules_version)
     VALUES ($1, 'bilberry', 0.9, 'test-rules'),
            ($1, 'lingonberry', 0.7, 'test-rules')`,
    [ZONE_ID],
  );

  await pool.query(
    `INSERT INTO zone_scores_current
       (zone_id, species, score, confidence, ripeness, s_model, n_eff,
        band_width, explanation, computed_at)
     VALUES
       ($1, 'bilberry', 80, 'high', 'ripe', 80, 0, 50,
        '{"version":1,"model_version":"test-scorer"}'::jsonb, now()),
       ($1, 'lingonberry', 65, 'medium', 'ripening', 65, 0, 50,
        '{"version":1,"model_version":"test-scorer"}'::jsonb, now())`,
    [ZONE_ID],
  );

  await pool.query(
    `INSERT INTO users
       (id, email, password_hash, nickname, role, lang, privacy_level,
        background_location, alert_radius_km, species_interest, email_verified_at)
     VALUES
       ($1, 'admin@example.com', 'unused', 'Admin', 'admin', 'en', 'private',
        false, 10, ARRAY['bilberry'], now()),
       ($2, 'picker@example.com', 'unused', 'Picker', 'picker', 'en', 'private',
        false, 10, ARRAY['bilberry'], now()),
       ($3, 'target@example.com', 'unused', 'Target', 'picker', 'fi', 'shared',
        false, 25, ARRAY['lingonberry'], now())`,
    [ADMIN_ID, PICKER_ID, TARGET_ID],
  );

  await pool.query(
    `INSERT INTO user_trust (user_id, trust)
     VALUES ($1, 0.8), ($2, 0.4), ($3, 0.9)`,
    [ADMIN_ID, PICKER_ID, TARGET_ID],
  );

  await pool.query(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, expires_at, revoked_at, user_agent)
     VALUES
       ($1, 'active-token', now() + interval '1 day', NULL, 'Safari'),
       ($1, 'expired-token', now() - interval '1 day', NULL, 'Safari'),
       ($1, 'revoked-token', now() + interval '1 day',
        now() - interval '1 hour', 'Chrome')`,
    [PICKER_ID],
  );

  await pool.query(
    `INSERT INTO reports (id, user_id, zone_id, species, rating, created_at)
     VALUES
       ($1, $2, $4, 'bilberry', 2, now() - interval '1 day'),
       ($3, $5, $4, 'lingonberry', 5, now() - interval '2 days')`,
    [LOW_REPORT_ID, PICKER_ID, HIGH_REPORT_ID, ZONE_ID, TARGET_ID],
  );

  const failedJob = await pool.query<{ id: string }>(
    `INSERT INTO jobs
       (type, payload, dedupe_key, status, attempts, run_at, finished_at, last_error)
     VALUES
       ('recompute_all', '{}', 'failed-source', 'failed', 2,
        now() - interval '1 day', now() - interval '1 hour', 'worker exploded')
     RETURNING id`,
  );
  const runningJob = await pool.query<{ id: string }>(
    `INSERT INTO jobs
       (type, payload, dedupe_key, status, attempts, run_at, locked_at)
     VALUES
       ('recompute_all', '{}', 'running-source', 'running', 1, now(), now())
     RETURNING id`,
  );
  const queuedJob = await pool.query<{ id: string }>(
    `INSERT INTO jobs (type, payload, dedupe_key, status, run_at)
     VALUES
       ('recompute_all', '{}', 'queued-source', 'queued',
        now() - interval '20 minutes')
     RETURNING id`,
  );

  await pool.query(
    `INSERT INTO ingest_runs
       (source, started_at, finished_at, status, rows)
     VALUES
       ('weather', now() - interval '2 hours', now() - interval '1 hour 50 minutes',
        'ok', 1200)`,
  );

  return {
    adminId: ADMIN_ID,
    pickerId: PICKER_ID,
    targetId: TARGET_ID,
    zoneId: ZONE_ID,
    lowReportId: LOW_REPORT_ID,
    highReportId: HIGH_REPORT_ID,
    failedJobId: Number(failedJob.rows[0].id),
    runningJobId: Number(runningJob.rows[0].id),
    queuedJobId: Number(queuedJob.rows[0].id),
  };
}
