import type { VisitPolicy } from './visit-policy';

/**
 * The visit lifecycle: presence samples in, visits out.
 *
 * Pure and deterministic — no clock, no GPS, no storage. The caller supplies
 * samples (already resolved to "inside this zone or not" by `zone-containment`) and
 * an id generator, which makes the whole state machine testable and lets the app
 * replay samples after a restart.
 *
 * Rules, as decided by the owner on 2026-10-08 (PROJECT.md "Domain model decisions"):
 * 1. entering a zone only counts once the dwell minimum has elapsed;
 * 2. leaving then re-entering within the grace window continues the same visit, as
 *    an extra presence segment;
 * 3. a visit never spans more than the policy's number of local days — the split
 *    requires evidence of presence on the new day, so it happens when a sample
 *    arrives, not when a timer fires.
 */

export type ZonePresenceSample = {
  zoneId: string;
  inside: boolean;
  /** Epoch milliseconds of the observation. */
  at: number;
};

export type PresenceSegment = {
  enteredAt: number;
  /** null while the user is still inside (the segment is open). */
  exitedAt: number | null;
};

export type Visit = {
  /** Client-generated idempotency key (ADR-005); the server dedupes on it. */
  id: string;
  zoneId: string;
  /** Policy the decision was made under, echoed for reconciliation. */
  policyVersion: string;
  /** When presence started, not when the dwell was confirmed. */
  openedAt: number;
  /** Most recent evidence of presence. */
  lastPresenceAt: number;
  segments: readonly PresenceSegment[];
  /** Set once the visit can no longer change; null while it may still resume. */
  finalizedAt: number | null;
};

export type CandidateEntry = {
  zoneId: string;
  enteredAt: number;
  policyVersion: string;
};

export type VisitTrackerState = {
  /** An entry that has not yet earned its dwell. */
  candidate: CandidateEntry | null;
  visits: readonly Visit[];
};

export type VisitEvent =
  | { type: 'visit-opened'; visitId: string; zoneId: string; at: number }
  | { type: 'visit-resumed'; visitId: string; zoneId: string; at: number }
  | { type: 'segment-closed'; visitId: string; zoneId: string; at: number }
  | { type: 'visit-finalized'; visitId: string; zoneId: string; at: number }
  | { type: 'entry-ignored'; zoneId: string; at: number; reason: 'dwell-not-met' };

export type VisitTrackerDeps = {
  /** Must produce a stable unique key in the app (a UUID); tests inject a counter. */
  nextVisitId: () => string;
  /** Local calendar-day ordinal for a timestamp. Defaults to the device's local time. */
  localDayOf?: (at: number) => number;
};

export type VisitTrackerResult = {
  state: VisitTrackerState;
  events: readonly VisitEvent[];
};

export function createVisitTrackerState(): VisitTrackerState {
  return { candidate: null, visits: [] };
}

/**
 * Days since the epoch in device-local time. Approximate across a daylight-saving
 * transition; which clock owns the day boundary is still an open question
 * (PROJECT.md 10), which is why this is injectable.
 */
export function defaultLocalDayOf(at: number): number {
  const offsetMinutes = new Date(at).getTimezoneOffset();
  return Math.floor((at - offsetMinutes * 60_000) / 86_400_000);
}

function isOpen(visit: Visit): boolean {
  const last = visit.segments[visit.segments.length - 1];
  return last !== undefined && last.exitedAt === null;
}

function closeLastSegment(visit: Visit, at: number): readonly PresenceSegment[] {
  const segments = [...visit.segments];
  const index = segments.length - 1;
  const last = segments[index];
  if (last === undefined || last.exitedAt !== null) return visit.segments;
  segments[index] = { enteredAt: last.enteredAt, exitedAt: at };
  return segments;
}

function replaceVisit(visits: readonly Visit[], id: string, next: Visit): readonly Visit[] {
  return visits.map((visit) => (visit.id === id ? next : visit));
}

type FinalizeOutcome = { visits: readonly Visit[]; events: VisitEvent[] };

/**
 * Ends visits that can no longer change and reports what happened, oldest first.
 *
 * @param withDayRule also split visits whose presence continues into a later local
 *   day. Only a sample can prove that, so the timer path leaves it false.
 */
function finalizeDueVisits(
  visits: readonly Visit[],
  at: number,
  policy: VisitPolicy,
  localDayOf: (time: number) => number,
  withDayRule: boolean,
): FinalizeOutcome {
  const events: VisitEvent[] = [];
  let next = visits;

  for (const visit of visits) {
    if (visit.finalizedAt !== null) continue;

    const open = isOpen(visit);
    const graceExpired = !open && at - visit.lastPresenceAt > policy.graceMs;
    const dayExceeded =
      withDayRule && localDayOf(at) - localDayOf(visit.openedAt) >= policy.maxVisitSpanDays;

    if (!graceExpired && !dayExceeded) continue;

    const closed: Visit = {
      ...visit,
      segments: open ? closeLastSegment(visit, visit.lastPresenceAt) : visit.segments,
      finalizedAt: visit.lastPresenceAt,
    };
    if (open) {
      events.push({
        type: 'segment-closed',
        visitId: visit.id,
        zoneId: visit.zoneId,
        at: visit.lastPresenceAt,
      });
    }
    events.push({
      type: 'visit-finalized',
      visitId: visit.id,
      zoneId: visit.zoneId,
      at: closed.finalizedAt!,
    });
    next = replaceVisit(next, visit.id, closed);
  }

  return { visits: next, events };
}

function isStale(state: VisitTrackerState, sample: ZonePresenceSample): boolean {
  // Compare against the newest knowledge for that zone, not the first visit found,
  // or a zone with several visits could accept a sample that moves time backwards.
  let latestPresenceAt: number | null = null;
  for (const visit of state.visits) {
    if (visit.zoneId !== sample.zoneId) continue;
    if (latestPresenceAt === null || visit.lastPresenceAt > latestPresenceAt) {
      latestPresenceAt = visit.lastPresenceAt;
    }
  }

  if (latestPresenceAt !== null && sample.at <= latestPresenceAt) return true;
  return state.candidate !== null && sample.at <= state.candidate.enteredAt;
}

/**
 * Applies one presence sample.
 *
 * Duplicate and out-of-order samples are ignored: the tracker never rewrites
 * history it has already accepted, so replaying a sample stream cannot corrupt a
 * visit.
 */
export function applyPresence(
  state: VisitTrackerState,
  sample: ZonePresenceSample,
  policy: VisitPolicy,
  deps: VisitTrackerDeps,
): VisitTrackerResult {
  const localDayOf = deps.localDayOf ?? defaultLocalDayOf;

  if (isStale(state, sample)) return { state, events: [] };

  const due = finalizeDueVisits(state.visits, sample.at, policy, localDayOf, true);
  const events: VisitEvent[] = [...due.events];
  let visits = due.visits;
  let candidate = state.candidate;

  const existing = visits.find(
    (visit) => visit.zoneId === sample.zoneId && visit.finalizedAt === null,
  );
  const openVisit = existing !== undefined && isOpen(existing) ? existing : undefined;
  const resumableVisit = existing !== undefined && !isOpen(existing) ? existing : undefined;

  if (sample.inside) {
    if (openVisit !== undefined) {
      visits = replaceVisit(visits, openVisit.id, { ...openVisit, lastPresenceAt: sample.at });
      return { state: { candidate, visits }, events };
    }

    if (resumableVisit !== undefined) {
      visits = replaceVisit(visits, resumableVisit.id, {
        ...resumableVisit,
        lastPresenceAt: sample.at,
        segments: [...resumableVisit.segments, { enteredAt: sample.at, exitedAt: null }],
      });
      events.push({
        type: 'visit-resumed',
        visitId: resumableVisit.id,
        zoneId: sample.zoneId,
        at: sample.at,
      });
      return { state: { candidate, visits }, events };
    }

    if (candidate !== null && candidate.zoneId !== sample.zoneId) {
      events.push({
        type: 'entry-ignored',
        zoneId: candidate.zoneId,
        at: sample.at,
        reason: 'dwell-not-met',
      });
      candidate = null;
    }

    if (candidate === null) {
      candidate = { zoneId: sample.zoneId, enteredAt: sample.at, policyVersion: policy.version };
      return { state: { candidate, visits }, events };
    }

    if (sample.at - candidate.enteredAt < policy.dwellMs) {
      return { state: { candidate, visits }, events };
    }

    const opened: Visit = {
      id: deps.nextVisitId(),
      zoneId: sample.zoneId,
      policyVersion: candidate.policyVersion,
      openedAt: candidate.enteredAt,
      lastPresenceAt: sample.at,
      segments: [{ enteredAt: candidate.enteredAt, exitedAt: null }],
      finalizedAt: null,
    };
    visits = [...visits, opened];
    events.push({ type: 'visit-opened', visitId: opened.id, zoneId: opened.zoneId, at: sample.at });
    return { state: { candidate: null, visits }, events };
  }

  if (candidate !== null && candidate.zoneId === sample.zoneId) {
    if (sample.at - candidate.enteredAt < policy.dwellMs) {
      events.push({
        type: 'entry-ignored',
        zoneId: sample.zoneId,
        at: sample.at,
        reason: 'dwell-not-met',
      });
      return { state: { candidate: null, visits }, events };
    }

    const opened: Visit = {
      id: deps.nextVisitId(),
      zoneId: sample.zoneId,
      policyVersion: candidate.policyVersion,
      openedAt: candidate.enteredAt,
      lastPresenceAt: sample.at,
      segments: [{ enteredAt: candidate.enteredAt, exitedAt: sample.at }],
      finalizedAt: null,
    };
    visits = [...visits, opened];
    events.push({ type: 'visit-opened', visitId: opened.id, zoneId: opened.zoneId, at: sample.at });
    events.push({
      type: 'segment-closed',
      visitId: opened.id,
      zoneId: opened.zoneId,
      at: sample.at,
    });
    return { state: { candidate: null, visits }, events };
  }

  if (openVisit !== undefined) {
    visits = replaceVisit(visits, openVisit.id, {
      ...openVisit,
      lastPresenceAt: sample.at,
      segments: closeLastSegment(openVisit, sample.at),
    });
    events.push({
      type: 'segment-closed',
      visitId: openVisit.id,
      zoneId: openVisit.zoneId,
      at: sample.at,
    });
  }

  return { state: { candidate, visits }, events };
}

/**
 * Time-driven finalization: a visit whose presence ended and whose grace window has
 * passed can never resume, so it becomes immutable.
 */
export function finalizeExpired(
  state: VisitTrackerState,
  now: number,
  policy: VisitPolicy,
  deps: Pick<VisitTrackerDeps, 'localDayOf'> = {},
): VisitTrackerResult {
  const localDayOf = deps.localDayOf ?? defaultLocalDayOf;
  const due = finalizeDueVisits(state.visits, now, policy, localDayOf, false);

  if (due.events.length === 0) return { state, events: [] };
  return { state: { candidate: state.candidate, visits: due.visits }, events: due.events };
}
