import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportsResponse, Species } from '../api/types';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  Stars,
  TrustBadge,
} from '../components/ui';
import { formatNumber, formatRelative } from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

const PAGE_SIZE = 25;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ReportsPage() {
  const [species, setSpecies] = useState('');
  const [minRating, setMinRating] = useState('');
  const [zoneInput, setZoneInput] = useState('');
  const zone = useDebouncedValue(zoneInput);
  const [page, setPage] = useState(1);

  const zoneFilter = zone.trim();
  const zoneValid = zoneFilter === '' || UUID.test(zoneFilter);

  useEffect(() => {
    setPage(1);
  }, [species, minRating, zone]);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (species) params.set('species', species);
  if (minRating) params.set('min_rating', minRating);
  if (zoneValid && zoneFilter) params.set('zone_id', zoneFilter);

  const { data, error, loading, reload } = useApi<ReportsResponse>(
    `/admin/reports?${params.toString()}`,
  );
  const speciesList = useApi<{ species: Species[] }>('/species');

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Operate"
        title="Reports"
        description="Picker reports with the reporter's server-side trust. This screen is read-only."
      />

      <div className="notice">
        <strong>Moderation is not here yet.</strong> Report verdicts, fraud
        checks and trust changes belong to feature 6.5. This console shows what
        is stored and leaves the decision to the validation service.
      </div>

      <Card className="filter-card">
        <div className="filter-row filter-row-wrap">
          <div className="field">
            <label htmlFor="report-species">Species</label>
            <select
              id="report-species"
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
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
            <label htmlFor="report-rating">Minimum rating</label>
            <select
              id="report-rating"
              value={minRating}
              onChange={(event) => setMinRating(event.target.value)}
            >
              <option value="">Any rating</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars or more</option>
              <option value="3">3 stars or more</option>
              <option value="2">2 stars or more</option>
              <option value="1">1 star or more</option>
            </select>
          </div>
          <div className="field grow">
            <label htmlFor="report-zone">Zone id</label>
            <input
              id="report-zone"
              type="search"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={zoneInput}
              onChange={(event) => setZoneInput(event.target.value)}
              aria-invalid={!zoneValid}
              aria-describedby={!zoneValid ? 'zone-hint' : undefined}
            />
            {!zoneValid ? (
              <p className="hint error-text" id="zone-hint">
                A zone id is a full UUID; this filter is ignored until it is.
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Reading reports…" />
      ) : !data ? null : data.reports.length === 0 ? (
        <EmptyState title="No reports match">
          Reports arrive from the field app once feedback transport lands.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'report' : 'reports'}`}
          subtitle="Newest first."
        >
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Reports matching the current filter</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Zone</th>
                  <th scope="col">Species</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Reporter</th>
                  <th scope="col">Trust</th>
                  <th scope="col">Report</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr key={report.id}>
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
                    <td>{report.species}</td>
                    <td>
                      <Stars rating={report.rating} />
                    </td>
                    <td>
                      {report.user_deleted
                        ? 'Deleted account'
                        : (report.user_email ?? 'Anonymous')}
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
