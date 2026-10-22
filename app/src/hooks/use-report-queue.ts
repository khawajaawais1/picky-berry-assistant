import { useEffect, useState } from 'react';

import { readReportQueue, type VisitReport } from '@/services/report-queue';

/**
 * The reports this device is holding ([report-queue.ts](../services/report-queue.ts)), as a
 * screen uses them.
 *
 * It lives with the other shared hooks rather than in a feature because two features read the
 * queue: `discover` lists it as the picker's visit history (frame 11) and `offline` is the sync
 * centre that says what is still waiting (frame 13). A read in flight and a failure a screen has
 * to show are UI state, while the service stays plain storage any caller can use.
 *
 * A read that fails reports `error` and leaves `reports` empty: an unreadable store must never be
 * presented as an empty history the picker did not write.
 */
export type ReportQueueState = {
  /** The queued reports, oldest first, exactly as the queue holds them. */
  reports: VisitReport[];
  /** True while the queue is being read; nothing may present its contents as known yet. */
  loading: boolean;
  /** True when the device would not let the app read the queue. */
  error: boolean;
};

export function useReportQueue(): ReportQueueState {
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    readReportQueue()
      .then((stored) => {
        if (active) setReports(stored);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { error, loading, reports };
}
