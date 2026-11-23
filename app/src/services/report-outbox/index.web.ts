/**
 * Web has no native SQLite, so the durable report outbox is unavailable there. The report queue
 * (`report-queue.ts`) catches the throw from `openReportDatabase` and keeps its AsyncStorage
 * fallback, which is the path the web export and the unit suite exercise.
 *
 * This file exists so Metro never pulls `expo-sqlite` (and its `.wasm` worker) into the web bundle.
 * Its signatures mirror `index.ts` so TypeScript's `moduleSuffixes` resolution stays consistent;
 * every function throws before doing anything.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function openReportDatabase(): any {
  throw new Error('no native SQLite on web');
}

export type ReportDatabase = any;

export const reports: any = null;
export type ReportRow = any;
export type NewReportRow = any;

export async function readReportOutbox(_db: any): Promise<any[]> {
  throw new Error('no native SQLite on web');
}

export async function enqueueReportOutbox(_db: any, _report: any): Promise<any[]> {
  throw new Error('no native SQLite on web');
}

export async function removeQueuedReportOutbox(_db: any, _clientId: string): Promise<any[]> {
  throw new Error('no native SQLite on web');
}

export async function clearReportOutbox(_db: any): Promise<void> {
  throw new Error('no native SQLite on web');
}