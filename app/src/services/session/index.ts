/**
 * The authentication seam (`src/services/session/`): acquire a session, ask for the one being
 * held, drop it, and ask the provider for a password reset — with a stand-in for the account
 * service and a real Firebase adapter for the reset when a project key is configured.
 *
 * Read [ADR-028](../../../docs/adr/ADR-028-an-authentication-seam-behind-a-port.md) for why the
 * seam is a port, [ADR-054](../../../docs/adr/ADR-054-the-account-belongs-to-the-api.md) for the
 * provider and account it will hold, and
 * [ADR-059](../../../docs/adr/ADR-059-email-password-replaces-the-code-screen.md) for the re-cut that
 * retired screen 04's stand-in code. Read this file for what the app is allowed to claim.
 *
 * **What is stored, and the four questions AGENTS.md §11 asks of every stored field.** The field
 * is one session: the account it is about and the window it is good for.
 *
 * - **Who may read it** — this app, on this device, for as long as the process runs. It is held
 *   in memory and written nowhere: not to AsyncStorage, not to a file, not to a log. The stand-in
 *   has no server to send it to, and there will be no session at all in a production build. When
 *   ADR-006's secure adapter lands, this answer becomes “platform secure storage, unlocked device
 *   only”, and the store port is the one place that changes.
 * - **How the user gets a copy** — the signed-in state itself is the copy: `current()` is what
 *   every screen would read, and there is no export because there is no account surface yet
 *   (PROJECT.md, known issue 23). A session carries no content beyond the account's name and two
 *   timestamps.
 * - **How it is corrected** — signing in again replaces it (`signIn`), and signing out removes it
 *   (`signOut`).
 * - **How it is deleted** — `signOut()`, and the process ending, which is the whole of the
 *   in-memory lifetime. Nothing survives a reload to delete later.
 *
 * **The password is not stored here either.** It is handed to the provider adapter in the
 * sign-in call and goes no further: not into the session, the store, a log or this module's
 * state (ADR-054 decision 2; SECURITY.md). Today the stand-in accepts it and verifies nothing.
 *
 * **A reset request is not a stored field.** `requestPasswordReset` carries the address to the
 * provider adapter and asks for the provider's reset link; no token, link or new password comes
 * back to the app, and the address is not written to the store or kept after the call (ADR-054,
 * ADR-062). With `EXPO_PUBLIC_FIREBASE_API_KEY` set, Firebase sends the email; without it, the
 * stand-in sends nothing, which the screen that calls it says out loud.
 *
 * The **lawful basis** for holding it — and for the address that names the account — is the
 * owner's decision and is still open (PROJECT.md, question 15), owed for every field the app
 * keeps. It is recorded here rather than assumed: this module holds personal data (an address)
 * from the moment it is handed one.
 *
 * **The one thing this seam does not decide.** How long a session lasts is the provider's answer
 * and, until the account service exists, a stand-in value (`SESSION_LIFETIME_MS`). It is an open
 * question in PROJECT.md, not a fact about the app.
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

export {
  createStandInSessionPort,
  sessionPort,
  type Credential,
  type SessionPort,
  type SignInRefusal,
  type SignInResult,
  type StandInSessionPortOptions,
} from './stand-in-port';

export {
  passwordResetAvailability,
  type PasswordResetAvailability,
  type PasswordResetRefusal,
  type PasswordResetRequest,
  type PasswordResetResult,
} from './password-reset';
