import type { JobsResponse, Overview } from '../api/types';

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'unknown';

export interface OperationsCheck {
  id: string;
  label: string;
  status: CheckStatus;
  value: string;
  detail: string;
  owner: string;
  runbook: string;
  href?: string;
}

const HOUR = 60 * 60 * 1000;
const STALE_LOCK_MS = 30 * 60 * 1000;

function ageHours(value: string | null, now: Date): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, (now.getTime() - timestamp) / HOUR);
}

function formatHours(hours: number): string {
  if (hours < 1) return 'under an hour';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

function check(
  input: Omit<OperationsCheck, 'status'> & { status: CheckStatus },
): OperationsCheck {
  return input;
}

export function buildOperationsChecks(
  overview: Overview,
  jobs: JobsResponse | null = null,
  now: Date = new Date(),
): OperationsCheck[] {
  const checks: OperationsCheck[] = [];
  const zones = overview.zones;
  const queue = overview.jobs;

  checks.push(
    check({
      id: 'coverage',
      label: 'Score coverage',
      status:
        zones.total === 0
          ? 'unknown'
          : zones.coverage_pct >= 95
            ? 'ok'
            : zones.coverage_pct >= 80
              ? 'warn'
              : 'fail',
      value: `${zones.coverage_pct}%`,
      detail: `${zones.scored.toLocaleString('en-GB')} of ${zones.total.toLocaleString('en-GB')} zones have a current score.`,
      owner: 'Data + scoring',
      runbook:
        zones.coverage_pct >= 95
          ? 'No action needed.'
          : 'Check the latest ingest and recompute jobs, then retry failed work.',
      href: '/jobs',
    }),
  );

  const freshnessHours = ageHours(zones.latest_score_at, now);
  checks.push(
    check({
      id: 'freshness',
      label: 'Score freshness',
      status:
        freshnessHours === null
          ? 'fail'
          : freshnessHours <= 26
            ? 'ok'
            : freshnessHours <= 48
              ? 'warn'
              : 'fail',
      value:
        freshnessHours === null ? 'No scores' : formatHours(freshnessHours),
      detail:
        freshnessHours === null
          ? 'No current score has ever been computed.'
          : `Newest score is ${formatHours(freshnessHours)} old; the daily target is under 26 h.`,
      owner: 'Scoring worker',
      runbook:
        'Check the daily recompute job, the worker heartbeat, and the latest score table.',
      href: '/jobs',
    }),
  );

  const staleShare =
    zones.total === 0 ? 0 : zones.stale_scores / Math.max(1, zones.score_rows);
  checks.push(
    check({
      id: 'stale-scores',
      label: 'Stale score rows',
      status:
        zones.total === 0
          ? 'unknown'
          : zones.stale_scores === 0
            ? 'ok'
            : staleShare <= 0.05
              ? 'warn'
              : 'fail',
      value: zones.stale_scores.toLocaleString('en-GB'),
      detail:
        zones.stale_scores === 0
          ? 'Every current score is under 24 h old.'
          : `${zones.stale_scores.toLocaleString('en-GB')} current score rows are older than 24 h.`,
      owner: 'Scoring worker',
      runbook:
        'Recompute the affected zones and check whether the worker is still claiming jobs.',
      href: '/jobs',
    }),
  );

  checks.push(
    check({
      id: 'queue-delay',
      label: 'Queue delay',
      status:
        queue.overdue === 0 ? 'ok' : queue.overdue >= 5 ? 'fail' : 'warn',
      value: queue.overdue === 0 ? '0 overdue' : `${queue.overdue} overdue`,
      detail:
        queue.oldest_queued_at === null
          ? 'Nothing is waiting to be claimed.'
          : `Oldest queued job is ${formatHours(ageHours(queue.oldest_queued_at, now) ?? 0)} old; overdue means over 15 min.`,
      owner: 'Scoring worker',
      runbook:
        'Confirm the worker process is running and can claim rows, then inspect the oldest job payload.',
      href: '/jobs?status=queued',
    }),
  );

  checks.push(
    check({
      id: 'job-failures',
      label: 'Job failures · 7 days',
      status:
        queue.failed_7d === 0 ? 'ok' : queue.failed_7d <= 2 ? 'warn' : 'fail',
      value: queue.failed_7d.toLocaleString('en-GB'),
      detail:
        queue.failed_7d === 0
          ? 'No failed jobs in the last seven days.'
          : `${queue.failed_7d.toLocaleString('en-GB')} jobs failed in the last seven days.`,
      owner: 'Scoring worker',
      runbook:
        'Open the failed jobs, read last_error, fix the cause, then retry one job and verify it finishes.',
      href: '/jobs?status=failed',
    }),
  );

  if (jobs) {
    const nowMs = now.getTime();
    const stale = jobs.jobs.filter((job) => {
      if (job.status !== 'running' || !job.locked_at) return false;
      const lockedAt = new Date(job.locked_at).getTime();
      return !Number.isNaN(lockedAt) && nowMs - lockedAt > STALE_LOCK_MS;
    });
    if (stale.length > 0) {
      checks.push(
        check({
          id: 'stale-lock',
          label: 'Stale running lock',
          status: 'fail',
          value: `${stale.length}`,
          detail: `${stale.length === 1 ? 'One running job has' : `${stale.length} running jobs have`} held a lock for over 30 min. The current schema has no lease expiry, so this may need manual intervention.`,
          owner: 'Scoring worker',
          runbook:
            'Check the worker log for the job id. Do not retry a running job; release or finish it first.',
          href: '/jobs?status=running',
        }),
      );
    }
  }

  return checks;
}

export function overallStatus(checks: OperationsCheck[]): CheckStatus {
  if (checks.some((item) => item.status === 'fail')) return 'fail';
  if (checks.some((item) => item.status === 'warn' || item.status === 'unknown')) {
    return 'warn';
  }
  return 'ok';
}
