import { useCallback, useEffect, useRef } from 'react';

import {
  addToVisitOutbox,
  readVisitOutbox,
  removeFromVisitOutbox,
  type OutboxVisit,
} from '@/services/visit-outbox';

import type { Visit } from '../domain/visit-lifecycle';
import { visitSubmission, type VisitSubmission } from '../domain/visit-submission';
import type { VisitsApi } from '../services/visits-api';

/**
 * Sends the tracker's finalized visits to `POST /visits` through a durable outbox (ADR-066).
 *
 * A finalized visit is kept on the device first, then the outbox is flushed: each entry is sent,
 * and leaves the outbox once the server has answered it, recorded or refused. An entry the
 * network lost stays, and the flush stops there, so the next flush tries again. The outbox is
 * flushed on mount (so a visit an earlier run left is sent on the next launch), after each visit
 * is kept, and whenever the caller asks (`flush`, which the tracker calls when the app returns
 * to the foreground). The server records a visit once, because its id is the `client_id`.
 */
export type VisitOutboxStore = {
  read(): Promise<OutboxVisit[]>;
  add(entry: OutboxVisit): Promise<void>;
  remove(clientId: string): Promise<void>;
};

const deviceOutbox: VisitOutboxStore = {
  read: readVisitOutbox,
  add: addToVisitOutbox,
  remove: removeFromVisitOutbox,
};

export type UseVisitSyncOptions = {
  /** The visits API, or nothing when this build has no service to send to. */
  api: VisitsApi | undefined;
  visits: readonly Visit[];
  /** Where waiting visits are kept. Defaults to the device's outbox. */
  outbox?: VisitOutboxStore;
};

function toEntry(payload: VisitSubmission): OutboxVisit {
  return {
    clientId: payload.client_id,
    zoneId: payload.zone_id,
    startedAt: payload.started_at,
    endedAt: payload.ended_at,
  };
}

function toPayload(entry: OutboxVisit): VisitSubmission {
  return {
    client_id: entry.clientId,
    zone_id: entry.zoneId,
    started_at: entry.startedAt,
    ended_at: entry.endedAt,
    manual: false,
  };
}

export function useVisitSync({ api, visits, outbox = deviceOutbox }: UseVisitSyncOptions): {
  flush: () => Promise<void>;
} {
  const kept = useRef(new Set<string>());
  const flushing = useRef<Promise<void> | null>(null);

  const again = useRef(false);
  const latest = useRef<() => Promise<void>>(() => Promise.resolve());

  const flush = useCallback((): Promise<void> => {
    if (!api) return Promise.resolve();
    // One flush at a time: two at once would post the same entry twice. A flush asked for while
    // one runs is not dropped: it starts one more pass when the running one ends, because that one
    // may have read the outbox before the newest visit was kept.
    if (flushing.current) {
      again.current = true;
      return flushing.current;
    }

    again.current = false;
    flushing.current = (async () => {
      for (const entry of await outbox.read()) {
        const outcome = await api.send(toPayload(entry));
        if (outcome.kind === 'retry') return;
        await outbox.remove(entry.clientId);
      }
    })().finally(() => {
      flushing.current = null;
      if (again.current) void latest.current().catch(() => undefined);
    });
    return flushing.current;
  }, [api, outbox]);

  useEffect(() => {
    latest.current = flush;
    void flush().catch(() => undefined);
  }, [flush]);

  useEffect(() => {
    if (!api) return;

    const fresh = visits
      .map(visitSubmission)
      .filter((payload): payload is VisitSubmission => payload !== null)
      .filter((payload) => !kept.current.has(payload.client_id));
    if (fresh.length === 0) return;

    for (const payload of fresh) kept.current.add(payload.client_id);
    void (async () => {
      for (const payload of fresh) await outbox.add(toEntry(payload));
      await flush();
    })().catch(() => {
      // A visit the device would not keep is tried again on the next change, rather than lost.
      for (const payload of fresh) kept.current.delete(payload.client_id);
    });
  }, [api, flush, outbox, visits]);

  return { flush };
}
