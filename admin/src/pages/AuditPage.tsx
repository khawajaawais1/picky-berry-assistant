import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AuditEntry, AuditResponse } from '../api/types';
import { Drawer } from '../components/Drawer';
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
} from '../components/ui';
import {
  formatDate,
  formatNumber,
  formatRelative,
  titleCase,
} from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

const PAGE_SIZE = 25;

const TARGET_TYPES = [
  { value: '', label: 'All targets' },
  { value: 'user', label: 'Accounts' },
  { value: 'zone', label: 'Zones' },
  { value: 'scores', label: 'Scores' },
  { value: 'job', label: 'Jobs' },
] as const;

const AGE_FILTERS = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

function targetOf(entry: AuditEntry): { label: string; to: string | null } {
  const label = entry.target_type;
  if (!entry.target_id) return { label, to: null };
  if (entry.target_type === 'user') {
    return { label, to: `/users/${entry.target_id}` };
  }
  if (entry.target_type === 'zone' || entry.target_type === 'scores') {
    return { label, to: `/zones/${entry.target_id}` };
  }
  return { label, to: null };
}

function detailSummary(detail: Record<string, unknown>): string {
  if ('from' in detail && 'to' in detail) {
    return `${String(detail.from)} → ${String(detail.to)}`;
  }
  const keys = Object.keys(detail);
  return keys.length === 0 ? 'No detail' : `${keys.length} field${keys.length === 1 ? '' : 's'}`;
}

function DetailValue({ value }: { value: unknown }) {
  if (typeof value === 'string' || typeof value === 'number') {
    return <code className="mono small">{String(value)}</code>;
  }
  if (typeof value === 'boolean' || value === null) {
    return <code className="mono small">{JSON.stringify(value)}</code>;
  }
  return (
    <pre className="code-block">{JSON.stringify(value, null, 2)}</pre>
  );
}

function DetailView({ entry }: { entry: AuditEntry }) {
  const detail = entry.detail ?? {};
  const hasDiff = 'from' in detail || 'to' in detail;
  const rest = Object.fromEntries(
    Object.entries(detail).filter(([key]) => key !== 'from' && key !== 'to'),
  );

  return (
    <div className="stack">
      {hasDiff ? (
        <div className="audit-diff">
          <div className="diff-panel diff-before">
            <p className="eyebrow">Before</p>
            <DetailValue value={detail.from} />
          </div>
          <div className="diff-panel diff-after">
            <p className="eyebrow">After</p>
            <DetailValue value={detail.to} />
          </div>
        </div>
      ) : null}

      {Object.keys(rest).length === 0 ? (
        hasDiff ? null : <p className="muted">No extra detail recorded.</p>
      ) : (
        <div className="kv-grid">
          {Object.entries(rest).map(([key, value]) => (
            <div className="kv" key={key}>
              <span>{titleCase(key)}</span>
              <strong>
                <DetailValue value={value} />
              </strong>
              <small className="mono">{key}</small>
            </div>
          ))}
        </div>
      )}

      <details className="details">
        <summary>Raw JSON</summary>
        <pre className="code-block">{JSON.stringify(detail, null, 2)}</pre>
      </details>
    </div>
  );
}

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState(searchParams.get('q') ?? '');
  const q = useDebouncedValue(qInput);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const targetType = searchParams.get('target_type') ?? '';
  const days = searchParams.get('days') ?? '';

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setParam('q', q.trim());
  }, [q, setParam]);

  useEffect(() => {
    setPage(1);
  }, [q, targetType, days]);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (q.trim()) params.set('q', q.trim());
  if (targetType) params.set('target_type', targetType);
  if (days) params.set('days', days);

  const { data, error, loading, reload } = useApi<AuditResponse>(
    `/admin/audit?${params.toString()}`,
  );

  const activeFilters = [q.trim(), targetType, days].filter(Boolean).length;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Tools"
        title="Audit log"
        description="Every privileged change, with the request that produced it and the before/after evidence."
        actions={
          <Button onClick={reload} loading={loading}>
            Refresh
          </Button>
        }
      />

      <Card className="filter-card">
        <div className="filter-row filter-row-wrap">
          <div className="field grow">
            <label htmlFor="audit-query">Search</label>
            <input
              id="audit-query"
              type="search"
              placeholder="Action, actor email, target id or request id"
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="audit-target">Target</label>
            <select
              id="audit-target"
              value={targetType}
              onChange={(event) => setParam('target_type', event.target.value)}
            >
              {TARGET_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-age">When</label>
            <select
              id="audit-age"
              value={days}
              onChange={(event) => setParam('days', event.target.value)}
            >
              {AGE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="small ghost"
            disabled={activeFilters === 0}
            onClick={() => {
              setQInput('');
              setSearchParams({}, { replace: true });
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Reading the audit log…" />
      ) : !data ? null : data.entries.length === 0 ? (
        <EmptyState title="No audit entries match">
          Widen the search or target filter. Privileged actions write the first
          row.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'entry' : 'entries'}`}
          subtitle="Newest first. The actor's email is joined on read; detail keeps its recorded shape."
        >
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Admin audit entries</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                  <th scope="col">Detail</th>
                  <th scope="col">Request</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const target = targetOf(entry);
                  return (
                    <tr
                      key={entry.id}
                      className={selected?.id === entry.id ? 'selected-row' : ''}
                    >
                      <td title={entry.created_at ?? undefined}>
                        <span className="block">
                          {formatRelative(entry.created_at)}
                        </span>
                        <span className="muted small block">
                          {formatDate(entry.created_at)}
                        </span>
                      </td>
                      <td>
                        {entry.actor_id ? (
                          <Link
                            className="cell-title"
                            to={`/users/${entry.actor_id}`}
                          >
                            {entry.actor_email ?? 'Deleted account'}
                          </Link>
                        ) : (
                          <span className="muted">System</span>
                        )}
                        <span className="mono small muted block">
                          {entry.actor_id
                            ? `${entry.actor_id.slice(0, 8)}…`
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <Badge tone="accent">{titleCase(entry.action)}</Badge>
                      </td>
                      <td>
                        {target.to ? (
                          <Link className="cell-title" to={target.to}>
                            {titleCase(target.label)}
                          </Link>
                        ) : (
                          titleCase(target.label)
                        )}
                        {entry.target_id ? (
                          <span className="mono small muted block">
                            {entry.target_id}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className="small">
                          {detailSummary(entry.detail ?? {})}
                        </span>
                      </td>
                      <td className="mono small">
                        {entry.request_id ? (
                          <span title={entry.request_id}>
                            {entry.request_id.slice(0, 12)}…
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="numeric">
                        <Button
                          className="small ghost"
                          aria-label={`Inspect audit entry ${entry.id}`}
                          onClick={() => setSelected(entry)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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

      <Drawer
        open={selected !== null}
        title={selected ? `Audit entry #${selected.id}` : 'Audit entry'}
        subtitle={selected ? titleCase(selected.action) : undefined}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="stack">
            <div className="kv-grid">
              <div className="kv">
                <span>Actor</span>
                <strong>
                  {selected.actor_id ? (
                    <Link
                      className="cell-title"
                      to={`/users/${selected.actor_id}`}
                    >
                      {selected.actor_email ?? 'Deleted account'}
                    </Link>
                  ) : (
                    'System'
                  )}
                </strong>
                <small>{formatDate(selected.created_at)}</small>
              </div>
              <div className="kv">
                <span>Action</span>
                <strong>{titleCase(selected.action)}</strong>
                <small className="mono">{selected.action}</small>
              </div>
              <div className="kv">
                <span>Target</span>
                <strong>
                  {targetOf(selected).to ? (
                    <Link
                      className="cell-title"
                      to={targetOf(selected).to as string}
                    >
                      {titleCase(selected.target_type)}
                    </Link>
                  ) : (
                    titleCase(selected.target_type)
                  )}
                </strong>
                <small className="mono">{selected.target_id ?? '—'}</small>
              </div>
              <div className="kv">
                <span>When</span>
                <strong>{formatRelative(selected.created_at)}</strong>
                <small>{formatDate(selected.created_at)}</small>
              </div>
            </div>

            <Card
              title="Request id"
              subtitle="Correlate this change with server logs and the API response."
            >
              {selected.request_id ? (
                <div className="row gap">
                  <code className="mono small grow">
                    {selected.request_id}
                  </code>
                  <CopyButton
                    value={selected.request_id}
                    label="Copy request id"
                  />
                </div>
              ) : (
                <p className="muted">
                  This entry has no request id; it predates request
                  correlation.
                </p>
              )}
            </Card>

            <Card
              title="Recorded detail"
              subtitle="Exactly what the action stored, not a reconstruction."
            >
              <DetailView entry={selected} />
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
