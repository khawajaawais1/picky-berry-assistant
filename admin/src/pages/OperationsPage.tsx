import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EnqueueResult, JobsResponse, Overview } from '../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatCard,
  useToast,
  type Tone,
} from '../components/ui';
import { errorMessage } from '../lib/errors';
import {
  buildOperationsChecks,
  overallStatus,
  type CheckStatus,
  type OperationsCheck,
} from '../lib/operations';
import { formatDate, formatNumber, formatRelative } from '../lib/format';
import { useApi } from '../lib/useApi';

function checkTone(status: CheckStatus): Tone {
  if (status === 'ok') return 'good';
  if (status === 'warn') return 'warn';
  if (status === 'fail') return 'bad';
  return 'neutral';
}

function checkLabel(status: CheckStatus): string {
  if (status === 'ok') return 'Healthy';
  if (status === 'warn') return 'Watch';
  if (status === 'fail') return 'Needs action';
  return 'No data';
}

function CheckRow({ check }: { check: OperationsCheck }) {
  return (
    <article className={`ops-check ops-check-${check.status}`}>
      <div className="ops-check-status">
        <Badge tone={checkTone(check.status)}>{checkLabel(check.status)}</Badge>
        <span className="ops-check-value">{check.value}</span>
      </div>
      <div className="ops-check-body">
        <h3>{check.label}</h3>
        <p>{check.detail}</p>
        <p className="ops-check-runbook">
          <strong>Runbook</strong> {check.runbook}
        </p>
      </div>
      <div className="ops-check-foot">
        <span className="muted small">Owner · {check.owner}</span>
        {check.href ? (
          <Link className="text-link small" to={check.href}>
            Open evidence →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function OperationsPage() {
  const overview = useApi<Overview>('/admin/overview');
  const running = useApi<JobsResponse>(
    '/admin/jobs?status=running&page_size=100',
  );
  const toast = useToast();
  const [recomputing, setRecomputing] = useState(false);

  const checks = useMemo(
    () =>
      overview.data
        ? buildOperationsChecks(overview.data, running.data, new Date())
        : [],
    [overview.data, running.data],
  );
  const status = overallStatus(checks);

  const recomputeAll = async () => {
    if (!window.confirm('Queue a recomputation of every zone score?')) return;
    setRecomputing(true);
    try {
      const result = await api<EnqueueResult>('/admin/scores/recompute', {
        method: 'POST',
        body: {},
      });
      toast(
        'good',
        result.deduplicated
          ? `Job #${result.job_id} was already queued.`
          : `Queued job #${result.job_id}.`,
      );
      overview.reload();
      running.reload();
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setRecomputing(false);
    }
  };

  const error = overview.error ?? running.error;
  const loading = overview.loading || running.loading;

  if (error && !overview.data) {
    return <ErrorState error={error} onRetry={overview.reload} />;
  }
  if (overview.loading && !overview.data) {
    return <Loading label="Reading the pipeline…" />;
  }
  if (!overview.data) return null;

  const data = overview.data;
  const runningJobs = running.data?.jobs ?? [];
  const failingChecks = checks.filter(
    (check) => check.status === 'fail' || check.status === 'warn',
  );

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Monitor"
        title="Operations"
        description="The daily loop at a glance: coverage, freshness, queue delay and the work that needs a human."
        actions={
          <>
            <Button
              onClick={() => {
                overview.reload();
                running.reload();
              }}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              loading={recomputing}
              onClick={() => void recomputeAll()}
            >
              Recompute all scores
            </Button>
          </>
        }
      />

      <section className={`ops-hero ops-hero-${status}`} aria-live="polite">
        <div>
          <p className="eyebrow">Pipeline verdict</p>
          <h2>
            {status === 'ok'
              ? 'The loop is healthy'
              : status === 'fail'
                ? 'The loop needs attention'
                : 'The loop is degraded'}
          </h2>
          <p className="ops-hero-copy">
            {failingChecks.length === 0
              ? 'Every check is green. Keep the daily worker running.'
              : `${failingChecks.length} check${failingChecks.length === 1 ? '' : 's'} need attention: ${failingChecks
                  .map((check) => check.label.toLowerCase())
                  .join(', ')}.`}
          </p>
        </div>
        <div className="ops-hero-meta">
          <Badge tone={checkTone(status)}>{checkLabel(status)}</Badge>
          <span className="mono small">
            snapshot {formatDate(data.generated_at)}
          </span>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard
          label="Coverage"
          value={`${data.zones.coverage_pct}%`}
          hint={`${formatNumber(data.zones.scored)} of ${formatNumber(data.zones.total)} zones`}
          tone={
            data.zones.coverage_pct >= 95
              ? 'good'
              : data.zones.coverage_pct >= 80
                ? 'warn'
                : 'bad'
          }
        />
        <StatCard
          label="Freshness"
          value={formatRelative(data.zones.latest_score_at)}
          hint={`${formatNumber(data.zones.stale_scores)} stale score rows`}
          tone={data.zones.stale_scores === 0 ? 'good' : 'warn'}
        />
        <StatCard
          label="Queue depth"
          value={formatNumber(data.jobs.queued)}
          hint={`${formatNumber(data.jobs.running)} running · ${formatNumber(data.jobs.overdue)} overdue`}
          tone={data.jobs.overdue > 0 ? 'warn' : 'good'}
        />
        <StatCard
          label="Failures · 7 d"
          value={formatNumber(data.jobs.failed_7d)}
          hint={`${formatNumber(data.jobs.done_7d)} finished in the same window`}
          tone={data.jobs.failed_7d > 0 ? 'bad' : 'good'}
        />
      </div>

      <Card
        title="Health checks"
        subtitle="Each failure names an owner and the next action; nothing here writes to the service."
      >
        <div className="ops-check-list">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
      </Card>

      <div className="split split-wide">
        <Card
          title="Running now"
          subtitle="The current worker claims. A lock older than 30 minutes is a stale-lock warning."
          actions={<Link className="text-link" to="/jobs">Open queue →</Link>}
        >
          {running.error ? (
            <ErrorState error={running.error} onRetry={running.reload} />
          ) : runningJobs.length === 0 ? (
            <EmptyState title="No job is running">
              The worker is idle. Queued work will appear in the queue.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Currently running jobs</caption>
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Type</th>
                    <th scope="col">Locked</th>
                    <th scope="col" className="numeric">Attempts</th>
                    <th scope="col">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {runningJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="mono">#{job.id}</td>
                      <td className="mono small">{job.type}</td>
                      <td title={job.locked_at ?? undefined}>
                        {formatRelative(job.locked_at)}
                      </td>
                      <td className="numeric">{job.attempts}</td>
                      <td>
                        <details className="details">
                          <summary>Inspect</summary>
                          <pre className="code-block">
                            {JSON.stringify(job.payload, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card
            title="Operator runbook"
            subtitle="Start at the top; do not retry a running job."
          >
            <ol className="ops-runbook">
              <li>
                <strong>Check the worker.</strong> A queued backlog with no running
                job usually means the worker process is down.
              </li>
              <li>
                <strong>Read the oldest failure.</strong> Fix the cause before
                retrying; a repeated retry only grows the queue.
              </li>
              <li>
                <strong>Recompute after a data fix.</strong> Recompute the affected
                zone, then confirm a new row in zone_scores_current.
              </li>
              <li>
                <strong>Leave a trail.</strong> The audit log records every
                privileged action with its request id.
              </li>
            </ol>
          </Card>

          <Card
            title="Next evidence"
            subtitle="The shortest path from a red check to the record."
          >
            <div className="quick-actions">
              <Link className="button button-ghost" to="/jobs?status=failed">
                Failed jobs
              </Link>
              <Link className="button button-ghost" to="/jobs?status=queued">
                Queued jobs
              </Link>
              <Link className="button button-ghost" to="/reports">
                Moderation triage
              </Link>
              <Link className="button button-ghost" to="/audit">
                Audit log
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <p className="muted small">
        Current schema note: jobs have <code>locked_at</code> but no lease expiry
        yet. The stale-lock check is a conservative 30-minute heuristic until the
        worker lease contract lands.
      </p>
    </div>
  );
}
