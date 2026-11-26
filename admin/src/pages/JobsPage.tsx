import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { EnqueueResult, JobsResponse, JobStatus } from '../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  useToast,
  type Tone,
} from '../components/ui';
import { errorMessage } from '../lib/errors';
import {
  formatDuration,
  formatNumber,
  formatRelative,
  titleCase,
} from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

type StatusFilter = 'all' | JobStatus;

const PAGE_SIZE = 25;
const STATUS_FILTERS: StatusFilter[] = [
  'all',
  'queued',
  'running',
  'done',
  'failed',
];

function statusTone(status: JobStatus): Tone {
  if (status === 'done') return 'good';
  if (status === 'failed') return 'bad';
  if (status === 'running') return 'info';
  return 'neutral';
}

export function JobsPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [typeInput, setTypeInput] = useState('');
  const type = useDebouncedValue(typeInput);
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    setPage(1);
  }, [status, type]);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (status !== 'all') params.set('status', status);
  if (type.trim()) params.set('type', type.trim());

  const { data, error, loading, reload } = useApi<JobsResponse>(
    `/admin/jobs?${params.toString()}`,
  );

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [live, reload]);

  const retry = async (jobId: number) => {
    if (!window.confirm(`Requeue job #${jobId} with the same type and payload?`)) {
      return;
    }
    setRetrying(jobId);
    try {
      const result = await api<EnqueueResult>(`/admin/jobs/${jobId}/retry`, {
        method: 'POST',
      });
      toast(
        'good',
        result.deduplicated
          ? `Job #${result.job_id} was already queued.`
          : `Requeued as job #${result.job_id}.`,
      );
      reload();
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Operate"
        title="Queue"
        description="Postgres is the queue. Workers claim with SKIP LOCKED; a five-minute lease and heartbeat show whether a claim is still alive."
        actions={
          <>
            <label className="toggle">
              <input
                type="checkbox"
                checked={live}
                onChange={(event) => setLive(event.target.checked)}
              />
              <span>Live · 5 s</span>
            </label>
            <Button onClick={reload} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <Card className="filter-card">
        <div className="filter-row filter-row-wrap">
          <div className="field grow">
            <label htmlFor="job-type">Type contains</label>
            <input
              id="job-type"
              type="search"
              placeholder="recompute_zone_score"
              value={typeInput}
              onChange={(event) => setTypeInput(event.target.value)}
            />
          </div>
          <div
            className="chip-row"
            role="group"
            aria-label="Filter jobs by status"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`chip${status === filter ? ' active' : ''}`}
                aria-pressed={status === filter}
                onClick={() => setStatus(filter)}
              >
                {titleCase(filter)}
                <span className="chip-count">
                  {data ? formatNumber(data.counts[filter] ?? 0) : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Reading the queue…" />
      ) : !data ? null : data.jobs.length === 0 ? (
        <EmptyState title="No jobs match this filter">
          A recompute creates one; the worker's own schedule creates the daily
          runs.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'job' : 'jobs'}`}
          subtitle="Newest first. A retry keeps the original job and enqueues a copy."
          actions={
            <>
              {data.stuck_count > 0 ? (
                <Badge tone="bad">{`${data.stuck_count} stuck`}</Badge>
              ) : null}
              {live ? <Badge tone="info">Live</Badge> : null}
            </>
          }
        >
          <div
            className="table-wrap"
            role="region"
            aria-label="Jobs matching the current filter"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">Jobs matching the current filter</caption>
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Lease</th>
                  <th scope="col">Worker</th>
                  <th scope="col" className="numeric">Attempts</th>
                  <th scope="col">Created</th>
                  <th scope="col">Run at</th>
                  <th scope="col">Finished</th>
                  <th scope="col">Error</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="mono">#{job.id}</td>
                    <td>
                      <span className="mono small">{job.type}</span>
                      <details className="details">
                        <summary>Payload</summary>
                        <pre className="code-block">
                          {JSON.stringify(job.payload, null, 2)}
                        </pre>
                      </details>
                      {job.dedupe_key ? (
                        <span className="mono small muted block">
                          {job.dedupe_key}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone={job.stuck ? 'bad' : statusTone(job.status)}>
                        {job.stuck ? 'Stuck' : titleCase(job.status)}
                      </Badge>
                    </td>
                    <td>
                      {job.status === 'running' ? (
                        <>
                          <span
                            className={job.stuck ? 'error-text small' : 'small'}
                          >
                            {job.stuck
                              ? `Stuck for ${formatDuration(
                                  job.stuck_for_seconds ?? 0,
                                )}`
                              : 'Lease live'}
                          </span>
                          <span className="muted small block">
                            heartbeat {formatRelative(job.heartbeat_at)}
                          </span>
                          <span className="muted small block">
                            lease {formatRelative(job.lease_expires_at)}
                          </span>
                        </>
                      ) : job.recovery_count > 0 ? (
                        <>
                          <span className="small">
                            Recovered {job.recovery_count}×
                          </span>
                          <span className="muted small block">
                            last {formatRelative(job.recovered_at)}
                          </span>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {job.worker_id ? (
                        <span className="mono small">{job.worker_id}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                      {job.recovery_count > 0 && job.status === 'running' ? (
                        <span className="muted small block">
                          recovered {job.recovery_count}×
                        </span>
                      ) : null}
                    </td>
                    <td className="numeric">{job.attempts}</td>
                    <td title={job.created_at ?? undefined}>
                      {formatRelative(job.created_at)}
                    </td>
                    <td title={job.run_at ?? undefined}>
                      {formatRelative(job.run_at)}
                    </td>
                    <td title={job.finished_at ?? undefined}>
                      {formatRelative(job.finished_at)}
                    </td>
                    <td>
                      {job.last_error ? (
                        <span
                          className="error-text small"
                          title={job.last_error}
                        >
                          {job.last_error.length > 60
                            ? `${job.last_error.slice(0, 59)}…`
                            : job.last_error}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="numeric">
                      {job.status === 'done' || job.status === 'failed' ? (
                        <Button
                          className="small ghost"
                          loading={retrying === job.id}
                          onClick={() => void retry(job.id)}
                        >
                          Retry
                        </Button>
                      ) : (
                        <span className="muted small">in flight</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPage={setPage}
          />
        </Card>
      )}
    </div>
  );
}
