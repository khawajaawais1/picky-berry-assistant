import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Report, ReportsResponse, Species } from '../api/types';
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
  Stars,
  TrustBadge,
} from '../components/ui';
import { formatDate, formatNumber, formatRelative, titleCase } from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

const PAGE_SIZE = 25;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATING_FILTERS = [
  { value: '', label: 'Any rating' },
  { value: '1', label: '1 star only' },
  { value: '2', label: 'At most 2 stars' },
  { value: '3', label: 'At most 3 stars' },
  { value: '4', label: 'At most 4 stars' },
] as const;

const TRUST_FILTERS = [
  { value: '', label: 'Any trust' },
  { value: '0.4', label: 'Trust ≤ 0.40' },
  { value: '0.5', label: 'Trust ≤ 0.50' },
  { value: '0.7', label: 'Trust ≤ 0.70' },
] as const;

const AGE_FILTERS = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

export function ModerationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Report | null>(null);
  const [zoneInput, setZoneInput] = useState(searchParams.get('zone_id') ?? '');
  const zone = useDebouncedValue(zoneInput);

  const species = searchParams.get('species') ?? '';
  const maxRating = searchParams.get('max_rating') ?? '';
  const maxTrust = searchParams.get('max_trust') ?? '';
  const days = searchParams.get('days') ?? '';
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const zoneFilter = zone.trim();
  const zoneValid = zoneFilter === '' || UUID.test(zoneFilter);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setPage(1);
  }, [species, maxRating, maxTrust, days, sort, zone]);

  useEffect(() => {
    setParam('zone_id', zoneValid ? zoneFilter : '');
    // The zone input is the source of truth; the URL mirrors a complete UUID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneFilter, zoneValid]);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
    sort,
  });
  if (species) params.set('species', species);
  if (zoneValid && zoneFilter) params.set('zone_id', zoneFilter);
  if (maxRating) params.set('max_rating', maxRating);
  if (maxTrust) params.set('max_trust', maxTrust);
  if (days) params.set('days', days);

  const { data, error, loading, reload } = useApi<ReportsResponse>(
    `/admin/reports?${params.toString()}`,
  );
  const speciesList = useApi<{ species: Species[] }>('/species');

  const activeFilters = [
    species && 'species',
    maxRating && 'rating',
    maxTrust && 'trust',
    days && 'age',
    zoneFilter && 'zone',
  ].filter(Boolean).length;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Operate"
        title="Moderation triage"
        description="Find the reports that need a human. Verdicts stay read-only until feature 6.5 exposes its versioned rule."
        actions={
          <>
            <Badge tone="warn">Read-only triage</Badge>
            <Button onClick={reload} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="notice">
        <strong>Why can I not record a verdict?</strong> Report verdicts and trust
        changes belong to feature 6.5. This screen finds and explains the report;
        it does not invent a trust formula. When 6.5 ships, the same drawer gains
        the verdict action and its before/after audit.
      </div>

      <Card className="filter-card">
        <div className="filter-row filter-row-wrap">
          <div className="field grow">
            <label htmlFor="moderation-zone">Zone id</label>
            <input
              id="moderation-zone"
              type="search"
              placeholder="Full zone UUID"
              value={zoneInput}
              onChange={(event) => setZoneInput(event.target.value)}
              aria-invalid={!zoneValid}
              aria-describedby={!zoneValid ? 'moderation-zone-hint' : undefined}
            />
            {!zoneValid ? (
              <p className="hint error-text" id="moderation-zone-hint">
                A zone id is a full UUID; this filter is ignored until it is.
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="moderation-species">Species</label>
            <select
              id="moderation-species"
              value={species}
              onChange={(event) => setParam('species', event.target.value)}
            >
              <option value="">All species</option>
              {(speciesList.data?.species ?? []).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name_en}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="moderation-rating">Rating</label>
            <select
              id="moderation-rating"
              value={maxRating}
              onChange={(event) => setParam('max_rating', event.target.value)}
            >
              {RATING_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="moderation-trust">Reporter trust</label>
            <select
              id="moderation-trust"
              value={maxTrust}
              onChange={(event) => setParam('max_trust', event.target.value)}
            >
              {TRUST_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="moderation-age">Received</label>
            <select
              id="moderation-age"
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
          <div className="field">
            <label htmlFor="moderation-sort">Order</label>
            <select
              id="moderation-sort"
              value={sort}
              onChange={(event) => setParam('sort', event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <Button
            className="small ghost"
            disabled={activeFilters === 0}
            onClick={() => {
              setZoneInput('');
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
        <Loading label="Reading reports…" />
      ) : !data ? null : data.reports.length === 0 ? (
        <EmptyState title="No reports match this triage">
          Widen the rating, trust or age filter. Reports arrive from the field app
          once feedback transport lands.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'report' : 'reports'} to triage`}
          subtitle={`${activeFilters === 0 ? 'No filters' : `${activeFilters} filter${activeFilters === 1 ? '' : 's'}`} · newest evidence first by default.`}
          actions={selected ? <Badge tone="accent">Detail open</Badge> : null}
        >
          <div
            className="table-wrap"
            role="region"
            aria-label="Reports matching the moderation filters"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">
                Reports matching the moderation filters
              </caption>
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Zone</th>
                  <th scope="col">Species</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Reporter</th>
                  <th scope="col">Trust</th>
                  <th scope="col">Report</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr
                    key={report.id}
                    className={selected?.id === report.id ? 'selected-row' : ''}
                  >
                    <td title={report.created_at ?? undefined}>
                      {formatRelative(report.created_at)}
                    </td>
                    <td>
                      <Link className="cell-title" to={`/zones/${report.zone_id}`}>
                        {report.zone_name ?? 'Unnamed zone'}
                      </Link>
                      <span className="mono small muted block">
                        {report.zone_h3}
                      </span>
                    </td>
                    <td>{titleCase(report.species)}</td>
                    <td>
                      <Stars rating={report.rating} />
                    </td>
                    <td>
                      {report.user_id ? (
                        <Link
                          className="cell-title"
                          to={`/users/${report.user_id}`}
                        >
                          {report.user_email ?? 'Unnamed account'}
                        </Link>
                      ) : (
                        'Anonymous'
                      )}
                      {report.user_nickname && !report.user_deleted ? (
                        <span className="muted small block">
                          {report.user_nickname}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <TrustBadge value={report.trust} />
                    </td>
                    <td className="mono small" title={report.id}>
                      {report.id.slice(0, 8)}…
                    </td>
                    <td className="numeric">
                      <Button
                        className="small ghost"
                        aria-label={`Open report ${report.id}`}
                        onClick={() => setSelected(report)}
                      >
                        Review
                      </Button>
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

      <Drawer
        open={selected !== null}
        title="Report detail"
        subtitle={
          selected
            ? `${selected.zone_name ?? 'Unnamed zone'} · ${titleCase(selected.species)}`
            : undefined
        }
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="stack">
            <div className="kv-grid">
              <div className="kv">
                <span>Rating</span>
                <strong>
                  <Stars rating={selected.rating} />
                </strong>
                <small>{selected.rating} out of 5</small>
              </div>
              <div className="kv">
                <span>Reporter trust</span>
                <strong>
                  <TrustBadge value={selected.trust} />
                </strong>
                <small>server-side, read-only</small>
              </div>
              <div className="kv">
                <span>Received</span>
                <strong>{formatRelative(selected.created_at)}</strong>
                <small>{formatDate(selected.created_at)}</small>
              </div>
              <div className="kv">
                <span>Species</span>
                <strong>{titleCase(selected.species)}</strong>
                <small>{selected.species}</small>
              </div>
            </div>

            <Card title="Where it came from" subtitle="Open the zone or account.">
              <div className="stack-tight">
                <Link className="cell-title" to={`/zones/${selected.zone_id}`}>
                  {selected.zone_name ?? 'Unnamed zone'} · {selected.zone_h3}
                </Link>
                {selected.user_id ? (
                  <Link className="cell-title" to={`/users/${selected.user_id}`}>
                    {selected.user_email ?? 'Unnamed account'}
                  </Link>
                ) : (
                  <span className="muted">Anonymous report</span>
                )}
                {selected.user_deleted ? (
                  <Badge tone="neutral">Deleted account</Badge>
                ) : null}
              </div>
            </Card>

            <Card title="Report id" subtitle="Use this in a support note or audit query.">
              <div className="row gap">
                <code className="mono small grow">{selected.id}</code>
                <CopyButton value={selected.id} label="Copy id" />
              </div>
            </Card>

            <Card
              title="Decision"
              subtitle="The verdict path is owned by feature 6.5."
            >
              <p className="muted small">
                This report is visible for triage, but there is no versioned
                verdict or trust rule in the API yet. A disabled button is
                deliberate: recording a verdict here would create an unaudited
                trust change.
              </p>
              <div className="dialog-actions">
                <Button disabled>Record verdict</Button>
              </div>
            </Card>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
