import type { PasswordResetResult } from './password-reset';
import type { Session } from './session';

/**
 * The authentication seam (ADR-028): one port the app acquires, holds and drops a session through,
 * and asks for a password reset through. Its adapter is the team API's (`api-port.ts`, ADR-065),
 * composed in `app-port.ts`. Screens are written against these types and cannot tell which
 * implementation is behind them.
 *
 * What this is not: an authorisation layer. A session says who the user is; **nothing here grants
 * privilege**, and the server decides what a caller may see and do (SECURITY.md §3–4).
 */

/**
 * What a caller offers in exchange for a session: the address the account is reached by, its
 * password, and — at sign-up — the name the account is being created under.
 *
 * **The password is passed through, never kept.** It goes to the provider that issues the
 * credential and is not stored, hashed, logged or put in a session (ADR-054 decisions 2 and 6;
 * SECURITY.md). The port asks for it in one shape so the provider adapter is a swap.
 *
 * The name is not a credential — it proves nothing — but it is part of what the session has to
 * carry, and the sign-up is where a new account gets it (ADR-029). A real provider takes the same
 * value at sign-up and keeps it as the profile's display name.
 *
 * **A credential that names no name omits it**, which is the sign-in journey: nothing was
 * collected to send, and the account's own name is the provider's answer rather than the caller's
 * to supply (ADR-038). Absent and blank are therefore different things, and the port treats them
 * differently: a blank name is what a caller that *meant* to pass one produces, and it is refused,
 * while an absent one is a returning account whose name the session records as unknown.
 */
export type Credential = {
  /** The email address the account is reached by, as typed on screen 03 or the sign-in screen. */
  email: string;
  /** The account's password, handed to the provider. Never stored. */
  password: string;
  /**
   * The name screen 03 collected for the account, as typed — or omitted by a sign-in, where
   * nothing collected one and the service owns the answer.
   */
  displayName?: string;
};

/**
 * Why a credential was not exchanged for a session.
 *
 * - `refused` — nothing accepted it. With a real provider it is the server's answer, and the app
 *   is careful not to distinguish “wrong password” from “no such account” when the API says so
 *   (PROJECT.md's open question 11 covers the design's missing error treatment).
 * - `unavailable` — nothing here can answer the question at all. A production build is the case
 *   that matters: there is no account service to ask, so no credential is accepted there
 *   (an unusable configuration, `app-port.ts`).
 */
export type SignInRefusal = 'refused' | 'unavailable';

/** A credential was exchanged for a session, or refused with a reason the caller can act on. */
export type SignInResult = { ok: true; session: Session } | { ok: false; reason: SignInRefusal };

/**
 * The port. Four operations: acquire a session, ask for the one being held, drop it, and ask the
 * provider for a password reset.
 *
 * The reset request is not a session operation in the sense the other three are — it holds
 * nothing and signs nobody in — but it belongs to the same provider and the same adapter, so it
 * lives on the same seam rather than inventing a second one (ADR-062, extending ADR-028).
 *
 * Both failures a caller must not miss are **explicit rather than thrown**: a refused credential
 * or reset request resolves to `{ ok: false }`, so a screen has to decide what to say about it.
 * The things that *do* reject are the ones a caller cannot do anything about — a credential or
 * reset request naming no account at all (a programming error) and a store that would not keep
 * the session (a session the app does not have must not be reported as one).
 */
export type SessionPort = {
  signIn(credential: Credential): Promise<SignInResult>;
  /** The session being held, or `null` — including when the one being held has expired. */
  current(): Promise<Session | null>;
  signOut(): Promise<void>;
  /**
   * Asks the provider to send the account's reset link to `email`, and holds nothing it returns:
   * no token, no address, no session. Every address gets the same outcome so the screen cannot
   * reveal which ones have accounts.
   */
  requestPasswordReset(email: string): Promise<PasswordResetResult>;
};
