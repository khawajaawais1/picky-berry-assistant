import type { Visit } from '../visit-lifecycle';
import { parseVisitPage, parseVisitRecord, visitSubmission } from '../visit-submission';

/**
 * A finalized visit as `POST /visits` takes it, and a visit as the API answers it (ADR-065, the
 * plan's phase 4). The server dedupes on `client_id`, so the tracker's own id is the key, and it
 * judges the visit itself: a short or overlapping visit comes back `rejected` with a reason.
 */
const ZONE = 'cc0e7929-de9f-516a-9049-7a25a1a6d092';
const ID = '4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d';
const T0 = Date.parse('2026-08-03T09:00:00.000Z');

function visit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: ID,
    zoneId: ZONE,
    policyVersion: 'stand-in-1',
    openedAt: T0,
    lastPresenceAt: T0 + 40 * 60_000,
    segments: [{ enteredAt: T0, exitedAt: T0 + 45 * 60_000 }],
    finalizedAt: T0 + 50 * 60_000,
    ...overrides,
  };
}

describe('visitSubmission', () => {
  it('sends the visit from its first entry to its last exit, keyed by the tracker’s id', () => {
    expect(visitSubmission(visit())).toEqual({
      client_id: ID,
      zone_id: ZONE,
      started_at: '2026-08-03T09:00:00.000Z',
      ended_at: '2026-08-03T09:45:00.000Z',
      manual: false,
    });
  });

  it('ends at the last evidence of presence when the last segment never closed', () => {
    const open = visit({ segments: [{ enteredAt: T0, exitedAt: null }] });

    expect(visitSubmission(open)?.ended_at).toBe('2026-08-03T09:40:00.000Z');
  });

  it('sends nothing for a visit that may still resume', () => {
    expect(visitSubmission(visit({ finalizedAt: null }))).toBeNull();
  });

  it('sends nothing whose id or zone is not the UUID the API keys on', () => {
    expect(visitSubmission(visit({ id: 'visit-1' }))).toBeNull();
    expect(visitSubmission(visit({ zoneId: 'Z14' }))).toBeNull();
  });
});

describe('parseVisitRecord', () => {
  const RECORD = {
    id: ID,
    zone_id: ZONE,
    zone_name: 'Laajavuori 1',
    started_at: '2026-08-03T09:00:00.000Z',
    ended_at: '2026-08-03T09:45:00.000Z',
    duration_s: 2700,
    manual: false,
    status: 'accepted',
    reject_reason: null,
  };

  it('reads an accepted visit', () => {
    expect(parseVisitRecord(RECORD)).toEqual({
      id: ID,
      zoneId: ZONE,
      zoneName: 'Laajavuori 1',
      startedAt: '2026-08-03T09:00:00.000Z',
      durationSeconds: 2700,
      status: 'accepted',
      rejectReason: null,
    });
  });

  it('reads a rejected visit with the server’s reason', () => {
    expect(
      parseVisitRecord({ ...RECORD, status: 'rejected', reject_reason: 'too_short' }),
    ).toMatchObject({ status: 'rejected', rejectReason: 'too_short' });
  });

  it('reads a record it cannot trust as nothing', () => {
    expect(parseVisitRecord({ ...RECORD, status: 'pending' })).toBeNull();
    expect(parseVisitRecord({ ...RECORD, duration_s: -5 })).toBeNull();
    expect(parseVisitRecord({ ...RECORD, started_at: 'today' })).toBeNull();
  });
});

describe('parseVisitPage', () => {
  it('reads the visits it can, and the cursor to the next page', () => {
    const record = parseVisitRecord({
      id: ID,
      zone_id: null,
      zone_name: null,
      started_at: '2026-08-03T09:00:00.000Z',
      ended_at: '2026-08-03T09:45:00.000Z',
      duration_s: 2700,
      manual: false,
      status: 'accepted',
      reject_reason: null,
    });

    expect(
      parseVisitPage({
        visits: [
          {
            id: ID,
            zone_id: null,
            zone_name: null,
            started_at: '2026-08-03T09:00:00.000Z',
            ended_at: '2026-08-03T09:45:00.000Z',
            duration_s: 2700,
            manual: false,
            status: 'accepted',
            reject_reason: null,
          },
          { id: 'broken' },
        ],
        next_cursor: 'abc',
      }),
    ).toEqual({ visits: [record], nextCursor: 'abc' });
  });

  it('reads a document with no visits list as nothing', () => {
    expect(parseVisitPage({ next_cursor: null })).toBeNull();
  });
});
