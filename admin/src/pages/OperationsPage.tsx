import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type {
  EnqueueResult,
  JobsResponse,
  OperationsCheck,
  OperationsHealth,
  Overview,
} from '../api/types';
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
  formatDate,
  formatDuration,
  formatNumber,
  formatRelative,
  titleCase,
} from '../lib/format';
import { useApi } from '../lib/useApi';

type HealthStatus = OperationsCheck['status'] | 'unknown';

function checkTone(status: HealthStatus): Tone {
  if (status === 'ok') return 'good';
  if (status === 'warn') return 'warn';
  if (status === 'fail') return 'bad';
  return 'neutral';
}

function checkLabel(status: HealthStatus): string {
  if (status === 'ok') return 'Healthy';
  if (status === 'warn') return 'Watch';
  if (status === 'fail') return 'Needs action';
  return 'No snapshot';
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
        {check.breakdown?.length ? (
          <details className="details ops-breakdown">
            <summary>By species ({check.breakdown.length})</summary>
            <ul className="ops-breakdown-list">
              {check.breakdown.map((item) => (
                <li key={item.key}>
                  <span className="ops-breakdown-name">
                    {titleCase(item.label)}
                    {item.detail ? (
                      <span className="muted small"> · {item.detail}</span>
                    ) : null}
                  </span>
                  <Badge tone={checkTone(item.status)}>{item.value}</Badge>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      <div className="ops-check-foot">
        <span className="muted small">Owner · {check.owner}</span>
        <span className="muted small ops-check-threshold">
          Threshold · {check.threshold}
        </span>
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
  const health = useApi<OperationsHealth>('/admin/operations/health');
  const running = useApi<JobsResponse>(
    '/admin/jobs?status=running&page_size=100',
  );
  const toast = useToast();
  const [recomputing, setRecomputing] = useState(false);

  const checks = health.data?.checks ?? [];
  const status: HealthStatus = health.data?.status ?? 'unknown';
  const failingChecks = checks.filter(
    (check) => check.status === 'fail' || check.status === 'warn',
  );

  const reloadAll = () => {
    overview.reload();
    health.reload();
    running.reload();
  };

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
      reloadAll();
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setRecomputing(false);
    }
  };

  const loading = overview.loading || health.loading || running.loading;

  if (overview.error && !overview.data) {
    return <ErrorState error={overview.error} onRetry={overview.reload} />;
  }
  if (overview.loading && !overview.data) {
    return <Loading label="Reading the pipeline…" />;
  }
  if (!overview.data) return null;

  const data = overview.data;
  const runningJobs = running.data?.jobs ?? [];

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Monitor"
        title="Operations"
        description="The daily loop at a glance: coverage, freshness, queue delay and the work that needs a human."
        actions={
          <>
            <Button onClick={reloadAll} loading={loading}>
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
                : status === 'warn'
                  ? 'The loop is degraded'
                  : 'Checking the pipeline'}
          </h2>
          <p className="ops-hero-copy">
            {!health.data
              ? health.error
                ? 'The server-side health snapshot could not be loaded. Refresh to try again.'
                : 'Waiting for the server-side health snapshot.'
              : failingChecks.length === 0
                ? 'Every check is green. Keep the daily worker running.'
                : `${failingChecks.length} check${failingChecks.length === 1 ? '' : 's'} need attention: ${failingChecks
                    .map((check) => check.label.toLowerCase())
                    .join(', ')}.`}
          </p>
        </div>
        <div className="ops-hero-meta">
          <Badge tone={checkTone(status)}>{checkLabel(status)}</Badge>
          <span className="mono small">
            snapshot{' '}
            {health.data ? formatDate(health.data.generated_at) : '—'}
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
          hint={`${formatNumber(data.jobs.running)} running · ${formatNumber(data.jobs.stuck)} stuck · ${formatNumber(data.jobs.overdue)} overdue`}
          tone={
            data.jobs.stuck > 0
              ? 'bad'
              : data.jobs.overdue > 0
                ? 'warn'
                : 'good'
          }
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
        subtitle="Server-side snapshot. Each failure names an owner and the next action; nothing here writes to the service."
      >
        {health.error ? (
          <ErrorState error={health.error} onRetry={health.reload} />
        ) : health.loading && !health.data ? (
          <Loading label="Checking the pipeline…" />
        ) : checks.length === 0 ? (
          <EmptyState title="No checks returned">
            The health endpoint returned no checks. Refresh to try again.
          </EmptyState>
        ) : (
          <div className="ops-check-list">
            {checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
        )}
        {health.data?.unavailable.length ? (
          <div className="ops-unavailable">
            <strong>Not checked</strong>
            <ul>
              {health.data.unavailable.map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span> · {item.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="split split-wide">
        <Card
          title="Running now"
          subtitle="Live worker claims. A heartbeat older than two minutes or an expired lease is stuck; the worker reaps expired leases before its next claim."
          actions={
            <Link className="text-link" to="/jobs">
              Open queue →
            </Link>
          }
        >
          {running.error ? (
            <ErrorState error={running.error} onRetry={running.reload} />
          ) : runningJobs.length === 0 ? (
            <EmptyState title="No job is running">
              The worker is idle. Queued work will appear in the queue.
            </EmptyState>
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Currently running jobs"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Currently running jobs</caption>
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Type</th>
                    <th scope="col">State</th>
                    <th scope="col">Worker</th>
                    <th scope="col">Heartbeat</th>
                    <th scope="col">Lease</th>
                    <th scope="col" className="numeric">
                      Attempts
                    </th>
                    <th scope="col">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {runningJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="mono">#{job.id}</td>
                      <td className="mono small">{job.type}</td>
                      <td>
                        <Badge tone={job.stuck ? 'bad' : 'info'}>
                          {job.stuck ? 'Stuck' : 'Running'}
                        </Badge>
                        {job.stuck ? (
                          <span className="muted small block">
                            {formatDuration(job.stuck_for_seconds ?? 0)}
                          </span>
                        ) : null}
                      </td>
                      <td className="mono small">{job.worker_id ?? '—'}</td>
                      <td title={job.heartbeat_at ?? undefined}>
                        {formatRelative(job.heartbeat_at)}
                      </td>
                      <td title={job.lease_expires_at ?? undefined}>
                        {job.lease_expired ? (
                          <Badge tone="bad">Expired</Badge>
                        ) : (
                          formatRelative(job.lease_expires_at)
                        )}
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
              <Link className="button button-ghost" to="/moderation">
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
        The server derives freshness, coverage, queue age and lease health from
        the current tables. The worker owns claims and heartbeats; this panel
        only reads their evidence.
      </p>
    </div>
  );
}
