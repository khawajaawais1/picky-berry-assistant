import { useEffect, useState } from 'react';

import { readVisitOutbox, type OutboxVisit } from '@/services/visit-outbox';

/**
 * The finished visits waiting to be sent (ADR-066), as the privacy screens read them: the
 * entries, whether the read is still running, and whether it failed. A failed read is never
 * presented as an empty outbox.
 */
export type VisitOutboxState = {
  entries: OutboxVisit[];
  loading: boolean;
  error: boolean;
};

export function useVisitOutbox(): VisitOutboxState {
  const [entries, setEntries] = useState<OutboxVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    readVisitOutbox()
      .then((stored) => {
        if (active) setEntries(stored);
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

  return { entries, error, loading };
}
