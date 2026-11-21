import type { ApiClient, ApiFailure } from '@/services/api';

import type { Visit } from '../domain/visit-lifecycle';
import {
  parseVisitPage,
  parseVisitRecord,
  visitSubmission,
  type VisitPage,
  type VisitRecord,
} from '../domain/visit-submission';

/**
 * The team API's visits (ADR-065, the plan's phase 4), through the authenticated transport.
 *
 * `submit` answers what to do next rather than throwing:
 *
 * - `recorded` — the server recorded the visit, accepted or rejected, a replay included;
 * - `skipped` — the visit is not finalized, so nothing was sent;
 * - `retry` — the network, the server's own trouble or an ended session; the same visit can be
 *   sent again later and the server will record it once (`client_id`);
 * - `refused` — the server refused the body (409, 422). Sending it again would be refused again.
 */
export type SubmitOutcome =
  | { kind: 'recorded'; record: VisitRecord }
  | { kind: 'skipped' }
  | { kind: 'retry'; failure: ApiFailure }
  | { kind: 'refused'; failure: ApiFailure };

export class VisitsReadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the visits could not be read (${failure.kind})`);
    this.name = 'VisitsReadError';
  }
}

export type VisitsApi = {
  submit(visit: Visit): Promise<SubmitOutcome>;
  list(): Promise<VisitPage>;
};

/** The newest page is what screen 11 shows; older pages are not drawn yet. */
export const VISIT_PAGE_SIZE = 20;

function retryable(failure: ApiFailure): boolean {
  if (failure.kind !== 'http') return failure.kind !== 'invalid-response';
  return failure.status >= 500 || failure.status === 408 || failure.status === 429;
}

export function createVisitsApi({ client }: { client: ApiClient }): VisitsApi {
  return {
    async submit(visit) {
      const body = visitSubmission(visit);
      if (body === null) return { kind: 'skipped' };

      const result = await client.request({
        method: 'POST',
        path: '/visits',
        body,
        parse: parseVisitRecord,
      });

      if (result.ok) return { kind: 'recorded', record: result.data };
      return retryable(result.error)
        ? { kind: 'retry', failure: result.error }
        : { kind: 'refused', failure: result.error };
    },

    async list() {
      const result = await client.request({
        method: 'GET',
        path: '/visits',
        query: { limit: VISIT_PAGE_SIZE, status: 'accepted' },
        parse: parseVisitPage,
      });

      if (!result.ok) throw new VisitsReadError(result.error);
      return result.data;
    },
  };
}
