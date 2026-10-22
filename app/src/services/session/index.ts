/**
 * The authentication seam (`src/services/session/`): acquire a session, ask for the one being
 * held, drop it — with a stand-in provider behind the port until the account service exists.
 *
 * Read [ADR-028](../../../docs/adr/ADR-028-an-authentication-seam-behind-a-port.md) for why the
 * seam is a port, and [ADR-027](../../../docs/adr/ADR-027-a-stand-in-verification-code.md) for
 * the stand-in it is behind today. Read this file for what the app is allowed to claim.
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
 * The **lawful basis** for holding it — and for the identifier that names the account — is the
 * owner's decision and is still open (PROJECT.md, question 15), owed for every field the app
 * keeps. It is recorded here rather than assumed: this module holds personal data (an address or
 * a phone number) from the moment it is handed one.
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

export { STUB_CODE, verifyCode, type CodeVerdict } from './stand-in-code';

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
