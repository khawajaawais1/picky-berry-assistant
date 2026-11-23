import { eq } from 'drizzle-orm';

import { randomUUID } from 'expo-crypto';

import type { ReportDatabase } from './database';
import { reports, type NewReportRow, type ReportRow } from './schema';

import type { VisitReport, YieldRating } from '../report-queue';
import { validateReport } from '../report-queue';

/**
 * The report queue backed by SQLite/Drizzle (feature 6.9, offline mode).
 *
 * This module owns the durable storage. The same validation that `report-queue.ts`
 * applies is applied here, so a report the app could not have produced is never
 * written. The public API matches `report-queue.ts` so callers do not change.
 *
 * Plain module, deliberately: no React here.
 */

/** A version-4 UUID: the platform's, or one built here where the platform gives none. */
function newClientId(): string {
  const platform = randomUUID();
  if (typeof platform === 'string' && platform !== '') return platform;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function rowToReport(row: ReportRow): VisitReport {
  return {
    amountText: row.amountText,
    clientId: row.clientId,
    minutes: row.minutes,
    recordedAt: row.recordedAt,
    speciesId: row.speciesId,
    yieldRating: row.yieldRating as YieldRating,
    zoneId: row.zoneId,
    ...(row.visitId ? { visitId: row.visitId } : {}),
    ...(row.zoneName ? { zoneName: row.zoneName } : {}),
  };
}

function reportToRow(report: VisitReport): NewReportRow {
  return {
    amountText: report.amountText,
    clientId: report.clientId ?? newClientId(),
    minutes: report.minutes,
    recordedAt: report.recordedAt,
    speciesId: report.speciesId,
    yieldRating: report.yieldRating,
    visitId: report.visitId ?? null,
    zoneId: report.zoneId,
    zoneName: report.zoneName ?? null,
  };
}

/** Reads the queued reports, oldest first. */
export async function readReportOutbox(db: ReportDatabase): Promise<VisitReport[]> {
  const rows = await db.select().from(reports).orderBy(reports.recordedAt);
  return rows.map(rowToReport);
}

/** Appends a report and returns the queue as it now stands. */
export async function enqueueReportOutbox(
  db: ReportDatabase,
  report: VisitReport,
): Promise<VisitReport[]> {
  validateReport(report);
  const row = reportToRow(report);
  await db.insert(reports).values(row).onConflictDoNothing();
  return readReportOutbox(db);
}

/** Removes one sent report and returns what remains. */
export async function removeQueuedReportOutbox(
  db: ReportDatabase,
  clientId: string,
): Promise<VisitReport[]> {
  await db.delete(reports).where(eq(reports.clientId, clientId));
  return readReportOutbox(db);
}

/** Deletes the whole queue. */
export async function clearReportOutbox(db: ReportDatabase): Promise<void> {
  await db.delete(reports);
}
