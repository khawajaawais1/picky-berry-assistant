export type HealthStatus = 'ok' | 'warn' | 'fail';

export interface OperationsHealthBreakdown {
  key: string;
  label: string;
  status: HealthStatus;
  value: string;
  detail?: string;
}

export interface OperationsHealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  value: string;
  threshold: string;
  detail: string;
  owner: string;
  runbook: string;
  href?: string;
  checked_at: string;
  breakdown?: OperationsHealthBreakdown[];
}

export interface OperationsHealthUnavailable {
  id: string;
  label: string;
  reason: string;
}

export interface OperationsHealth {
  generated_at: string;
  status: HealthStatus;
  checks: OperationsHealthCheck[];
  unavailable: OperationsHealthUnavailable[];
}

export interface OperationsHealthSpecies {
  code: string;
  nameEn: string;
  zonesScored: number;
  latestScoreAt: Date | string | null;
}

export interface OperationsHealthInput {
  now: Date;
  zonesTotal: number;
  zonesScored: number;
  scoreRows: number;
  staleScoreRows: number;
  latestScoreAt: Date | string | null;
  species: OperationsHealthSpecies[];
  queue: {
    queued: number;
    running: number;
    overdue: number;
    oldestQueuedAt: Date | string | null;
  };
  duplicates: { groups: number; extra: number };
  required: { missingModelVersion: number };
  outOfRange: {
    reports: number;
    scores: number;
    trust: number;
    visitDuration: number;
    alertRadius: number;
  };
  ingest: {
    available: boolean;
    runs: Array<{
      source: string;
      status: string;
      startedAt: Date | string | null;
      finishedAt: Date | string | null;
      rows: number | null;
      error: string | null;
    }>;
  };
}

const HOUR = 60 * 60 * 1000;
const numberFormat = new Intl.NumberFormat('en-GB');

function asDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageHours(value: Date | string | null, now: Date): number | null {
  const date = asDate(value);
  if (!date) return null;
  return Math.max(0, (now.getTime() - date.getTime()) / HOUR);
}

function formatAge(value: Date | string | null, now: Date): string {
  const hours = ageHours(value, now);
  if (hours === null) return 'No score';
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return minutes <= 0 ? 'just now' : `${minutes} min`;
  }
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

function formatDuration(
  startedAt: Date | string | null,
  finishedAt: Date | string | null,
): string {
  const start = asDate(startedAt);
  const end = asDate(finishedAt);
  if (!start) return 'unknown duration';
  if (!end) return 'running';
  const minutes = Math.max(0, (end.getTime() - start.getTime()) / 60_000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.round(minutes / 60)} h`;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function coverageStatus(percent: number, total: number): HealthStatus {
  if (total <= 0) return 'fail';
  if (percent >= 95) return 'ok';
  if (percent >= 80) return 'warn';
  return 'fail';
}

function freshnessStatus(hours: number | null): HealthStatus {
  if (hours === null) return 'fail';
  if (hours <= 26) return 'ok';
  if (hours <= 48) return 'warn';
  return 'fail';
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warn')) return 'warn';
  return 'ok';
}

export function buildOperationsHealth(
  input: OperationsHealthInput,
): OperationsHealth {
  const checkedAt = input.now.toISOString();
  const checks: OperationsHealthCheck[] = [];
  const unavailable: OperationsHealthUnavailable[] = [
    {
      id: 'expired-leases',
      label: 'Expired job leases',
      reason:
        'jobs has no lease_expires_at column yet; queue age is reported instead.',
    },
  ];

  const coverageBreakdown = input.species.map((species) => {
    const percent = percentage(species.zonesScored, input.zonesTotal);
    return {
      key: species.code,
      label: species.nameEn,
      status: coverageStatus(percent, input.zonesTotal),
      value: `${percent}%`,
      detail: `${numberFormat.format(species.zonesScored)} of ${numberFormat.format(input.zonesTotal)} zones`,
    };
  });
  const overallCoverage = percentage(input.zonesScored, input.zonesTotal);
  const coverageOverallStatus =
    coverageBreakdown.length > 0
      ? worstStatus(coverageBreakdown.map((item) => item.status))
      : coverageStatus(overallCoverage, input.zonesTotal);

  checks.push({
    id: 'coverage',
    label: 'Score coverage',
    status: coverageOverallStatus,
    value: input.zonesTotal === 0 ? 'No zones' : `${overallCoverage}%`,
    threshold: '≥ 95% of zones, each species',
    detail:
      input.zonesTotal === 0
        ? 'No zones are configured, so no species can be covered.'
        : `${numberFormat.format(input.zonesScored)} of ${numberFormat.format(input.zonesTotal)} zones have at least one current score; each species is checked separately.`,
    owner: 'Data + scoring',
    runbook:
      'Check the latest ingest and recompute jobs, then retry failed work and confirm a new current score.',
    href: '/jobs',
    checked_at: checkedAt,
    ...(coverageBreakdown.length > 0 ? { breakdown: coverageBreakdown } : {}),
  });

  const freshnessBreakdown = input.species.map((species) => {
    const hours = ageHours(species.latestScoreAt, input.now);
    return {
      key: species.code,
      label: species.nameEn,
      status: freshnessStatus(hours),
      value: formatAge(species.latestScoreAt, input.now),
      detail:
        species.latestScoreAt === null
          ? 'No current score for this species.'
          : `Latest current score is ${formatAge(species.latestScoreAt, input.now)} old.`,
    };
  });
  const overallFreshnessHours = ageHours(input.latestScoreAt, input.now);
  const freshnessOverallStatus =
    freshnessBreakdown.length > 0
      ? worstStatus(freshnessBreakdown.map((item) => item.status))
      : freshnessStatus(overallFreshnessHours);
  const stalestSpecies = input.species.reduce<OperationsHealthSpecies | null>(
    (oldest, species) => {
      if (!oldest) return species;
      const hours = ageHours(species.latestScoreAt, input.now);
      const oldestHours = ageHours(oldest.latestScoreAt, input.now);
      if (hours === null) return species;
      if (oldestHours === null) return oldest;
      return hours > oldestHours ? species : oldest;
    },
    null,
  );
  const stalestHours = stalestSpecies
    ? ageHours(stalestSpecies.latestScoreAt, input.now)
    : null;

  checks.push({
    id: 'freshness',
    label: 'Score freshness',
    status: freshnessOverallStatus,
    value: formatAge(input.latestScoreAt, input.now),
    threshold: '≤ 26 h old; fail after 48 h',
    detail:
      overallFreshnessHours === null
        ? 'No current score has ever been computed.'
        : freshnessBreakdown.length > 0
          ? stalestSpecies && stalestHours !== null
            ? `Oldest species' newest score is ${formatAge(stalestSpecies.latestScoreAt, input.now)} old.`
            : 'At least one species has no current score; the breakdown names it.'
          : `Newest current score is ${formatAge(input.latestScoreAt, input.now)} old.`,
    owner: 'Scoring worker',
    runbook:
      'Check the daily recompute job and the worker heartbeat, then recompute the affected species.',
    href: '/jobs',
    checked_at: checkedAt,
    ...(freshnessBreakdown.length > 0 ? { breakdown: freshnessBreakdown } : {}),
  });

  const staleShare =
    input.scoreRows === 0 ? 0 : input.staleScoreRows / input.scoreRows;
  checks.push({
    id: 'stale-scores',
    label: 'Stale score rows',
    status:
      input.scoreRows === 0
        ? 'fail'
        : input.staleScoreRows === 0
          ? 'ok'
          : staleShare <= 0.05
            ? 'warn'
            : 'fail',
    value:
      input.scoreRows === 0
        ? 'No score rows'
        : `${numberFormat.format(input.staleScoreRows)} stale`,
    threshold: '0 stale rows; ≤ 5% tolerated',
    detail:
      input.scoreRows === 0
        ? 'There are no current score rows to assess.'
        : `${numberFormat.format(input.staleScoreRows)} of ${numberFormat.format(input.scoreRows)} current score rows are older than 24 h.`,
    owner: 'Scoring worker',
    runbook:
      'Recompute the affected zones and check whether the worker is still claiming jobs.',
    href: '/jobs',
    checked_at: checkedAt,
  });

  checks.push({
    id: 'queue-age',
    label: 'Queue age',
    status:
      input.queue.queued === 0
        ? 'ok'
        : input.queue.overdue === 0
          ? 'ok'
          : input.queue.overdue >= 5
            ? 'fail'
            : 'warn',
    value:
      input.queue.queued === 0
        ? '0 waiting'
        : `${numberFormat.format(input.queue.overdue)} overdue`,
    threshold: 'oldest queued < 15 min',
    detail:
      input.queue.queued === 0
        ? 'Nothing is waiting to be claimed.'
        : input.queue.oldestQueuedAt === null
          ? `${numberFormat.format(input.queue.queued)} queued, but no run time is recorded.`
          : `${numberFormat.format(input.queue.queued)} queued; oldest is ${formatAge(input.queue.oldestQueuedAt, input.now)} old.`,
    owner: 'Scoring worker',
    runbook:
      'Confirm the worker process is running and can claim rows, then inspect the oldest queued payload.',
    href: '/jobs?status=queued',
    checked_at: checkedAt,
  });

  checks.push({
    id: 'duplicate-reports',
    label: 'Duplicate reports · 7 days',
    status:
      input.duplicates.groups === 0
        ? 'ok'
        : input.duplicates.groups <= 2
          ? 'warn'
          : 'fail',
    value: `${numberFormat.format(input.duplicates.groups)} groups`,
    threshold: '0 groups; ≤ 2 tolerated',
    detail: `${numberFormat.format(input.duplicates.extra)} extra reports share a reporter, zone, species and UTC day.`,
    owner: 'Moderation',
    runbook:
      'Open the affected reports in moderation and decide whether the duplicate should count.',
    href: '/moderation',
    checked_at: checkedAt,
  });

  checks.push({
    id: 'required-fields',
    label: 'Required score fields',
    status: input.required.missingModelVersion === 0 ? 'ok' : 'fail',
    value: `${numberFormat.format(input.required.missingModelVersion)} missing`,
    threshold: '0 rows without model_version',
    detail: `${numberFormat.format(input.required.missingModelVersion)} current score rows have no explanation.model_version.`,
    owner: 'Scoring worker',
    runbook:
      'Recompute the affected rows with the current scorer and verify that the explanation carries its model version.',
    href: '/jobs',
    checked_at: checkedAt,
  });

  const outOfRangeRows =
    input.outOfRange.reports +
    input.outOfRange.scores +
    input.outOfRange.trust +
    input.outOfRange.visitDuration +
    input.outOfRange.alertRadius;
  checks.push({
    id: 'out-of-range',
    label: 'Out-of-range values',
    status: outOfRangeRows === 0 ? 'ok' : 'fail',
    value: `${numberFormat.format(outOfRangeRows)} rows`,
    threshold: '0 invalid rows',
    detail: `${numberFormat.format(outOfRangeRows)} rows violate a numeric invariant: reports ${numberFormat.format(input.outOfRange.reports)}, scores ${numberFormat.format(input.outOfRange.scores)}, trust ${numberFormat.format(input.outOfRange.trust)}, visit duration ${numberFormat.format(input.outOfRange.visitDuration)}, alert radius ${numberFormat.format(input.outOfRange.alertRadius)}.`,
    owner: 'Data quality',
    runbook:
      'Inspect the affected row, correct the writer, and re-run the invariant check before trusting aggregate numbers.',
    href: '/zones',
    checked_at: checkedAt,
  });

  if (input.ingest.available) {
    const ingestBreakdown = input.ingest.runs.map((run) => {
      const status: HealthStatus =
        run.status === 'failed'
          ? 'fail'
          : run.status === 'running'
            ? 'warn'
            : 'ok';
      return {
        key: run.source,
        label: run.source,
        status,
        value:
          run.status === 'ok'
            ? `ok · ${formatDuration(run.startedAt, run.finishedAt)}`
            : run.status,
        detail:
          run.error ??
          `${run.rows === null ? 'No row count' : `${numberFormat.format(run.rows)} rows`} · ${formatDuration(run.startedAt, run.finishedAt)}`,
      };
    });
    const failed = input.ingest.runs.filter(
      (run) => run.status === 'failed',
    ).length;
    const running = input.ingest.runs.filter(
      (run) => run.status === 'running',
    ).length;
    const ingestStatus =
      input.ingest.runs.length === 0
        ? 'warn'
        : failed > 0
          ? 'fail'
          : running > 0
            ? 'warn'
            : 'ok';

    checks.push({
      id: 'ingest-runs',
      label: 'Ingest runs',
      status: ingestStatus,
      value:
        input.ingest.runs.length === 0
          ? 'No runs'
          : `${numberFormat.format(input.ingest.runs.length)} sources`,
      threshold: 'latest run ok for every source',
      detail:
        input.ingest.runs.length === 0
          ? 'The ingest_runs table exists but has no recorded runs.'
          : `${numberFormat.format(failed)} failed · ${numberFormat.format(running)} running.`,
      owner: 'Data ingest',
      runbook:
        'Read the failed source error, fix the ingest, then re-run that source before recomputing scores.',
      checked_at: checkedAt,
      ...(ingestBreakdown.length > 0 ? { breakdown: ingestBreakdown } : {}),
    });
  } else {
    unavailable.push({
      id: 'ingest-runs',
      label: 'Ingest runs',
      reason:
        'ingest_runs is not installed in this database; the data pipeline owns that table.',
    });
  }

  return {
    generated_at: checkedAt,
    status: worstStatus(checks.map((check) => check.status)),
    checks,
    unavailable,
  };
}
