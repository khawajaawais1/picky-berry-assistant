import { failureVerdict, type ApiClient } from '@/services/api/api-client';

import type { PasswordResetRequest } from './password-reset';

/**
 * The reset request through the team API's `POST /auth/password-reset` (ADR-065 decision 4,
 * amended). The service answers `202` whether or not the address has an account, so an accepted
 * request says nothing about who is registered, and nothing is kept here: no address, token or
 * link.
 *
 * - `202` — accepted.
 * - `422`, `429` — refused: the address is malformed, or the caller is asked to wait.
 * - anything else — unavailable, including a `404` from a service that does not have the endpoint
 *   yet, so the screen never reports an accepted request that nothing took.
 */
export function createApiPasswordResetRequest({
  client,
}: {
  client: ApiClient;
}): PasswordResetRequest {
  return async (email) => {
    const address = email.trim();
    if (address === '') {
      throw new RangeError('a password reset names an account, and this request named none');
    }

    const result = await client.request({
      method: 'POST',
      path: '/auth/password-reset',
      body: { email: address },
      auth: false,
      // The service answers `202` with no body.
      expectsBody: false,
      parse: () => true,
    });

    if (result.ok) return { ok: true };

    return {
      ok: false,
      reason: failureVerdict(result.error) === 'refused' ? 'refused' : 'unavailable',
    };
  };
}
