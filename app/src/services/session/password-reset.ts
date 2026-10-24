import { appEnvironment, firebaseApiKey, type PublicEnvSource } from '@/config/env';

/**
 * The password-reset request's vocabulary, shared by the seam, the provider adapter and the
 * screen that asks for a link (ADR-062).
 *
 * - `refused` — the provider would not take the request: it rejects the address, or it is asking
 *   the caller to wait. The screen says one sentence for all of them, because the app must not
 *   reveal whether an address has an account.
 * - `unavailable` — nothing here can answer: no provider is configured, the provider rejects our
 *   key, or the network never reached it.
 */
export type PasswordResetRefusal = 'refused' | 'unavailable';

/** The provider took the address, or did not, with a reason the caller can act on. */
export type PasswordResetResult = { ok: true } | { ok: false; reason: PasswordResetRefusal };

/** One call to the provider: ask it to send the account's reset link, and hold nothing it returns. */
export type PasswordResetRequest = (email: string) => Promise<PasswordResetResult>;

/**
 * What a build can honestly offer a person on the reset screen.
 *
 * - `live` — a Firebase project is configured, so a request can send a real email.
 * - `test` — no provider is configured outside production. The stand-in accepts the request so
 *   the journey can be walked, sends nothing, and the screen says so.
 * - `unavailable` — no provider is configured in a shipped build, so the action is not offered.
 */
export type PasswordResetAvailability = 'live' | 'test' | 'unavailable';

/**
 * Decides which of the three states this build is in. It is the route's answer, so the screen
 * itself never has to ask what environment it is in: the route either supplies a handler or does
 * not, and says whether the provider is live.
 */
export function passwordResetAvailability(source?: PublicEnvSource): PasswordResetAvailability {
  if (firebaseApiKey(source) !== null) {
    return 'live';
  }

  return appEnvironment(source) === 'production' ? 'unavailable' : 'test';
}
