import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import type { ApiError } from '../api/client';
import { formatNumber, plural, titleCase } from '../lib/format';

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'accent';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  id,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`panel ${className}`.trim()}>
      {title || actions ? (
        <header className="panel-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p className="muted small">{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  loading?: boolean;
}

export function Button({
  variant = 'default',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={`button button-${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-card" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry?: () => void;
}) {
  const title =
    error.status === 403
      ? 'The API refused this request'
      : error.status === 401
        ? 'Your session has ended'
        : 'Could not load this view';
  return (
    <div className="state-card state-error" role="alert">
      <p className="state-title">{title}</p>
      <p>{error.message}</p>
      <p className="mono small muted">
        {error.code}
        {error.requestId ? ` · request ${error.requestId}` : ''}
      </p>
      {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="state-card state-empty">
      <p className="state-title">{title}</p>
      {children ? <p className="muted">{children}</p> : null}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <p className="muted small">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </p>
      <div className="row gap">
        <Button
          className="small"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <span className="mono small">
          Page {page} / {pages}
        </span>
        <Button
          className="small"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="muted">—</span>;
  const tone: Tone = score >= 70 ? 'good' : score >= 45 ? 'warn' : 'bad';
  return <Badge tone={tone}>{score}</Badge>;
}

export function ConfidenceBadge({ value }: { value: string }) {
  const tone: Tone =
    value === 'high' ? 'good' : value === 'medium' ? 'warn' : 'neutral';
  return <Badge tone={tone}>{titleCase(value)}</Badge>;
}

export function TrustBadge({ value }: { value: number }) {
  const tone: Tone = value >= 0.7 ? 'good' : value >= 0.5 ? 'neutral' : 'warn';
  return (
    <Badge tone={tone}>
      <span title="Server-side trust score; read-only until feature 6.5">
        {value.toFixed(2)}
      </span>
    </Badge>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5`}>
      <span aria-hidden="true">
        {'★'.repeat(rating)}
        {'☆'.repeat(Math.max(0, 5 - rating))}
      </span>
    </span>
  );
}

type ToastTone = 'good' | 'bad' | 'info';
interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<
  ((tone: ToastTone, message: string) => void) | null
>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = window.crypto.randomUUID();
    setItems((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast must be used inside ToastProvider');
  return push;
}

export function CopyButton({
  value,
  label = 'Copy',
}: {
  value: string;
  label?: string;
}) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast('good', `${label} done.`);
    } catch {
      toast('bad', 'The browser refused clipboard access.');
    }
  };
  return (
    <Button className="small ghost" onClick={() => void copy()}>
      {label}
    </Button>
  );
}

export function CountSummary({
  counts,
  suffix,
}: {
  counts: { label: string; value: number; tone?: Tone }[];
  suffix?: string;
}) {
  return (
    <div className="count-summary">
      {counts.map((count) => (
        <div key={count.label} className="count-item">
          <span className="count-value">{formatNumber(count.value)}</span>
          <span className="count-label">
            {count.label} {suffix ? plural(count.value, suffix) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
