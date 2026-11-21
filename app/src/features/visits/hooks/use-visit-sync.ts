import { useEffect, useRef } from 'react';

import type { Visit } from '../domain/visit-lifecycle';
import type { VisitsApi } from '../services/visits-api';

/**
 * Sends the tracker's finalized visits to `POST /visits` (ADR-065, the plan's phase 4).
 *
 * Each visit is sent once while its answer is pending, so two renders cannot post it twice. A
 * visit the server recorded or refused is done for this run. A visit the network lost is tried
 * again the next time the tracker's list changes, and the server records it once because the
 * visit's own id is its `client_id`. There is no timer: a retry needs new evidence, not a clock.
 *
 * It holds nothing across launches. A durable outbox is the plan's offline phase.
 */
export type UseVisitSyncOptions = {
  /** The visits API, or nothing when this build has no service to send to. */
  api: VisitsApi | undefined;
  visits: readonly Visit[];
};

export function useVisitSync({ api, visits }: UseVisitSyncOptions): void {
  const handled = useRef(new Map<string, 'sending' | 'done'>());

  useEffect(() => {
    if (!api) return;

    for (const visit of visits) {
      if (visit.finalizedAt === null || handled.current.has(visit.id)) continue;

      handled.current.set(visit.id, 'sending');
      void api.submit(visit).then(
        (outcome) => {
          if (outcome.kind === 'retry') handled.current.delete(visit.id);
          else handled.current.set(visit.id, 'done');
        },
        () => {
          // A submit that threw is a bug in the adapter, not a verdict on the visit: leave it
          // unsent so the next change tries it again rather than losing it silently.
          handled.current.delete(visit.id);
        },
      );
    }
  }, [api, visits]);
}
