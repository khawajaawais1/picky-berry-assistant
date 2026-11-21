import { useSyncExternalStore } from 'react';

import type { Visit } from '../domain/visit-lifecycle';

/**
 * The one tracked visit the app is having, published by the mounted `VisitTracker` and read by
 * the two screens that show it (09's active visit and 10's report).
 *
 * It is an external store rather than React context because the tracker lives in the app shell
 * and the screens are routes: a route can mount without re-rendering the tracker, and an external
 * store lets both read one snapshot without a provider between them. Nothing is persisted here:
 * a visit that matters is already in the tracker and its outbox.
 */
export type VisitSessionVisit = {
  visitId: string;
  zoneId: string;
  zoneName: string;
  openedAt: number;
  endedAt: number | null;
};

export type VisitSessionCandidate = {
  zoneId: string;
  zoneName: string;
  enteredAt: number;
};

export type VisitSessionSnapshot = {
  active: VisitSessionVisit | null;
  candidate: VisitSessionCandidate | null;
  lastFinalized: VisitSessionVisit | null;
};

const EMPTY: VisitSessionSnapshot = Object.freeze({
  active: null,
  candidate: null,
  lastFinalized: null,
});

let snapshot: VisitSessionSnapshot = EMPTY;
const listeners = new Set<() => void>();
let endHandler: ((at: number) => VisitSessionVisit | null) | null = null;
/**
 * The finalized visit whose report has already been saved or skipped. The tracker republishes its
 * whole reading whenever its visits change, so without this the same ended visit would come back
 * as a new report after the route cleared it.
 */
let consumedFinalizedId: string | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: VisitSessionSnapshot): void {
  if (
    snapshot.active === next.active &&
    snapshot.candidate === next.candidate &&
    snapshot.lastFinalized === next.lastFinalized
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) listener();
}

/** Replaces the named parts of the snapshot; parts not named are left as they are. */
export function publishVisitSession(update: Partial<VisitSessionSnapshot>): void {
  const incoming =
    update.lastFinalized === undefined ? snapshot.lastFinalized : update.lastFinalized;
  publish({
    active: update.active === undefined ? snapshot.active : update.active,
    candidate: update.candidate === undefined ? snapshot.candidate : update.candidate,
    lastFinalized: incoming !== null && incoming.visitId === consumedFinalizedId ? null : incoming,
  });
}

/** The tracker registers how a visit is ended; the screen calls it without importing the hook. */
export function registerVisitEnd(handler: (at: number) => VisitSessionVisit | null): () => void {
  endHandler = handler;
  return () => {
    if (endHandler === handler) endHandler = null;
  };
}

/** Ends the visit the picker is in, if there is one, and returns it as it was finalized. */
export function endTrackedVisit(at: number = Date.now()): VisitSessionVisit | null {
  return endHandler?.(at) ?? null;
}

export function clearLastFinalized(): void {
  consumedFinalizedId = snapshot.lastFinalized?.visitId ?? null;
  publishVisitSession({ lastFinalized: null });
}

/** Clears everything the shell was showing, for example when the tracker unmounts on sign-out. */
export function clearVisitSession(): void {
  consumedFinalizedId = null;
  publish(EMPTY);
}

export function useVisitSession(): VisitSessionSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}

/** The tracker's `Visit` as the screens' own reading, under the zone's display name. */
export function visitSessionVisit(visit: Visit, zoneName: string): VisitSessionVisit {
  return {
    endedAt: visit.finalizedAt,
    openedAt: visit.openedAt,
    visitId: visit.id,
    zoneId: visit.zoneId,
    zoneName,
  };
}
