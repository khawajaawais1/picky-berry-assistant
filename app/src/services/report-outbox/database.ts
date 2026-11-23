import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

/**
 * Opens the app's durable database and applies the report queue's schema.
 *
 * The database is a single file (`picky.db`) shared by every offline store the app
 * keeps. Creating the table with `IF NOT EXISTS` is what makes a launch after an
 * upgrade safe: a table that already exists is left untouched, and a fresh install
 * gets one.
 *
 * Plain module, deliberately: no React here, so any caller can use it.
 */
export function openReportDatabase(): ReturnType<typeof drizzle> {
  const db = SQLite.openDatabaseSync('picky.db');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS reports (
      client_id TEXT PRIMARY KEY NOT NULL,
      zone_id TEXT NOT NULL,
      species_id TEXT NOT NULL,
      yield_rating INTEGER NOT NULL,
      amount_text TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      recorded_at TEXT NOT NULL,
      visit_id TEXT,
      zone_name TEXT
    );
  `);
  return drizzle(db, { schema });
}

export type ReportDatabase = ReturnType<typeof openReportDatabase>;
