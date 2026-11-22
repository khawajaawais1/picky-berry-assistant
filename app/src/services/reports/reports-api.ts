import { failureVerdict, type ApiClient, type ApiFailure } from '@/services/api';
import { readReportQueue, removeQueuedReport, type VisitReport } from '@/services/report-queue';

/**
 * The picker reports the API holds (features 6.4 and 6.8): sending a queued report, a zone's
 * recent reports, the picker's own and their season figures. Every read throws `ReportsReadError`
 * on a failure, so a screen says it could not read rather than drawing an empty answer.
 */
export class ReportsReadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the reports could not be read (${failure.kind})`);
    this.name = 'ReportsReadError';
  }
}

export type ReportTrust = 'trusted' | 'unverified';

export type ZoneReport = {
  id: string;
  species: string;
  rating: number;
  amountKg: number | null;
  minutes: number | null;
  trust: ReportTrust;
  recordedAt: string;
};

export type ZoneReportPage = {
  zoneId: string;
  zoneName: string | null;
  countThisWeek: number;
  reports: ZoneReport[];
};

export type OwnReport = {
  id: string;
  clientId: string | null;
  zoneId: string;
  zoneName: string | null;
  species: string;
  rating: number;
  amountKg: number | null;
  minutes: number | null;
  recordedAt: string;
};

export type Season = {
  year: number;
  visitCount: number;
  reportCount: number;
  zonesVisited: number;
  stayHours: number;
  medianMinutes: number | null;
  harvestedKg: number;
  kgPerHour: number | null;
  harvestByReport: {
    reportId: string;
    zoneName: string | null;
    kilograms: number;
    recordedAt: string;
  }[];
};

export type SendOutcome = 'recorded' | 'retry' | 'refused';

export type ReportsApi = {
  send(report: VisitReport): Promise<SendOutcome>;
  forZone(zoneId: string, species?: string): Promise<ZoneReportPage>;
  mine(): Promise<OwnReport[]>;
  season(): Promise<Season>;
};

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** The picker's typed harvest ("1,3", "1.3 kg") as kilograms, or nothing when it is not one. */
export function parseKilograms(text: string): number | null {
  const match = /^\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg)?\s*$/i.exec(text);
  if (!match) return null;

  const value = Number(match[1]!.replace(',', '.'));
  return value >= 0 && value <= 500 ? value : null;
}

function parseZoneReport(value: unknown): ZoneReport | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const species = str(value.species);
  const rating = num(value.rating);
  const recordedAt = str(value.recorded_at);
  if (!id || !species || rating === null || !recordedAt) return null;

  return {
    id,
    species,
    rating,
    amountKg: num(value.amount_kg),
    minutes: num(value.minutes),
    trust: value.trust === 'trusted' ? 'trusted' : 'unverified',
    recordedAt,
  };
}

export function parseZoneReportPage(body: unknown): ZoneReportPage | null {
  if (!isRecord(body) || !Array.isArray(body.reports)) return null;
  const zoneId = str(body.zone_id);
  if (!zoneId) return null;

  return {
    zoneId,
    zoneName: str(body.zone_name),
    countThisWeek: num(body.count_7d) ?? 0,
    reports: body.reports.map(parseZoneReport).filter((r): r is ZoneReport => r !== null),
  };
}

function parseOwnReport(value: unknown): OwnReport | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const zoneId = str(value.zone_id);
  const species = str(value.species);
  const rating = num(value.rating);
  const recordedAt = str(value.recorded_at);
  if (!id || !zoneId || !species || rating === null || !recordedAt) return null;

  return {
    id,
    clientId: str(value.client_id),
    zoneId,
    zoneName: str(value.zone_name),
    species,
    rating,
    amountKg: num(value.amount_kg),
    minutes: num(value.minutes),
    recordedAt,
  };
}

export function parseSeason(body: unknown): Season | null {
  if (!isRecord(body) || !Array.isArray(body.harvest_by_report)) return null;
  const year = num(body.year);
  if (year === null) return null;

  return {
    year,
    visitCount: num(body.visit_count) ?? 0,
    reportCount: num(body.report_count) ?? 0,
    zonesVisited: num(body.zones_visited) ?? 0,
    stayHours: num(body.stay_hours) ?? 0,
    medianMinutes: num(body.median_minutes),
    harvestedKg: num(body.harvested_kg) ?? 0,
    kgPerHour: num(body.kg_per_hour),
    harvestByReport: body.harvest_by_report.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const reportId = str(entry.report_id);
      const kilograms = num(entry.kilograms);
      const recordedAt = str(entry.recorded_at);
      return reportId && kilograms !== null && recordedAt
        ? [{ reportId, zoneName: str(entry.zone_name), kilograms, recordedAt }]
        : [];
    }),
  };
}

export function createReportsApi({ client }: { client: ApiClient }): ReportsApi {
  async function read<T>(path: string, parse: (body: unknown) => T | null, query?: Json) {
    const result = await client.request({
      method: 'GET',
      path,
      query: query as Record<string, string | undefined>,
      parse,
    });
    if (!result.ok) throw new ReportsReadError(result.error);
    return result.data;
  }

  return {
    async send(report) {
      if (!report.clientId) return 'refused';
      const amountKg = parseKilograms(report.amountText);
      const result = await client.request({
        method: 'POST',
        path: '/reports',
        body: {
          client_id: report.clientId,
          zone_id: report.zoneId,
          species: report.speciesId,
          rating: report.yieldRating,
          minutes: report.minutes,
          recorded_at: report.recordedAt,
          ...(amountKg === null ? {} : { amount_kg: amountKg }),
          ...(report.visitId ? { visit_id: report.visitId } : {}),
        },
        parse: (body) => (isRecord(body) ? body : null),
      });
      if (result.ok) return 'recorded';
      // An invalid body after a 2xx still means the server has the report.
      if (result.error.kind === 'invalid-response') return 'recorded';
      return failureVerdict(result.error) === 'refused' ? 'refused' : 'retry';
    },

    forZone(zoneId, species) {
      return read(`/zones/${encodeURIComponent(zoneId)}/reports`, parseZoneReportPage, {
        species,
      });
    },

    mine() {
      return read('/me/reports', (body) =>
        isRecord(body) && Array.isArray(body.reports)
          ? body.reports.map(parseOwnReport).filter((r): r is OwnReport => r !== null)
          : null,
      );
    },

    season() {
      return read('/me/season', parseSeason);
    },
  };
}

let flushing: Promise<void> | null = null;

/**
 * Sends the device's queued reports, oldest first. A report the API recorded or refused for good
 * leaves the queue; the first one that should be retried (no signal, no session, a 5xx) stops the
 * pass, so the rest wait for the next one. One pass at a time, so no report is posted twice.
 */
export function flushReportQueue(api: Pick<ReportsApi, 'send'>): Promise<void> {
  if (flushing) return flushing;

  flushing = (async () => {
    for (const report of await readReportQueue()) {
      if (!report.clientId) continue;
      const outcome = await api.send(report);
      if (outcome === 'retry') return;
      await removeQueuedReport(report.clientId);
    }
  })().finally(() => {
    flushing = null;
  });

  return flushing;
}
