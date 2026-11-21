import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { PositionSource } from '@/services/location';

import type { VisitPolicy } from '../domain/visit-policy';
import type { ZonePolygon } from '../domain/zone-containment';
import { useVisitPresence } from '../hooks/use-visit-presence';
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
  api: VisitsApi | undefined;
  policy?: VisitPolicy;
  source?: PositionSource;
  nextVisitId?: () => string;
};

export function VisitTracker({ api, nextVisitId, policy, source, zones }: VisitTrackerProps) {
  const { finalizeNow, visits } = useVisitPresence({ nextVisitId, policy, source, zones });
  const { flush } = useVisitSync({ api, visits });

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
