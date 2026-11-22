import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Species, ZonesResponse } from '../api/types';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  ScorePill,
} from '../components/ui';
import { formatNumber, formatRelative } from '../lib/format';
import { useApi, useDebouncedValue } from '../lib/useApi';

type ZoneSort = 'name' | 'score' | 'updated' | 'reports';

const PAGE_SIZE = 25;

export function ZonesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [species, setSpecies] = useState('');
  const [sort, setSort] = useState<ZoneSort>('name');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, species, sort]);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
    sort,
  });
  const query = debouncedSearch.trim();
  if (query) params.set('q', query);
  if (species) params.set('species', species);

  const { data, error, loading, reload } = useApi<ZonesResponse>(
    `/admin/zones?${params.toString()}`,
  );
  const speciesList = useApi<{ species: Species[] }>('/species');

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Operate"
        title="Zones"
        description="Search by name, H3 prefix or zone id. Open a zone to read its scores and evidence."
      />

      <Card className="filter-card">
        <div className="filter-row">
          <div className="field grow">
            <label htmlFor="zone-search">Search</label>
            <input
              id="zone-search"
              type="search"
              placeholder="Name, H3 prefix or zone id"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="zone-species">Species</label>
            <select
              id="zone-species"
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
            <label htmlFor="zone-sort">Sort</label>
            <select
              id="zone-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as ZoneSort)}
            >
              <option value="name">Name</option>
              <option value="score">Best score</option>
              <option value="updated">Recently scored</option>
              <option value="reports">Most reports</option>
            </select>
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Searching zones…" />
      ) : !data ? null : data.zones.length === 0 ? (
        <EmptyState title="No zones match">
          The pilot geography may not be loaded yet. Run the ingest/seed steps
          in <code>picky-server</code>, then refresh.
        </EmptyState>
      ) : (
        <Card
          title={`${formatNumber(data.total)} ${data.total === 1 ? 'zone' : 'zones'}`}
          subtitle="A zone is one H3 cell; a zone × species pair is one current score."
          actions={
            loading ? <span className="muted small">Refreshing…</span> : null
          }
        >
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                Zones matching the current search and filters
              </caption>
              <thead>
                <tr>
                  <th scope="col">Zone</th>
                  <th scope="col">Forest</th>
                  <th scope="col">Centroid</th>
                  <th scope="col" className="numeric">Species</th>
                  <th scope="col">Best score</th>
                  <th scope="col" className="numeric">Reports</th>
                  <th scope="col">Scored</th>
                </tr>
              </thead>
              <tbody>
                {data.zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>
                      <Link className="cell-title" to={`/zones/${zone.id}`}>
                        {zone.name ?? 'Unnamed zone'}
                      </Link>
                      <span className="mono small muted block">{zone.h3}</span>
                    </td>
                    <td>{zone.forest_type ?? '—'}</td>
                    <td className="mono small">
                      {zone.centroid
                        ? `${zone.centroid.lat.toFixed(3)}, ${zone.centroid.lng.toFixed(3)}`
                        : '—'}
                    </td>
                    <td className="numeric">{zone.species_scored}</td>
                    <td>
                      <ScorePill score={zone.best_score} />
                    </td>
                    <td className="numeric">{formatNumber(zone.reports_total)}</td>
                    <td title={zone.latest_computed_at ?? undefined}>
                      {formatRelative(zone.latest_computed_at)}
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
