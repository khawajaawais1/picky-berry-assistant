import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { appReportsApi, flushReportQueue } from '@/services/reports';

/**
 * Sends the reports this phone queued while it had no signal, once each time the app shell opens.
 * It draws nothing; a pass that cannot reach the API leaves the queue for the next one.
 */
export function ReportSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void flushReportQueue(appReportsApi)
      .then(() => queryClient.invalidateQueries({ queryKey: ['me'] }))
      .catch(() => undefined);
  }, [queryClient]);

  return null;
}
