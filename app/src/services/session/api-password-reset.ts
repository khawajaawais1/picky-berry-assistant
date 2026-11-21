import { failureVerdict, type ApiClient } from '@/services/api/api-client';

import type { PasswordResetCompletion, PasswordResetRequest } from './password-reset';

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

/**
 * The completion through the team API's `POST /auth/password-reset/confirm`. The token arrived in
 * the reset link; the password is the one the picker chose, and neither is kept here.
 *
 * - `204` — the password was changed. A `204` carries no body, so none is read.
 * - `400`, `422` — refused: the token is invalid, expired or already used, or the body failed the
 *   contract. The screen sends a valid client-side form, so the token is what it reports.
 * - anything else — unavailable, including a `404` from a deploy without the endpoint.
 */
export function createApiPasswordResetCompletion({
  client,
}: {
  client: ApiClient;
}): PasswordResetCompletion {
  return async (token, password) => {
    const resetToken = token.trim();
    if (resetToken === '') {
      throw new RangeError('a password reset names a link, and this one carried no token');
    }
    if (password === '') {
      throw new RangeError('a password reset replaces a password, and none was given');
    }

    const result = await client.request({
      method: 'POST',
      path: '/auth/password-reset/confirm',
      body: { token: resetToken, password },
      auth: false,
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
