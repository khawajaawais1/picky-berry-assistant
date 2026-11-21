import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { PositionSource } from '@/services/location';

import type { VisitPolicy } from '../domain/visit-policy';
import type { ZonePolygon } from '../domain/zone-containment';
import { useVisitPresence } from '../hooks/use-visit-presence';
import {
  clearVisitSession,
  publishVisitSession,
  registerVisitEnd,
  visitSessionVisit,
  type VisitSessionVisit,
} from '../hooks/use-visit-session';
import { useVisitSync } from '../hooks/use-visit-sync';
import type { VisitsApi } from '../services/visits-api';

/**
 * The visit tracker, mounted (ADR-066). It draws nothing: it reads position through
 * `useVisitPresence` (the consent record and the platform's permission are the only gates,
 * foreground only, ADR-045 and ADR-056), and sends each finalized visit to `POST /visits` once
 * through `useVisitSync`'s durable outbox. Returning to the foreground finalizes and sends too. No fix is stored or logged; only the finished visit leaves the device,
 * as the start, end and zone the server needs.
 */
export type VisitTrackerProps = {
  zones: readonly ZonePolygon[];
  /** The zones' display names, keyed by id. Missing names fall back to the id. */
  zoneNames?: ReadonlyMap<string, string>;
  api: VisitsApi | undefined;
  policy?: VisitPolicy;
  source?: PositionSource;
  nextVisitId?: () => string;
};

function zoneNameOf(zoneId: string, zoneNames?: ReadonlyMap<string, string>): string {
  return zoneNames?.get(zoneId) ?? zoneId;
}

export function VisitTracker({
  api,
  nextVisitId,
  policy,
  source,
  zoneNames,
  zones,
}: VisitTrackerProps) {
  const { candidate, endVisitNow, finalizeNow, visits } = useVisitPresence({
    nextVisitId,
    policy,
    source,
    zones,
  });
  const { flush } = useVisitSync({ api, visits });

  const active = [...visits].reverse().find((visit) => visit.finalizedAt === null) ?? null;
  const lastFinalized = [...visits].reverse().find((visit) => visit.finalizedAt !== null) ?? null;

  // Publish what the routes draw. It is the same data the sync hook sends, read once here so the
  // screens never have to reach into the tracker's hook themselves.
  useEffect(() => {
    publishVisitSession({
      active:
        active === null ? null : visitSessionVisit(active, zoneNameOf(active.zoneId, zoneNames)),
      candidate:
        candidate === null
          ? null
          : {
              enteredAt: candidate.enteredAt,
              zoneId: candidate.zoneId,
              zoneName: zoneNameOf(candidate.zoneId, zoneNames),
            },
      lastFinalized:
        lastFinalized === null
          ? null
          : visitSessionVisit(lastFinalized, zoneNameOf(lastFinalized.zoneId, zoneNames)),
    });
  }, [active, candidate, lastFinalized, zoneNames]);

  // The route ends a visit through the store rather than through this component, because the
  // tracker is mounted by the shell and the screen is a route under it.
  const end = useRef<(at: number) => VisitSessionVisit | null>(() => null);
  // The callback is refreshed after every render so the registered handler sees the newest
  // `endVisitNow` and zone names. Writing a ref during render is what the React lint rule forbids.
  useEffect(() => {
    end.current = (at) => {
      const visit = endVisitNow(at);
      if (visit === null) return null;

      const ended = visitSessionVisit(visit, zoneNameOf(visit.zoneId, zoneNames));
      publishVisitSession({ active: null, candidate: null, lastFinalized: ended });
      return ended;
    };
  });
  useEffect(() => registerVisitEnd((at) => end.current(at)), []);
  useEffect(() => clearVisitSession, []);

  // Returning to the foreground is evidence of time (ADR-066): it finalizes a visit whose grace
  // window passed while no fix came, and sends what is waiting. Both platforms report it the
  // same way. It is an OS event, not a timer (ADR-063).
  const onActive = useRef(() => {});
  useEffect(() => {
    onActive.current = () => {
      finalizeNow(Date.now());
      void flush().catch(() => undefined);
    };
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onActive.current();
    });
    return () => subscription.remove();
  }, []);

  return null;
}
