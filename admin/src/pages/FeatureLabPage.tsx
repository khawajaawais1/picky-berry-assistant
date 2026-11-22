import { useState, type FormEvent } from 'react';
import { API_BASE, api, apiRaw, type RawResult } from '../api/client';
import type { EnqueueResult } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  useToast,
  type Tone,
} from '../components/ui';
import { errorMessage } from '../lib/errors';
import { formatNumber } from '../lib/format';

const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;
type Method = (typeof METHODS)[number];

interface Preset {
  label: string;
  method: Method;
  path: string;
  body?: string;
}

const PRESETS: Preset[] = [
  { label: 'Health', method: 'GET', path: '/health' },
  { label: 'Overview', method: 'GET', path: '/admin/overview' },
  { label: 'Species', method: 'GET', path: '/species' },
  {
    label: 'Near Jyväskylä',
    method: 'GET',
    path: '/zones/near?lat=62.24&lng=25.75&species=bilberry&radius_km=5&limit=5',
  },
  {
    label: 'Failed jobs',
    method: 'GET',
    path: '/admin/jobs?status=failed&page_size=10',
  },
  { label: 'Analytics · 7 days', method: 'GET', path: '/admin/analytics?days=7' },
  {
    label: 'Recompute all',
    method: 'POST',
    path: '/admin/scores/recompute',
    body: '{}',
  },
];

const CATALOGUE: { method: Method; path: string; note: string }[] = [
  { method: 'GET', path: '/admin/overview', note: 'dashboard counters' },
  { method: 'GET', path: '/admin/zones?page_size=5', note: 'zone search' },
  { method: 'GET', path: '/admin/jobs?status=failed', note: 'queue failures' },
  { method: 'GET', path: '/admin/reports?min_rating=1', note: 'reports' },
  { method: 'GET', path: '/admin/users?role=admin', note: 'admin accounts' },
  { method: 'GET', path: '/admin/analytics?days=7', note: 'trends' },
  { method: 'GET', path: '/admin/audit', note: 'audit log' },
  { method: 'POST', path: '/admin/scores/recompute', note: 'queue a recompute' },
];

function statusTone(status: number): Tone {
  if (status >= 500) return 'bad';
  if (status >= 400) return 'warn';
  return 'good';
}

export function FeatureLabPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [method, setMethod] = useState<Method>('GET');
  const [path, setPath] = useState('/admin/overview');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<RawResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState('');
  const [species, setSpecies] = useState('');
  const [jobId, setJobId] = useState('');

  const applyPreset = (preset: Preset) => {
    setMethod(preset.method);
    setPath(preset.path);
    setBody(preset.body ?? '');
    setLocalError(null);
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    setLocalError(null);

    let parsedBody: unknown = undefined;
    if (method !== 'GET' && method !== 'DELETE' && body.trim()) {
      try {
        parsedBody = JSON.parse(body) as unknown;
      } catch {
        setLocalError('The body is not valid JSON; nothing was sent.');
        return;
      }
    }

    setSending(true);
    try {
      setResult(await apiRaw(method, path, parsedBody));
    } catch (cause) {
      setLocalError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  };

  const recomputeAll = async () => {
    if (!window.confirm('Queue a recomputation of every zone score?')) return;
    setBusyAction('all');
    try {
      const response = await api<EnqueueResult>('/admin/scores/recompute', {
        method: 'POST',
        body: {},
      });
      toast(
        'good',
        response.deduplicated
          ? `Job #${response.job_id} was already queued.`
          : `Queued job #${response.job_id}.`,
      );
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setBusyAction(null);
    }
  };

  const recomputeZone = async () => {
    if (!zoneId.trim()) {
      toast('bad', 'Enter a zone id first.');
      return;
    }
    setBusyAction('zone');
    try {
      const payload: Record<string, unknown> = { zone_id: zoneId.trim() };
      if (species.trim()) payload.species = species.trim();
      const response = await api<EnqueueResult>('/admin/scores/recompute', {
        method: 'POST',
        body: payload,
      });
      toast(
        'good',
        response.deduplicated
          ? `Job #${response.job_id} was already queued.`
          : `Queued job #${response.job_id}.`,
      );
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setBusyAction(null);
    }
  };

  const retryJob = async () => {
    const parsed = Number(jobId);
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast('bad', 'Enter a numeric job id.');
      return;
    }
    setBusyAction('retry');
    try {
      const response = await api<EnqueueResult>(`/admin/jobs/${parsed}/retry`, {
        method: 'POST',
      });
      toast(
        'good',
        response.deduplicated
          ? `Job #${response.job_id} was already queued.`
          : `Requeued as job #${response.job_id}.`,
      );
    } catch (cause) {
      toast('bad', errorMessage(cause));
    } finally {
      setBusyAction(null);
    }
  };

  const expiresInMinutes = session
    ? Math.max(0, Math.round((session.expires_at - Date.now()) / 60_000))
    : 0;

  const responseText =
    result === null
      ? ''
      : result.body !== null
        ? JSON.stringify(result.body, null, 2)
        : result.text || '(empty body)';

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Tools"
        title="Feature lab"
        description="Send any API request with your admin token, and trigger the operations the console exposes."
      />

      <div className="split split-wide">
        <Card
          title="Request console"
          subtitle="The path is appended to the API origin below. The body must be JSON."
        >
          <form className="lab-form" onSubmit={(event) => void send(event)}>
            <div className="lab-line">
              <div className="field">
                <label htmlFor="lab-method">Method</label>
                <select
                  id="lab-method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value as Method)}
                >
                  {METHODS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field grow">
                <label htmlFor="lab-path">Path</label>
                <input
                  id="lab-path"
                  className="mono"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  spellCheck={false}
                />
              </div>
              <Button variant="primary" type="submit" loading={sending}>
                Send
              </Button>
            </div>

            <div className="field">
              <label htmlFor="lab-body">Body</label>
              <textarea
                id="lab-body"
                className="mono"
                rows={7}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={method === 'GET' ? 'GET requests have no body' : '{ }'}
                disabled={method === 'GET' || method === 'DELETE'}
                spellCheck={false}
              />
              <p className="hint">
                Full URL · <span className="mono">{API_BASE}{path}</span>
              </p>
            </div>

            {localError ? (
              <p className="form-error" role="alert">
                {localError}
              </p>
            ) : null}

            <div className="chip-row" role="group" aria-label="Request presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="chip"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </form>

          {result ? (
            <div className="response">
              <div className="response-head">
                <Badge tone={statusTone(result.status)}>
                  {result.status} {result.ok ? 'OK' : 'error'}
                </Badge>
                <span className="mono small">{result.duration_ms} ms</span>
                {result.request_id ? (
                  <span className="mono small muted">
                    request {result.request_id}
                  </span>
                ) : null}
                <span className="mono small muted">
                  {formatNumber(responseText.length)} chars
                </span>
              </div>
              <pre className="code-block response-body">{responseText}</pre>
            </div>
          ) : null}
        </Card>

        <div className="stack">
          <Card
            title="Quick actions"
            subtitle="Each action is the same request the console uses."
          >
            <div className="stack-tight">
              <Button loading={busyAction === 'all'} onClick={() => void recomputeAll()}>
                Recompute all scores
              </Button>

              <Field label="Zone id" htmlFor="lab-zone">
                <input
                  id="lab-zone"
                  className="mono"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                />
              </Field>
              <Field
                label="Species (optional)"
                htmlFor="lab-species"
                hint="Leave empty to recompute every species in the zone."
              >
                <input
                  id="lab-species"
                  placeholder="bilberry"
                  value={species}
                  onChange={(event) => setSpecies(event.target.value)}
                />
              </Field>
              <Button
                loading={busyAction === 'zone'}
                onClick={() => void recomputeZone()}
              >
                Recompute this zone
              </Button>

              <hr className="rule" />

              <Field label="Job id" htmlFor="lab-job">
                <input
                  id="lab-job"
                  inputMode="numeric"
                  placeholder="123"
                  value={jobId}
                  onChange={(event) => setJobId(event.target.value)}
                />
              </Field>
              <Button
                loading={busyAction === 'retry'}
                onClick={() => void retryJob()}
              >
                Retry that job
              </Button>
            </div>
          </Card>

          <Card title="Environment" subtitle="What this tab is talking to.">
            <dl className="inputs-grid">
              <div>
                <dt>API origin</dt>
                <dd className="mono">{API_BASE}</dd>
              </div>
              <div>
                <dt>Signed in</dt>
                <dd>{session?.user.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{session?.user.role}</dd>
              </div>
              <div>
                <dt>User id</dt>
                <dd className="mono">{session?.user.id}</dd>
              </div>
              <div>
                <dt>Access token</dt>
                <dd>expires in ~{expiresInMinutes} min</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>memory + tab-scoped session</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Card
        title="Endpoint catalogue"
        subtitle="A short map of the admin surface; the full contract is at /docs."
      >
        <ul className="catalogue">
          {CATALOGUE.map((entry) => (
            <li key={`${entry.method}-${entry.path}`}>
              <Badge tone={entry.method === 'GET' ? 'neutral' : 'accent'}>
                {entry.method}
              </Badge>
              <code>{entry.path}</code>
              <span className="muted small">{entry.note}</span>
              <Button
                className="small ghost"
                onClick={() =>
                  applyPreset({
                    label: entry.path,
                    method: entry.method,
                    path: entry.path,
                    body: entry.method === 'GET' ? undefined : '{}',
                  })
                }
              >
                Use
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
