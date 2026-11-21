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
 * - `live` — a provider can send a real reset email.
 * - `test` — a test build walks the journey and sends nothing, and the screen says so.
 * - `unavailable` — nothing can send a reset, so the action is not offered.
 */
export type PasswordResetAvailability = 'live' | 'test' | 'unavailable';

/**
 * The route's answer to "can this build offer a reset?". Accounts live in the team API
 * (ADR-065), which has no reset endpoint yet, so every build answers `unavailable`. Firebase holds
 * none of these accounts, so its key no longer makes a reset possible. When the API gains an
 * endpoint, this answers `live` and the session port's `requestPasswordReset` calls it.
 */
export function passwordResetAvailability(): PasswordResetAvailability {
  return 'unavailable';
}
