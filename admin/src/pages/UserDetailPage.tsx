import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { RevokeSessionsResponse, UserDetail } from '../api/types';
import { ActionDialog } from '../components/ActionDialog';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Stars,
  TrustBadge,
  useToast,
  type Tone,
} from '../components/ui';
import { errorMessage } from '../lib/errors';
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatRelative,
  formatTrust,
  titleCase,
} from '../lib/format';
import { useApi } from '../lib/useApi';

function roleTone(role: string): Tone {
  if (role === 'admin') return 'accent';
  if (role === 'buyer') return 'info';
  return 'neutral';
}

function visitTone(status: string): Tone {
  return status === 'accepted' ? 'good' : 'bad';
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<UserDetail>(
    id ? `/admin/users/${id}` : null,
  );
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  if (!id) return <EmptyState title="No account id in this URL" />;
  if (loading && !data) return <Loading label="Reading the account…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const revokeSessions = async (reason: string) => {
    setRevoking(true);
    setDialogError(null);
    try {
      const result = await api<RevokeSessionsResponse>(
        `/admin/users/${id}/revoke-sessions`,
        { method: 'POST', body: { reason } },
      );
      toast(
        'good',
        result.revoked_count === 0
          ? 'There were no active sessions to revoke.'
          : `Revoked ${result.revoked_count} active session${result.revoked_count === 1 ? '' : 's'}.`,
      );
      setDialogOpen(false);
      reload();
    } catch (cause) {
      setDialogError(errorMessage(cause));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Account investigation"
        title={data.email}
        description={`${data.nickname ?? 'No nickname'} · ${titleCase(data.role)} · joined ${formatDate(data.created_at)}`}
        actions={
          <>
            <Link className="button button-ghost" to="/users">
              ← Back to accounts
            </Link>
            <Button onClick={reload} loading={loading}>
              Refresh
            </Button>
            <Button
              variant="danger"
              disabled={data.sessions.length === 0}
              onClick={() => {
                setDialogError(null);
                setDialogOpen(true);
              }}
            >
              Revoke sessions
            </Button>
          </>
        }
      />

      <section className="account-hero panel">
        <div className="account-identity">
          <span className="avatar account-avatar" aria-hidden="true">
            {(data.nickname ?? data.email).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2>{data.email}</h2>
            <p className="muted small">
              {data.nickname ?? 'No nickname'} · {data.id}
            </p>
            <div className="row gap">
              <Badge tone={roleTone(data.role)}>{titleCase(data.role)}</Badge>
              {data.email_verified_at ? (
                <Badge tone="good">Email verified</Badge>
              ) : (
                <Badge tone="warn">Email unverified</Badge>
              )}
              <Badge tone="neutral">{titleCase(data.privacy_level)}</Badge>
            </div>
          </div>
        </div>
        <div className="account-facts">
          <div className="kv">
            <span>Trust</span>
            <strong>
              <TrustBadge value={data.trust} />
            </strong>
            <small>read-only until 6.5</small>
          </div>
          <div className="kv">
            <span>Reports</span>
            <strong>{formatNumber(data.reports_total)}</strong>
            <small>all time</small>
          </div>
          <div className="kv">
            <span>Visits</span>
            <strong>{formatNumber(data.visits_total)}</strong>
            <small>accepted and rejected</small>
          </div>
          <div className="kv">
            <span>Last sign-in</span>
            <strong>{formatRelative(data.last_sign_in)}</strong>
            <small>{formatDate(data.last_sign_in)}</small>
          </div>
        </div>
      </section>

      <div className="split">
        <Card
          title="Active sessions"
          subtitle="Refresh tokens that can still issue a new access token."
          actions={
            <span className="muted small">
              {data.sessions.length} active
            </span>
          }
        >
          {data.sessions.length === 0 ? (
            <EmptyState title="No active sessions">
              The account has no unexpired, unrevoked refresh token. Existing
              access tokens still expire within 15 minutes.
            </EmptyState>
          ) : (
            <div className="session-list">
              {data.sessions.map((session) => (
                <div key={session.id} className="session-row">
                  <div>
                    <strong>{session.user_agent ?? 'Unknown client'}</strong>
                    <p className="mono small muted">{session.id}</p>
                  </div>
                  <div className="session-times">
                    <span>Started {formatRelative(session.created_at)}</span>
                    <span>Expires {formatDate(session.expires_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Account settings"
          subtitle="What the account currently allows."
        >
          <dl className="kv-grid">
            <div className="kv">
              <span>Language</span>
              <strong>{data.lang.toUpperCase()}</strong>
              <small>field app preference</small>
            </div>
            <div className="kv">
              <span>Privacy level</span>
              <strong>{titleCase(data.privacy_level)}</strong>
              <small>who may see shared spots</small>
            </div>
            <div className="kv">
              <span>Background location</span>
              <strong>{data.background_location ? 'Enabled' : 'Off'}</strong>
              <small>consent is recorded separately</small>
            </div>
            <div className="kv">
              <span>Alert radius</span>
              <strong>{data.alert_radius_km} km</strong>
              <small>species interest: {data.species_interest.join(', ') || 'none'}</small>
            </div>
          </dl>
          <div className="notice">
            <strong>Role changes stay in Accounts.</strong> This page is for
            investigation; it does not expose a trust editor. Feature 6.5 owns
            the rule that changes trust.
          </div>
        </Card>
      </div>

      <div className="split">
        <Card
          title="Recent reports"
          subtitle="Latest 20. Open the zone to read the score and explanation."
        >
          {data.reports.length === 0 ? (
            <EmptyState title="No reports">
              This account has not submitted a report.
            </EmptyState>
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Recent reports by this account"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Recent reports by this account</caption>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Zone</th>
                    <th scope="col">Species</th>
                    <th scope="col">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((report) => (
                    <tr key={report.id}>
                      <td title={report.created_at ?? undefined}>
                        {formatRelative(report.created_at)}
                      </td>
                      <td>
                        <Link
                          className="cell-title"
                          to={`/zones/${report.zone_id}`}
                        >
                          {report.zone_name ?? 'Unnamed zone'}
                        </Link>
                        <span className="mono small muted block">
                          {report.zone_h3}
                        </span>
                      </td>
                      <td>{report.species}</td>
                      <td>
                        <Stars rating={report.rating} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Recent visits"
          subtitle="Latest 20. The server never receives a raw GPS trace."
        >
          {data.visits.length === 0 ? (
            <EmptyState title="No visits">
              This account has no recorded visits.
            </EmptyState>
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Recent visits by this account"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Recent visits by this account</caption>
                <thead>
                  <tr>
                    <th scope="col">Started</th>
                    <th scope="col">Zone</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.visits.map((visit) => (
                    <tr key={visit.id}>
                      <td title={visit.started_at ?? undefined}>
                        {formatRelative(visit.started_at)}
                      </td>
                      <td>
                        {visit.zone_id ? (
                          <Link
                            className="cell-title"
                            to={`/zones/${visit.zone_id}`}
                          >
                            {visit.zone_name ?? 'Unnamed zone'}
                          </Link>
                        ) : (
                          <span className="muted">No zone</span>
                        )}
                        <span className="mono small muted block">
                          {visit.zone_h3 ?? '—'}
                        </span>
                      </td>
                      <td>{formatDuration(visit.duration_s)}</td>
                      <td>
                        <Badge tone={visitTone(visit.status)}>
                          {titleCase(visit.status)}
                        </Badge>
                        {visit.manual ? (
                          <span className="muted small block">manual</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Account audit trail"
        subtitle="Privileged actions whose target is this account."
      >
        {data.audit.length === 0 ? (
          <EmptyState title="No privileged actions">
            A role change or session revocation will appear here.
          </EmptyState>
        ) : (
          <div
            className="table-wrap"
            role="region"
            aria-label="Audit entries for this account"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">Audit entries for this account</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Detail</th>
                  <th scope="col">Request</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((entry) => (
                  <tr key={entry.id}>
                    <td title={entry.created_at ?? undefined}>
                      {formatRelative(entry.created_at)}
                    </td>
                    <td>{entry.actor_email ?? 'Deleted account'}</td>
                    <td>
                      <Badge tone="accent">{titleCase(entry.action)}</Badge>
                    </td>
                    <td>
                      <Badge
                        tone={entry.outcome === 'failure' ? 'bad' : 'good'}
                      >
                        {entry.outcome === 'failure' ? 'Rejected' : 'Succeeded'}
                      </Badge>
                    </td>
                    <td className="small">{entry.reason ?? '—'}</td>
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
                    <td className="mono small">{entry.request_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="muted small">
        Trust is {formatTrust(data.trust)} from <code>user_trust</code>, with the
        schema default of {formatTrust(0.5)} when no row exists. It is shown for
        investigation, not editing.
      </p>

      <ActionDialog
        open={dialogOpen}
        title="Revoke active sessions"
        consequence={`${data.sessions.length} active refresh token${data.sessions.length === 1 ? '' : 's'} for ${data.email} will stop issuing new access tokens. Existing access tokens expire within 15 minutes.`}
        confirmLabel="Revoke sessions"
        reasonLabel="Why are you revoking these sessions?"
        busy={revoking}
        error={dialogError}
        onClose={() => setDialogOpen(false)}
        onConfirm={(reason) => void revokeSessions(reason)}
      />
    </div>
  );
}
