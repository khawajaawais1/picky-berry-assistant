import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, type ReactNode } from 'react';

import type { QueryCachePersistence } from './query-persister';

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
 *
 * **Persistence is optional, and composed by the caller.** The cache a read should survive the
 * process in is the feature's decision — which keys, how old, what may be hydrated — so the
 * app root passes the zone cache's options and this module stays generic
 * (`services/query-persister.ts`). Without them the provider is the plain one, which is what
 * most tests mount: a test that is not about a restart must not inherit one.
 */

export type QueryProviderProps = {
  children: ReactNode;
  /**
   * A cache that outlives the process, built by the feature that owns its data. Passing it is
   * what makes the app open with a previous launch's answer; passing nothing keeps the cache
   * in memory for the mount, as every screen test expects.
   */
  persistOptions?: QueryCachePersistence;
};

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
 * The provider the app root mounts. Tests mount the same component as a `wrapper` — the
 * default without `persistOptions` is the composition every screen test runs, and the tests
 * that exercise a restart pass the same zone options the app does.
 */
export function QueryProvider({ children, persistOptions }: QueryProviderProps) {
  const [client] = useState(createQueryClient);

  if (persistOptions) {
    return (
      <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
        {children}
      </PersistQueryClientProvider>
    );
  }

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
