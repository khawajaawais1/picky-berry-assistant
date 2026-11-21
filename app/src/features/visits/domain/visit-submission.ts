import type { Visit } from './visit-lifecycle';

/**
 * A finalized visit as the team API's `POST /visits` takes it, and a visit as `GET /visits`
 * answers it (ADR-065, the API integration plan's phase 4). Pure: no React, no I/O.
 *
 * - **The tracker's id is the idempotency key.** The server dedupes on `client_id`
 *   (ADR-005), so resending a visit after a lost answer records it once.
 * - **The server judges the visit.** A short, future or overlapping visit is recorded as
 *   `rejected` with a reason rather than refused, so the client sends what it saw and reads the
 *   verdict instead of applying the server's limits a second time.
 * - **Only a finalized visit is sent.** One that may still resume is not a visit yet.
 */

export type VisitSubmission = {
  client_id: string;
  zone_id: string;
  started_at: string;
  ended_at: string;
  manual: boolean;
};

export const VISIT_REJECT_REASONS = [
  'invalid_range',
  'in_future',
  'too_short',
  'too_long',
  'zone_not_found',
  'overlap',
] as const;
export type VisitRejectReason = (typeof VISIT_REJECT_REASONS)[number];

/** A visit as the API recorded it. */
export type VisitRecord = {
  id: string;
  zoneId: string | null;
  zoneName: string | null;
  startedAt: string;
  durationSeconds: number;
  status: 'accepted' | 'rejected';
  rejectReason: VisitRejectReason | null;
};

export type VisitPage = { visits: readonly VisitRecord[]; nextCursor: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function visitSubmission(visit: Visit): VisitSubmission | null {
  if (visit.finalizedAt === null) return null;
  if (!UUID.test(visit.id) || !UUID.test(visit.zoneId)) return null;

  const last = visit.segments[visit.segments.length - 1];
  const endedAt = last?.exitedAt ?? visit.lastPresenceAt;

  return {
    client_id: visit.id,
    zone_id: visit.zoneId,
    started_at: new Date(visit.openedAt).toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    manual: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function instant(value: unknown): string | null {
  return typeof value === 'string' && INSTANT.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

export function parseVisitRecord(body: unknown): VisitRecord | null {
  if (!isRecord(body) || typeof body.id !== 'string' || !UUID.test(body.id)) return null;

  const startedAt = instant(body.started_at);
  const { duration_s: duration, status, reject_reason: reason } = body;
  if (startedAt === null) return null;
  if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 0) return null;
  if (status !== 'accepted' && status !== 'rejected') return null;
  if (reason !== null && !(VISIT_REJECT_REASONS as readonly unknown[]).includes(reason)) {
    return null;
  }

  return {
    id: body.id,
    zoneId: typeof body.zone_id === 'string' ? body.zone_id : null,
    zoneName: typeof body.zone_name === 'string' && body.zone_name.trim() ? body.zone_name : null,
    startedAt,
    durationSeconds: duration,
    status,
    rejectReason: reason as VisitRejectReason | null,
  };
}

export function parseVisitPage(body: unknown): VisitPage | null {
  if (!isRecord(body) || !Array.isArray(body.visits)) return null;

  return {
    visits: body.visits.map(parseVisitRecord).filter((v): v is VisitRecord => v !== null),
    nextCursor: typeof body.next_cursor === 'string' ? body.next_cursor : null,
  };
}
