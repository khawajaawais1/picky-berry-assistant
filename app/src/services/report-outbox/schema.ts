import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The report queue's durable table (feature 6.9, offline mode).
 *
 * One row per queued visit report, keyed by the client id the app mints when it
 * enqueues the report. The server records a report once per id, so a send retried
 * after a lost answer cannot record it twice.
 *
 * Plain Drizzle schema, deliberately: no React here, so any caller can use it.
 */
export const reports = sqliteTable('reports', {
  /** The app's own id for the report, generated when it is queued. */
  clientId: text('client_id').primaryKey(),
  /** The zone the visit was in, by the API's id for it. */
  zoneId: text('zone_id').notNull(),
  /** The species the report is about, as an identifier the catalogue names. */
  speciesId: text('species_id').notNull(),
  /** What the picker said they found, 1–5. */
  yieldRating: integer('yield_rating').notNull(),
  /** What the picker said they harvested, exactly as typed, or '' when skipped. */
  amountText: text('amount_text').notNull(),
  /** How long the visit lasted, in whole minutes. */
  minutes: integer('minutes').notNull(),
  /** When the visit ended — the moment the report was saved, ISO-8601. */
  recordedAt: text('recorded_at').notNull(),
  /** The tracked visit the report belongs to, when there was one. */
  visitId: text('visit_id'),
  /** The zone's name as the tracker knew it, for the history row. */
  zoneName: text('zone_name'),
});

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
