import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { EnqueueResult, Overview } from '../api/types';
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
} from '../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import {
  formatDate,
  formatNumber,
  formatRelative,
  titleCase,
} from '../lib/format';
import { useApi } from '../lib/useApi';

export function OverviewPage() {
  const { data, error, loading, reload } = useApi<Overview>('/admin/overview');
  const toast = useToast();
  const [recomputing, setRecomputing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const recomputeAll = async () => {
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
      reload();
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setRecomputing(false);
    }
  };

  if (loading && !data) return <Loading label="Reading the dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Live service"
        title="Control room"
        description="Counts are read from the database when this page loads; nothing is cached."
        actions={
          <>
            <Button onClick={reload} loading={loading}>
              Refresh
            </Button>
            <Button
              variant="primary"
              loading={recomputing}
              onClick={() => setConfirmOpen(true)}
            >
              Recompute all scores
            </Button>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Zone coverage"
          value={`${data.zones.coverage_pct}%`}
          hint={`${formatNumber(data.zones.scored)} of ${formatNumber(data.zones.total)} zones have a current score`}
          tone={data.zones.coverage_pct >= 95 ? 'good' : data.zones.coverage_pct > 0 ? 'warn' : 'bad'}
        />
        <StatCard
          label="Accounts"
          value={formatNumber(data.users.total)}
          hint={`${formatNumber(data.users.admins)} admins · ${formatNumber(data.users.new_last_7d)} joined in 7 days`}
          tone="neutral"
        />
        <StatCard
          label="Reports · 7 days"
          value={formatNumber(data.reports.last_7d)}
          hint={`${formatNumber(data.reports.last_24h)} in the last 24 h · ${formatNumber(data.reports.total)} all time`}
          tone="accent"
        />
        <StatCard
          label="Queue"
          value={`${formatNumber(data.jobs.queued)} queued`}
          hint={`${formatNumber(data.jobs.failed_7d)} failed in 7 days${data.jobs.stuck > 0 ? ` · ${data.jobs.stuck} stuck` : ''}${data.jobs.overdue > 0 ? ` · ${data.jobs.overdue} overdue` : ''}`}
          tone={
            data.jobs.stuck > 0
              ? 'bad'
              : data.jobs.failed_7d > 0
                ? 'warn'
                : 'good'
          }
        />
      </div>

      <div className="split split-wide">
        <Card
          title="Data freshness"
          subtitle="The newest score and how much of the table is old."
        >
          <div className="kv-grid">
            <div className="kv">
              <span>Newest score</span>
              <strong>{formatRelative(data.zones.latest_score_at)}</strong>
              <small>{formatDate(data.zones.latest_score_at)}</small>
            </div>
            <div className="kv">
              <span>Stale score rows</span>
              <strong>{formatNumber(data.zones.stale_scores)}</strong>
              <small>computed more than 24 h ago</small>
            </div>
            <div className="kv">
              <span>Current score rows</span>
              <strong>{formatNumber(data.zones.score_rows)}</strong>
              <small>one per zone × species</small>
            </div>
            <div className="kv">
              <span>Pipeline</span>
              <strong>
                {data.jobs.running > 0 ? 'Running' : data.jobs.queued > 0 ? 'Queued' : 'Idle'}
              </strong>
              <small>
                {data.jobs.running} running · {data.jobs.done_7d} finished in 7 days
              </small>
            </div>
          </div>

          <h3 className="subhead">Species in the catalogue</h3>
          <ul className="species-list">
            {data.species.map((species) => (
              <li key={species.code}>
                <span
                  className="species-dot"
                  style={{ background: species.colour }}
                  aria-hidden="true"
                />
                <span>
                  <strong>{species.name_en}</strong>
                  <small>
                    {species.name_fi} · {species.code}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="stack">
          <Card
            title="Pipeline queue"
            subtitle="Postgres is the queue; the worker claims these rows."
            actions={<Link className="text-link" to="/jobs">Open queue →</Link>}
          >
            <div className="queue-grid">
              {(
                [
                  ['queued', data.jobs.queued, 'neutral'],
                  ['running', data.jobs.running, 'info'],
                  ['done', data.jobs.done, 'good'],
                  ['failed', data.jobs.failed, 'bad'],
                ] as const
              ).map(([label, value, tone]) => (
                <div key={label} className="queue-item">
                  <Badge tone={tone}>{titleCase(label)}</Badge>
                  <strong>{formatNumber(value)}</strong>
                </div>
              ))}
            </div>
            <p className="muted small">
              Oldest queued run:{' '}
              {data.jobs.oldest_queued_at
                ? formatRelative(data.jobs.oldest_queued_at)
                : 'nothing queued'}
              {data.jobs.overdue > 0
                ? ` · ${data.jobs.overdue} past the 15-minute mark`
                : ''}
              .
            </p>
          </Card>

          <Card
            title="Quick actions"
            subtitle="The same operations the lab exposes as requests."
          >
            <div className="quick-actions">
              <Link className="button button-ghost" to="/lab">
                Open request console
              </Link>
              <Link className="button button-ghost" to="/zones">
                Browse zones
              </Link>
              <Link className="button button-ghost" to="/jobs">
                Inspect failures
              </Link>
              <Link className="button button-ghost" to="/analytics">
                Read the trends
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card
        title="Recent admin activity"
        subtitle="Every write this console makes lands in the audit log."
        actions={<Link className="text-link" to="/audit">Open audit log →</Link>}
      >
        {data.recent_activity.length === 0 ? (
          <EmptyState title="No privileged actions yet">
            Recompute a score or change a role and it will appear here.
          </EmptyState>
        ) : (
          <ul className="activity-list">
            {data.recent_activity.map((entry) => (
              <li key={entry.id}>
                <span className="activity-action">{titleCase(entry.action)}</span>
                <span className="muted">
                  {entry.actor_email ?? 'deleted account'} ·{' '}
                  {entry.target_type}
                  {entry.target_id ? ` ${entry.target_id.slice(0, 8)}…` : ''}
                </span>
                <time className="small muted" dateTime={entry.created_at ?? undefined}>
                  {formatRelative(entry.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Recompute all scores"
        consequence="Every zone score is requeued for the worker. The API deduplicates the request, so clicking twice is safe."
        confirmLabel="Recompute all scores"
        busy={recomputing}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void recomputeAll();
        }}
      />
    </div>
  );
}
