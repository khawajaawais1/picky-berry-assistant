import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * The app's one query cache (ADR-051: reads go through TanStack Query).
 *
 * **Two things are configuration, not preference:**
 *
 * - `refetchOnWindowFocus` is off. React Native has no window focus, and the web export's
 *   focus event is a browser tab's, not a picker's: a forest screen must not re-read the
 *   zone service because someone looked at another tab.
 * - the client is **made once per app mount**, never at module scope. A module-level client
 *   would be shared by every test in a Jest worker and by every Fast Refresh, which is how
 *   one test's cache answers another test's query.
 *
 * Retry is not set here: a read that failed is a rule of its own, so the hook that reads it
 * says so (`features/discover/hooks/use-zones.ts`), and a future query can choose otherwise.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * The provider the app root mounts. Tests mount the same component as a `wrapper`, so what a
 * test renders is the composition the device runs — a client per mount, not a stub.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
