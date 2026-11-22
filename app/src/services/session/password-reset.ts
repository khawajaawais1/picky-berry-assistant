import type { ConfigResult } from '@/config/env';
import { appConfig } from '@/services/api/app-config';

/**
 * The password-reset vocabulary, shared by the seam, the provider adapters and the screens that
 * ask for a link and replace the password (ADR-062, ADR-065).
 *
 * - `refused` — the provider would not take the request: it rejects the address, or the link's
 *   token is invalid, expired or already used. A request's screen says one sentence for all of
 *   them, because the app must not reveal whether an address has an account.
 * - `unavailable` — nothing here can answer: no provider is configured, the provider rejects our
 *   key, or the network never reached it.
 */
export type PasswordResetRefusal = 'refused' | 'unavailable';

/** The provider took the operation, or did not, with a reason the caller can act on. */
export type PasswordResetResult = { ok: true } | { ok: false; reason: PasswordResetRefusal };

/** One call to the provider: ask it to send the account's reset link, and hold nothing it returns. */
export type PasswordResetRequest = (email: string) => Promise<PasswordResetResult>;

/**
 * One call to the provider: spend the link's token and set the account's new password. The token
 * is single-use, so a replay is `refused`; the app keeps neither the token nor the password.
 */
export type PasswordResetCompletion = (
  token: string,
  password: string,
) => Promise<PasswordResetResult>;

/**
 * What a build can honestly offer a person on the reset screen.
 *
 * - `live` — the service sends the reset email, so the screen may say one is on its way.
 * - `accepted` — the service takes the request but does not send mail yet, so the screen says
 *   the request was accepted and claims no delivery (ADR-048's rule).
 * - `unavailable` — nothing here can take a request, so the action is not offered.
 */
export type PasswordResetAvailability = 'live' | 'accepted' | 'unavailable';

/**
 * The route's answer to "can this build offer a reset?" (ADR-065 decision 4, amended). The team
 * API takes reset requests at `POST /auth/password-reset`, so a build that can reach it offers
 * one. The API's mail is console-only, so the answer is `accepted`, not `live`, until the service
 * sends real email.
 */
export function passwordResetAvailability(
  config: ConfigResult = appConfig(),
): PasswordResetAvailability {
  return config.ok ? 'accepted' : 'unavailable';
}
