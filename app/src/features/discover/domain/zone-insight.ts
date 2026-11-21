import { SPECIES, isSpecies, type Species } from './species';
import { parseZoneScore, type ZoneScore } from './zone-source';

/**
 * What the team API says about one zone beyond its map score (ADR-065, the API integration
 * plan's phase 3), read at the boundary:
 *
 * - `GET /zones/{id}` — every species the zone is scored for, and the week's report counts;
 * - `GET /zones/{id}/explanation` — the server's reasons for a score, already localized;
 * - `GET /zones/{id}/history` — the daily score for the last days.
 *
 * Pure: no React, no I/O. Each parser answers `null` for a document it cannot read at all, and
 * drops the entries it cannot read from one it can, so one bad row costs that row only.
 */

/** One species' reports from the last seven days. The average is the server's to withhold. */
export type ZoneReportSummary = { count: number; averageRating: number | null };

export type ZoneDetail = {
  id: string;
  scores: Readonly<Partial<Record<Species, ZoneScore>>>;
  reports: Readonly<Partial<Record<Species, ZoneReportSummary>>>;
};

export type ScorePoint = { date: string; score: number };

export type ScoreHistory = { days: number; points: readonly ScorePoint[] };

/** Everything the screen asks the service about one zone and one berry. */
export type ZoneInsight = {
  detail: ZoneDetail;
  reasons: readonly string[];
  history: ScoreHistory;
};

/** The port the zone screen reads the service's extra facts through. */
export interface ZoneInsightSource {
  insight(query: { zoneId: string; species: Species; lang: 'fi' | 'en' }): Promise<ZoneInsight>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function speciesOf(value: unknown): Species | null {
  return typeof value === 'string' && isSpecies(value) ? value : null;
}

function asReport(value: unknown): ZoneReportSummary | null {
  if (!isRecord(value)) return null;

  const { count, avg_rating: average } = value;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return null;
  if (average !== null && (typeof average !== 'number' || average < 1 || average > 5)) {
    return null;
  }

  return { count, averageRating: average };
}

export function parseZoneDetail(body: unknown): ZoneDetail | null {
  if (!isRecord(body) || typeof body.id !== 'string' || body.id.trim() === '') return null;
  if (!Array.isArray(body.scores) || !Array.isArray(body.reports_7d)) return null;

  const scores: Partial<Record<Species, ZoneScore>> = {};
  for (const entry of body.scores) {
    const species = isRecord(entry) ? speciesOf(entry.species) : null;
    const score = parseZoneScore(entry);
    if (species && score) scores[species] = score;
  }

  const reports: Partial<Record<Species, ZoneReportSummary>> = {};
  for (const entry of body.reports_7d) {
    const species = isRecord(entry) ? speciesOf(entry.species) : null;
    const report = asReport(entry);
    if (species && report) reports[species] = report;
  }

  // The app's own species order, so a screen lists berries the same way everywhere.
  const ordered = (record: Partial<Record<Species, unknown>>) =>
    Object.fromEntries(SPECIES.filter((s) => s in record).map((s) => [s, record[s]]));

  return {
    id: body.id,
    scores: ordered(scores) as Partial<Record<Species, ZoneScore>>,
    reports: ordered(reports) as Partial<Record<Species, ZoneReportSummary>>,
  };
}

export function parseZoneExplanation(body: unknown): readonly string[] | null {
  if (!isRecord(body) || !Array.isArray(body.reasons)) return null;

  return body.reasons
    .map((reason) =>
      isRecord(reason) && typeof reason.text === 'string' ? reason.text.trim() : '',
    )
    .filter((text) => text !== '');
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseScoreHistory(body: unknown): ScoreHistory | null {
  if (!isRecord(body) || !Array.isArray(body.points)) return null;

  const days = typeof body.days === 'number' && Number.isInteger(body.days) ? body.days : 0;
  const points: ScorePoint[] = [];
  for (const point of body.points) {
    if (!isRecord(point) || typeof point.date !== 'string' || !DATE.test(point.date)) continue;
    const { score } = point;
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) continue;
    points.push({ date: point.date, score });
  }

  return { days, points };
}

/** The lowest and highest score over a history, or `null` when it holds no days. */
export function scoreRange(points: readonly ScorePoint[]): { low: number; high: number } | null {
  if (points.length === 0) return null;

  const scores = points.map((point) => point.score);
  return { low: Math.min(...scores), high: Math.max(...scores) };
}
