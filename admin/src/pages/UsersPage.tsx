import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Account, UserRole, UsersResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  TrustBadge,
  useToast,
  type Tone,
} from '../components/ui';
import { errorMessage } from '../lib/errors';
import {
  formatDate,
  formatNumber,
  formatRelative,
  formatTrust,
  titleCase,
} from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

const PAGE_SIZE = 25;
const ROLES: UserRole[] = ['picker', 'buyer', 'admin'];

function roleTone(role: UserRole): Tone {
  if (role === 'admin') return 'accent';
  if (role === 'buyer') return 'info';
  return 'neutral';
}

export function UsersPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const [role, setRole] = useState<'' | UserRole>('');
  const [page, setPage] = useState(1);
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [q, role]);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (q.trim()) params.set('q', q.trim());
  if (role) params.set('role', role);

  const { data, error, loading, reload } = useApi<UsersResponse>(
    `/admin/users?${params.toString()}`,
  );

  const changeRole = async (account: Account, next: UserRole) => {
    if (next === account.role) return;
    if (account.id === session?.user.id) {
      toast('bad', 'You cannot change your own role here.');
      return;
    }
    if (
      !window.confirm(
        `Change ${account.email} from ${account.role} to ${next}? This is audited.`,
      )
    ) {
      return;
    }
    setChanging(account.id);
    try {
      await api(`/admin/users/${account.id}/role`, {
        method: 'PATCH',
        body: { role: next },
      });
      toast('good', `${account.email} is now ${next}.`);
      reload();
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setChanging(null);
    }
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Operate"
        title="Accounts"
        description="Who can sign in, their role, and what they have recorded."
      />

      <div className="notice">
        <strong>Roles are privileged.</strong> Promoting an account grants every{' '}
        <code>/admin</code> route. Each change writes one audit row. The API
        refuses to let you remove your own admin role.
      </div>

      <Card className="filter-card">
        <div className="filter-row">
          <div className="field grow">
            <label htmlFor="user-search">Search</label>
            <input
              id="user-search"
              type="search"
              placeholder="Email or nickname"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="user-role">Role</label>
            <select
              id="user-role"
              value={role}
              onChange={(event) => setRole(event.target.value as '' | UserRole)}
            >
              <option value="">All roles</option>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Reading accounts…" />
      ) : !data ? null : data.users.length === 0 ? (
        <EmptyState title="No accounts match">
          Accounts are created by sign-in and registration in the field app.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'account' : 'accounts'}`}
          subtitle="Trust is read-only until feature 6.5 exposes its rule engine."
        >
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Accounts matching the search</caption>
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Role</th>
                  <th scope="col">Trust</th>
                  <th scope="col" className="numeric">Reports</th>
                  <th scope="col" className="numeric">Visits</th>
                  <th scope="col">Verified</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Last sign-in</th>
                  <th scope="col">Change role</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((account) => {
                  const isSelf = account.id === session?.user.id;
                  return (
                    <tr key={account.id}>
                      <td>
                        <span className="cell-title">{account.email}</span>
                        <span className="muted small block">
                          {account.nickname ?? 'no nickname'} · {account.lang}
                        </span>
                      </td>
                      <td>
                        <Badge tone={roleTone(account.role)}>
                          {titleCase(account.role)}
                        </Badge>
                      </td>
                      <td>
                        <TrustBadge value={account.trust} />
                      </td>
                      <td className="numeric">{formatNumber(account.reports_total)}</td>
                      <td className="numeric">{formatNumber(account.visits_total)}</td>
                      <td>
                        {account.email_verified_at ? (
                          <Badge tone="good">Verified</Badge>
                        ) : (
                          <Badge tone="neutral">Unverified</Badge>
                        )}
                      </td>
                      <td title={account.created_at ?? undefined}>
                        {formatDate(account.created_at)}
                      </td>
                      <td title={account.last_sign_in ?? undefined}>
                        {formatRelative(account.last_sign_in)}
                      </td>
                      <td>
                        <select
                          aria-label={`Role for ${account.email}`}
                          value={account.role}
                          disabled={isSelf || changing === account.id}
                          title={
                            isSelf
                              ? 'You cannot change your own role'
                              : `Current role: ${account.role}`
                          }
                          onChange={(event) =>
                            void changeRole(
                              account,
                              event.target.value as UserRole,
                            )
                          }
                        >
                          {ROLES.map((item) => (
                            <option key={item} value={item}>
                              {titleCase(item)}
                            </option>
                          ))}
                        </select>
                        {changing === account.id ? (
                          <span className="muted small block">Saving…</span>
                        ) : null}
                        {isSelf ? (
                          <span className="muted small block">You</span>
                        ) : null}
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

      <p className="muted small">
        A missing row in <code>user_trust</code> is shown as{' '}
        {formatTrust(0.5)}, the schema default. No account emails appear on the
        field app's public routes.
      </p>
      <div className="row gap">
        <Button className="ghost small" onClick={reload}>
          Re-read accounts
        </Button>
      </div>
    </div>
  );
}
