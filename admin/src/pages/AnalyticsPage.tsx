import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalyticsResponse } from '../api/types';
import { DistributionBar, LineChart, StackedBars } from '../components/charts';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatCard,
} from '../components/ui';
import { formatNumber } from '../lib/format';
import { useApi } from '../lib/useApi';

const RANGES = [7, 30, 90] as const;

function sum(items: { count: number }[]): number {
  return items.reduce((total, item) => total + item.count, 0);
}

export function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data, error, loading, reload } = useApi<AnalyticsResponse>(
    `/admin/analytics?days=${days}`,
  );

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Monitor"
        title="Analytics"
        description="Daily volume, per-species coverage and the current score distribution."
        actions={
          <>
            <div className="chip-row" role="group" aria-label="Analytics range">
              {RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`chip${days === range ? ' active' : ''}`}
                  aria-pressed={days === range}
                  onClick={() => setDays(range)}
                >
                  {range} days
                </button>
              ))}
            </div>
            <Button onClick={reload} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading label="Crunching the range…" />
      ) : !data ? null : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Reports"
              value={formatNumber(sum(data.reports_daily))}
              hint={`in the last ${data.days} days`}
              tone="accent"
            />
            <StatCard
              label="Visits"
              value={formatNumber(sum(data.visits_daily))}
              hint={`accepted and rejected together`}
              tone="neutral"
            />
            <StatCard
              label="New accounts"
              value={formatNumber(sum(data.signups_daily))}
              hint={`in the last ${data.days} days`}
              tone="info"
            />
            <StatCard
              label="Failed jobs"
              value={formatNumber(
                data.jobs_daily.reduce((total, day) => total + day.failed, 0),
              )}
              hint={`${formatNumber(
                data.jobs_daily.reduce((total, day) => total + day.done, 0),
              )} finished`}
              tone={
                data.jobs_daily.some((day) => day.failed > 0) ? 'warn' : 'good'
              }
            />
          </div>

          <div className="split">
            <Card title="Reports per day" subtitle={`Last ${data.days} days`}>
              <LineChart data={data.reports_daily} label="Reports" />
            </Card>
            <Card title="Visits per day" subtitle={`Last ${data.days} days`}>
              <LineChart
                data={data.visits_daily}
                label="Visits"
                colour="var(--good)"
              />
            </Card>
          </div>

          <div className="split">
            <Card title="New accounts per day" subtitle={`Last ${data.days} days`}>
              <LineChart
                data={data.signups_daily}
                label="New accounts"
                colour="var(--info)"
              />
            </Card>
            <Card
              title="Jobs finished per day"
              subtitle="Done and failed, from finished_at."
            >
              <StackedBars data={data.jobs_daily} />
            </Card>
          </div>

          <Card
            title="Species coverage"
            subtitle="Zone support comes from zone_species; the rest from current scores."
          >
            {data.species_stats.length === 0 ? (
              <EmptyState title="No species rows in the database" />
            ) : (
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Per-species coverage and score summary</caption>
                  <thead>
                    <tr>
                      <th scope="col">Species</th>
                      <th scope="col" className="numeric">Supported zones</th>
                      <th scope="col" className="numeric">Scored zones</th>
                      <th scope="col" className="numeric">Average score</th>
                      <th scope="col" className="numeric">High confidence</th>
                      <th scope="col" className="numeric">Reports · 7 d</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.species_stats.map((species) => (
                      <tr key={species.species}>
                        <td>
                          <span className="species-name">
                            <span
                              className="species-dot"
                              style={{ background: species.colour }}
                              aria-hidden="true"
                            />
                            {species.name_en}
                          </span>
                          <span className="muted small block">
                            {species.name_fi} · {species.species}
                          </span>
                        </td>
                        <td className="numeric">
                          {formatNumber(species.zones_supported)}
                        </td>
                        <td className="numeric">
                          {formatNumber(species.zones_scored)}
                        </td>
                        <td className="numeric">
                          {species.avg_score === null ? '—' : species.avg_score}
                        </td>
                        <td className="numeric">
                          {species.high_confidence_pct}%
                        </td>
                        <td className="numeric">
                          {formatNumber(species.reports_7d)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Score distribution"
            subtitle="Current scores per species, in ten-point buckets."
          >
            {data.score_distribution.length === 0 ? (
              <EmptyState title="No current scores" />
            ) : (
              <div className="dist-list">
                {data.score_distribution.map((row) => {
                  const stat = data.species_stats.find(
                    (species) => species.species === row.species,
                  );
                  return (
                    <div key={row.species} className="dist-row">
                      <div className="dist-label">
                        <span
                          className="species-dot"
                          style={{ background: stat?.colour ?? 'var(--accent)' }}
                          aria-hidden="true"
                        />
                        {stat?.name_en ?? row.species}
                      </div>
                      <DistributionBar
                        buckets={row.buckets}
                        colour={stat?.colour ?? 'var(--accent)'}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Top zones by reports"
            subtitle="Last 7 days, highest report count then rating."
          >
            {data.top_zones.length === 0 ? (
              <EmptyState title="No reports in the last 7 days" />
            ) : (
              <ol className="ranked-list">
                {data.top_zones.map((zone) => (
                  <li key={zone.id}>
                    <Link className="cell-title" to={`/zones/${zone.id}`}>
                      {zone.name ?? 'Unnamed zone'}
                    </Link>
                    <span className="mono small muted">{zone.h3}</span>
                    <span className="row gap small">
                      <Badge tone="accent">
                        {formatNumber(zone.reports_7d)} reports
                      </Badge>
                      {zone.avg_rating !== null ? (
                        <Badge tone="neutral">
                          {zone.avg_rating.toFixed(1)} ★
                        </Badge>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
