import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type {
  EnqueueResult,
  ExplanationResponse,
  HistoryResponse,
  ZoneDetail,
} from '../api/types';
import { LineChart } from '../components/charts';
import {
  Badge,
  Button,
  Card,
  ConfidenceBadge,
  CopyButton,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  ScorePill,
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

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function jobTone(status: string): Tone {
  if (status === 'done') return 'good';
  if (status === 'failed') return 'bad';
  if (status === 'running') return 'info';
  return 'neutral';
}

export function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<ZoneDetail>(
    id ? `/admin/zones/${id}` : null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [busySpecies, setBusySpecies] = useState<string | null>(null);
  const toast = useToast();

  const history = useApi<HistoryResponse>(
    id && selected
      ? `/zones/${id}/history?species=${encodeURIComponent(selected)}&days=30`
      : null,
  );
  const explanation = useApi<ExplanationResponse>(
    id && selected
      ? `/zones/${id}/explanation?species=${encodeURIComponent(selected)}&lang=en`
      : null,
  );

  useEffect(() => {
    if (data && data.scores.length > 0 && selected === null) {
      setSelected(data.scores[0].species);
    }
  }, [data, selected]);

  const recompute = async (species?: string) => {
    if (!id) return;
    setBusySpecies(species ?? 'all');
    try {
      const body: Record<string, unknown> = { zone_id: id };
      if (species) body.species = species;
      const result = await api<EnqueueResult>('/admin/scores/recompute', {
        method: 'POST',
        body,
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
      setBusySpecies(null);
    }
  };

  if (!id) return <EmptyState title="No zone id in this URL" />;
  if (loading && !data) return <Loading label="Reading the zone…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const selectedScore = data.scores.find((score) => score.species === selected);

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Zone"
        title={data.name ?? 'Unnamed zone'}
        description={`${data.h3}${data.h3_parent6 ? ` · parent ${data.h3_parent6}` : ''} · ${data.id}`}
        actions={
          <>
            <Link className="button button-ghost" to="/zones">
              ← Back to zones
            </Link>
            <CopyButton value={data.id} label="Copy zone id" />
            <Button
              variant="primary"
              loading={busySpecies === 'all'}
              onClick={() => void recompute()}
            >
              Recompute zone
            </Button>
          </>
        }
      />

      <Card title="Zone facts" subtitle="Read from zones and zone_species.">
        <div className="kv-grid">
          <div className="kv">
            <span>Forest type</span>
            <strong>{data.forest_type ?? '—'}</strong>
            <small>fertility {data.fertility_class ?? '—'}</small>
          </div>
          <div className="kv">
            <span>Area</span>
            <strong>{data.area_km2 === null ? '—' : `${data.area_km2.toFixed(2)} km²`}</strong>
            <small>one H3 cell</small>
          </div>
          <div className="kv">
            <span>Centroid</span>
            <strong className="mono">
              {data.centroid
                ? `${data.centroid.lat.toFixed(4)}, ${data.centroid.lng.toFixed(4)}`
                : '—'}
            </strong>
            <small>EPSG:4326</small>
          </div>
          <div className="kv">
            <span>Built</span>
            <strong>{formatRelative(data.built_at)}</strong>
            <small>{data.source_version ?? 'no source version'}</small>
          </div>
        </div>
      </Card>

      <Card
        title="Current scores"
        subtitle="Pick a species to load its history and the stored explanation."
        actions={
          data.scores.length > 0 ? (
            <span className="muted small">
              {data.scores.length} species scored
            </span>
          ) : null
        }
      >
        {data.scores.length === 0 ? (
          <EmptyState title="No current scores for this zone">
            Recompute the zone to ask the worker for a score row.
          </EmptyState>
        ) : (
          <div
            className="table-wrap"
            role="region"
            aria-label="Current score for each species"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">Current score for each species</caption>
              <thead>
                <tr>
                  <th scope="col">Species</th>
                  <th scope="col">Score</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Ripeness</th>
                  <th scope="col" className="numeric">N_eff</th>
                  <th scope="col" className="numeric">Model</th>
                  <th scope="col">Updated</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.scores.map((score) => (
                  <tr
                    key={score.species}
                    className={selected === score.species ? 'selected-row' : ''}
                  >
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setSelected(score.species)}
                        aria-pressed={selected === score.species}
                      >
                        {score.species}
                      </button>
                    </td>
                    <td>
                      <div className="score-cell">
                        <ScorePill score={score.score} />
                        <span className="score-bar" aria-hidden="true">
                          <span style={{ width: `${score.score}%` }} />
                        </span>
                      </div>
                    </td>
                    <td>
                      <ConfidenceBadge value={score.confidence} />
                    </td>
                    <td>{titleCase(score.ripeness)}</td>
                    <td className="numeric">
                      {score.n_eff === null ? '—' : score.n_eff.toFixed(1)}
                    </td>
                    <td className="numeric">
                      {score.s_model === null ? '—' : score.s_model}
                    </td>
                    <td title={score.computed_at ?? undefined}>
                      {formatRelative(score.computed_at)}
                    </td>
                    <td className="numeric">
                      <Button
                        className="small ghost"
                        loading={busySpecies === score.species}
                        onClick={() => void recompute(score.species)}
                      >
                        Recompute
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="split">
        <Card
          title={`Score history · ${selected ?? 'no species'}`}
          subtitle="One point per day, the latest score of that day."
        >
          {!selected ? (
            <EmptyState title="Choose a species above" />
          ) : history.error ? (
            <ErrorState error={history.error} onRetry={history.reload} />
          ) : history.loading && !history.data ? (
            <Loading label="Reading history…" />
          ) : history.data && history.data.points.length > 0 ? (
            <LineChart
              data={history.data.points.map((point) => ({
                date: point.date,
                count: point.score,
              }))}
              label={`${selected} score`}
              maxValue={100}
              summary="latest"
            />
          ) : (
            <EmptyState title="No history in the last 30 days" />
          )}
        </Card>

        <Card
          title="Why this score"
          subtitle="Reason codes rendered by the API; the raw inputs are below."
        >
          {!selected ? (
            <EmptyState title="Choose a species above" />
          ) : explanation.error ? (
            <ErrorState error={explanation.error} onRetry={explanation.reload} />
          ) : explanation.loading && !explanation.data ? (
            <Loading label="Reading explanation…" />
          ) : explanation.data ? (
            <>
              <ul className="reason-list">
                {explanation.data.reasons.map((reason) => (
                  <li key={reason.code}>
                    <Badge tone="accent">{reason.code}</Badge>
                    <p>{reason.text}</p>
                  </li>
                ))}
              </ul>
              {Object.keys(explanation.data.inputs).length > 0 ? (
                <details className="details">
                  <summary>Inputs and model</summary>
                  <dl className="inputs-grid">
                    {Object.entries(explanation.data.inputs).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd className="mono">{displayValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="muted small">
                    Model {explanation.data.model_version} · computed{' '}
                    {formatDate(explanation.data.computed_at)}
                  </p>
                </details>
              ) : null}
            </>
          ) : (
            <EmptyState title="No explanation stored" />
          )}
        </Card>
      </div>

      <div className="split">
        <Card
          title="Species fit"
          subtitle="Which species the zone supports, from zone_species."
        >
          {data.species_fit.length === 0 ? (
            <EmptyState title="No zone_species rows" />
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Species suitability per zone"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Species suitability per zone</caption>
                <thead>
                  <tr>
                    <th scope="col">Species</th>
                    <th scope="col">Suitability</th>
                    <th scope="col">Rules</th>
                  </tr>
                </thead>
                <tbody>
                  {data.species_fit.map((fit) => (
                    <tr key={fit.species}>
                      <td>{fit.species}</td>
                      <td>
                        <div className="score-cell">
                          <span className="mono small">
                            {Math.round(fit.suitability * 100)}%
                          </span>
                          <span className="score-bar" aria-hidden="true">
                            <span style={{ width: `${fit.suitability * 100}%` }} />
                          </span>
                        </div>
                      </td>
                      <td className="mono small">{fit.rules_version ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Reports"
          subtitle="Latest 20 reports for this zone."
          actions={
            selectedScore ? (
              <span className="muted small">
                Selected score: {selectedScore.score}
              </span>
            ) : null
          }
        >
          {data.reports.length === 0 ? (
            <EmptyState title="No reports for this zone yet" />
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Recent reports for this zone"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Recent reports for this zone</caption>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Species</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Reporter</th>
                    <th scope="col">Trust</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((report) => (
                    <tr key={report.id}>
                      <td title={report.created_at ?? undefined}>
                        {formatRelative(report.created_at)}
                      </td>
                      <td>{report.species}</td>
                      <td>
                        <Stars rating={report.rating} />
                      </td>
                      <td>
                        {report.user_deleted
                          ? 'Deleted account'
                          : (report.user_email ?? 'Anonymous')}
                      </td>
                      <td>
                        <TrustBadge value={report.trust} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="split">
        <Card title="Visits" subtitle="Accepted and rejected visits, latest 20.">
          {data.visits.length === 0 ? (
            <EmptyState title="No visits recorded for this zone" />
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Recent visits to this zone"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Recent visits to this zone</caption>
                <thead>
                  <tr>
                    <th scope="col">Started</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Status</th>
                    <th scope="col">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {data.visits.map((visit) => (
                    <tr key={visit.id}>
                      <td title={visit.started_at ?? undefined}>
                        {formatRelative(visit.started_at)}
                      </td>
                      <td>{formatDuration(visit.duration_s)}</td>
                      <td>
                        <Badge tone={visit.status === 'accepted' ? 'good' : 'bad'}>
                          {titleCase(visit.status)}
                        </Badge>
                        {visit.manual ? (
                          <span className="muted small"> manual</span>
                        ) : null}
                      </td>
                      <td>{visit.user_email ?? 'Deleted account'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Jobs for this zone" subtitle="Latest 10 jobs whose payload names it.">
          {data.jobs.length === 0 ? (
            <EmptyState title="No jobs reference this zone">
              Recompute the zone to create one.
            </EmptyState>
          ) : (
            <div
              className="table-wrap"
              role="region"
              aria-label="Recent jobs for this zone"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Recent jobs for this zone</caption>
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="mono">#{job.id}</td>
                      <td className="mono small">{job.type}</td>
                      <td>
                        <Badge tone={jobTone(job.status)}>
                          {titleCase(job.status)}
                        </Badge>
                      </td>
                      <td title={job.created_at ?? undefined}>
                        {formatRelative(job.created_at)}
                      </td>
                      <td className="numeric">{formatNumber(job.attempts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="muted small">
        Trust is shown from <code>user_trust</code> with a default of{' '}
        {formatTrust(0.5)}. Editing it belongs to feature 6.5 and is not
        available here.
      </p>
    </div>
  );
}
