import { failureVerdict, type ApiClient, type ApiFailure } from '@/services/api';

import type { Visit } from '../domain/visit-lifecycle';
import {
  parseVisitPage,
  parseVisitRecord,
  visitSubmission,
  type VisitPage,
  type VisitRecord,
  type VisitSubmission,
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
  /** Posts a submission as it was kept, e.g. from the outbox (ADR-066). */
  send(payload: VisitSubmission): Promise<Exclude<SubmitOutcome, { kind: 'skipped' }>>;
  list(): Promise<VisitPage>;
};

/** The newest page is what screen 11 shows; older pages are not drawn yet. */
export const VISIT_PAGE_SIZE = 20;

/**
 * Whether the visit stays in the outbox. Only a refusal drops it, and an unreadable success, which
 * the server has recorded. Everything else keeps it: a deploy without the route, or a build with
 * no API, has not read the visit, and dropping it would lose the picker's record.
 */
function retryable(failure: ApiFailure): boolean {
  return failure.kind !== 'invalid-response' && failureVerdict(failure) !== 'refused';
}

export function createVisitsApi({ client }: { client: ApiClient }): VisitsApi {
  async function send(body: VisitSubmission): Promise<Exclude<SubmitOutcome, { kind: 'skipped' }>> {
    const result = await client.request({
      method: 'POST',
      path: '/visits',
      body,
      idempotencyKey: body.client_id,
      parse: parseVisitRecord,
    });

    if (result.ok) return { kind: 'recorded', record: result.data };
    return retryable(result.error)
      ? { kind: 'retry', failure: result.error }
      : { kind: 'refused', failure: result.error };
  }

  return {
    async submit(visit) {
      const body = visitSubmission(visit);
      return body === null ? { kind: 'skipped' } : send(body);
    },

    send,

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
