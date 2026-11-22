const numberFormat = new Intl.NumberFormat('en-GB');
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
});
const relativeFormat = new Intl.RelativeTimeFormat('en-GB', {
  numeric: 'auto',
});

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : numberFormat.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

export function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : shortDateFormat.format(date);
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  if (absolute < 60) return 'just now';
  if (absolute < 3600) {
    return relativeFormat.format(Math.round(seconds / 60), 'minute');
  }
  if (absolute < 86_400) {
    return relativeFormat.format(Math.round(seconds / 3600), 'hour');
  }
  if (absolute < 2_592_000) {
    return relativeFormat.format(Math.round(seconds / 86_400), 'day');
  }
  return relativeFormat.format(Math.round(seconds / 2_592_000), 'month');
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

export function formatTrust(value: number): string {
  return value.toFixed(2);
}

export function titleCase(value: string): string {
  return value
    .replace(/[_.]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
