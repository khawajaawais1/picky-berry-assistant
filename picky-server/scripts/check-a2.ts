import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

async function checkAcceptanceA2(): Promise<void> {
  const config = validateEnvironment(process.env);
  const pool = new Pool({
    connectionString: String(config.DATABASE_URL),
    max: 1,
    ssl: config.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
    options: '-c search_path=public,extensions',
  });
  try {
    const sql = await readFile(
      resolve(process.cwd(), 'scripts', 'check-a2.sql'),
      'utf8',
    );
    const result = await pool.query<{ zone_id: string; species: string }>(sql);
    if (result.rows.length > 0) {
      console.error(
        `A2 failed: ${result.rows.length} zone/species pairs have no current score.`,
      );
      console.error(JSON.stringify(result.rows));
      process.exitCode = 1;
      return;
    }
    console.log('A2 passed: every zone/species pair has a current score.');
  } finally {
    await pool.end();
  }
}

void checkAcceptanceA2().catch((error: unknown) => {
  console.error('A2 data check failed:', error);
  process.exitCode = 1;
});
