import { useState } from 'react';
import type { AuditResponse } from '../api/types';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
} from '../components/ui';
import { formatDate, formatNumber, formatRelative, titleCase } from '../lib/format';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 25;

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<AuditResponse>(
    `/admin/audit?page=${page}&page_size=${PAGE_SIZE}`,
  );

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Tools"
        title="Audit log"
        description="Who changed what, when, and the request id that produced it."
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Reading the audit log…" />
      ) : !data ? null : data.entries.length === 0 ? (
        <EmptyState title="No privileged actions yet">
          A recompute, a retry or a role change writes the first row.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'entry' : 'entries'}`}
          subtitle="Newest first. The actor's email is joined on read, not copied."
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
                  <th scope="col">Request</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td title={entry.created_at ?? undefined}>
                      <span className="block">
                        {formatRelative(entry.created_at)}
                      </span>
                      <span className="muted small block">
                        {formatDate(entry.created_at)}
                      </span>
                    </td>
                    <td>
                      {entry.actor_email ?? (
                        <span className="muted">deleted account</span>
                      )}
                      <span className="mono small muted block">
                        {entry.actor_id ? `${entry.actor_id.slice(0, 8)}…` : '—'}
                      </span>
                    </td>
                    <td>
                      <Badge tone="accent">{titleCase(entry.action)}</Badge>
                    </td>
                    <td>
                      {entry.target_type}
                      {entry.target_id ? (
                        <span className="mono small muted block">
                          {entry.target_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="mono small">
                      {entry.request_id ?? '—'}
                    </td>
                    <td>
                      {Object.keys(entry.detail).length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <details className="details">
                          <summary>JSON</summary>
                          <pre className="code-block">
                            {JSON.stringify(entry.detail, null, 2)}
                          </pre>
                        </details>
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
