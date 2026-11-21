/**
 * The authentication seam (`src/services/session/`): acquire a session, ask for the one being
 * held, drop it, and ask for a password reset. The adapter is the team API's (ADR-065): the API
 * checks the password and issues the tokens, `api-port.ts` keeps and rotates them, and
 * `app-port.ts` composes the one port the app uses.
 *
 * Read [ADR-028](../../../docs/adr/ADR-028-an-authentication-seam-behind-a-port.md) for why the
 * seam is a port, [ADR-065](../../../docs/adr/ADR-065-the-api-issues-the-credential.md) for the
 * provider, and [ADR-006](../../../docs/adr/ADR-006-secure-credential-storage.md) for where the
 * tokens live.
 *
 * **What is stored, and the four questions AGENTS.md §11 asks of every stored field.** The field
 * is one session: the account's address and nickname, the access token's window, and the
 * access and refresh tokens.
 *
 * - **Who may read it** — this app, on this device. On iOS and Android it is in platform secure
 *   storage (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). On the web export it is in memory for the tab's
 *   lifetime. It is never written to AsyncStorage, a file, a log or a URL.
 * - **How the user gets a copy** — the account itself is the API's record (`GET /me`, and the
 *   export at `POST /me/export`).
 * - **How it is corrected** — signing in again replaces it, and a refresh rotates it.
 * - **How it is deleted** — `signOut()`, which revokes the refresh token at the API and clears
 *   the store, and a refused refresh, which clears the store.
 *
 * **The password is not stored.** It is in the login or register request body and nowhere else.
 *
 * The **lawful basis** for holding it is the owner's decision and is still open (PROJECT.md,
 * question 15).
 */
export {
  SESSION_LIFETIME_MS,
  isExpired,
  mintSession,
  parseSession,
  remainingMilliseconds,
  type Session,
} from './session';

export { createInMemorySessionStore, type SessionStore } from './store';

export { createSecureSessionStore, SESSION_STORE_KEY } from './secure-store';

export {
  createApiSessionPort,
  parseAuthSession,
  SessionUnreachableError,
  type ApiSessionPort,
  type Registration,
  type RegistrationConsents,
} from './api-port';

export { createAppSessionPort, sessionPort, type AppSessionPortOptions } from './app-port';

export type { Credential, SessionPort, SignInRefusal, SignInResult } from './port';

export {
  passwordResetAvailability,
  type PasswordResetAvailability,
  type PasswordResetRefusal,
  type PasswordResetRequest,
  type PasswordResetResult,
} from './password-reset';
