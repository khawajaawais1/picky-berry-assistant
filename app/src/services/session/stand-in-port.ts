import { appEnvironment, type AppEnvironment } from '@/config/env';

import { isExpired, mintSession, parseSession, type Session } from './session';
import { createInMemorySessionStore, type SessionStore } from './store';

/**
 * The authentication seam: one port the app acquires, holds and drops a session through, and asks
 * for a password reset through, with a stand-in provider behind it until the account service
 * exists.
 *
 * Why it exists: the account belongs to the team's API and Firebase issues the credential
 * (ADR-054, which answers PROJECT.md's old question 12). Every screen that needs a signed-in user
 * would otherwise wait for that service. With a port, the answer changes the **provider** and
 * nothing else: the create-account screen, the sign-in screen, the reset request, the app shell
 * and the profile screen are written against `signIn`, `current`, `signOut` and
 * `requestPasswordReset`, and cannot tell which implementation is behind them.
 *
 * What this is not: an authorisation layer. A session says who the user is; **nothing here grants
 * privilege**, and the client is untrusted at all times (SECURITY.md §3–4). When the real
 * provider arrives, everything this module answers remains the client's own understanding; the
 * server still decides what a caller may see and do.
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
 *   (ADR-054 §8, and the stand-in below).
 */
export type SignInRefusal = 'refused' | 'unavailable';

/** A credential was exchanged for a session, or refused with a reason the caller can act on. */
export type SignInResult = { ok: true; session: Session } | { ok: false; reason: SignInRefusal };

/**
 * Why a reset request was not accepted.
 *
 * - `refused` — the provider would not take it: too many attempts, an address it rejects, or a
 *   service that is temporarily unable to answer. The screen says one sentence for all of them,
 *   because the app must not tell a stranger whether the address has an account.
 * - `unavailable` — nothing here can answer the request at all. A production build is the case
 *   that matters: there is no sign-in service to ask, so no reset link is requested there
 *   (ADR-054 §8, ADR-062).
 */
export type PasswordResetRefusal = 'refused' | 'unavailable';

/**
 * The provider accepted the reset request for an address — or did not, with a reason.
 *
 * `ok` says the provider took the address, not that an email arrived and not that an account
 * exists. The provider answers every address the same way for exactly that reason, and the
 * screen repeats the condition in its words rather than turning a request into an oracle.
 */
export type PasswordResetResult = { ok: true } | { ok: false; reason: PasswordResetRefusal };

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

export type StandInSessionPortOptions = {
  /**
   * The environment this build was made for, which decides whether any credential can be
   * accepted at all. Read from `src/config/env.ts`, the one module allowed to read
   * `EXPO_PUBLIC_*`, and passable so a test can state which build it is testing.
   */
  environment?: AppEnvironment;
  /** The clock. Injected so expiry is a test rather than a wait. */
  now?: () => Date;
  /** Where the session is kept. Defaults to the in-memory store. */
  store?: SessionStore;
};

/**
 * The stand-in provider: it issues a session for any credential the form accepted, and refuses
 * every credential in a production build.
 *
 * **It cannot check a password, and does not pretend to.** A password is verified by the
 * provider that issued it, and no provider is wired yet; asking a client-side stand-in to “check”
 * one would be a door made of a comparison. So outside a production build any non-empty password
 * is accepted — exactly as the flow's own form rule gated it — and **nothing is verified**. What
 * that buys is the rest of the app being buildable and walkable; what it costs is that a session
 * it issues is worth exactly as much as the stand-in behind it, which is to say nothing outside
 * this repository.
 *
 * It is built so it cannot be mistaken for a real check: it answers nothing at all in a
 * production build, it keeps the session in memory rather than on disk, it stores no password,
 * and it talks to no server. What it *does* hold is the port's contract, so a real provider is a
 * swap rather than a rewrite. ADR-059 records why screen 04's code stand-in was retired rather
 * than kept beside it.
 */
export function createStandInSessionPort(options: StandInSessionPortOptions = {}): SessionPort {
  const environment = options.environment ?? appEnvironment();
  const now = options.now ?? (() => new Date());
  const store = options.store ?? createInMemorySessionStore();

  return {
    async signIn({ email, password, displayName }) {
      const accountId = email.trim();
      // Absent is the sign-in journey, and `null` is how the session records that the app has no
      // name for the account; blank is a caller that meant to pass one (ADR-038).
      const name = displayName === undefined ? null : displayName.trim();

      if (accountId === '') {
        // Not a refusal: nothing was offered to refuse. There is no credential about nobody.
        throw new RangeError('a session is about an account, and this credential named none');
      }

      if (name === '') {
        // A programming error rather than a refusal: the caller passed a name and it was empty,
        // which is a bug in the caller rather than an account the service cannot name.
        throw new RangeError('a name was offered for the account, and it was blank');
      }

      if (password === '') {
        // Also a programming error: the screens refuse an empty password before a press, so a
        // caller that got here with one has skipped its own rule.
        throw new RangeError('a password was offered, and it was empty');
      }

      if (environment === 'production') {
        return { ok: false, reason: 'unavailable' };
      }

      const session = mintSession(accountId, name, now());
      // Rejecting here is the point: the caller is about to act as this user, and a session that
      // was not kept is not one the app may believe it has.
      await store.write(JSON.stringify(session));

      return { ok: true, session };
    },

    async current() {
      const stored = await store.read();

      if (stored === null) {
        return null;
      }

      const session = parseSession(stored);

      // Unreadable, or past its expiry: either way the app is not signed in, and either way what
      // was stored is dropped rather than asked about again on the next read. A credential the
      // app may no longer use is not one it may keep (ADR-006: cleared on sign-out, on expiry and
      // on a refresh failure, which is the same rule).
      if (session === null || isExpired(session, now())) {
        await store.clear();
        return null;
      }

      return session;
    },

    async signOut() {
      await store.clear();
    },

    async requestPasswordReset(email) {
      const address = email.trim();

      if (address === '') {
        // Not a refusal: nothing was offered to refuse. There is no reset about nobody.
        throw new RangeError('a password reset names an account, and this request named none');
      }

      if (environment === 'production') {
        // No provider is connected, so a shipped build cannot ask for a link (ADR-054 §8).
        return { ok: false, reason: 'unavailable' };
      }

      // The stand-in has no provider to ask and no mailbox to reach. It accepts the request so
      // the screen's next step can be walked; it sends nothing, stores nothing, and the screen's
      // own test-build note says so rather than the request pretending a message is on its way.
      return { ok: true };
    },
  };
}

/**
 * The port the app itself uses — the create-account flow, the sign-in screen and the reset request
 * today, the app shell's session check as it is built.
 *
 * One instance, because a session is one thing: two ports over two stores would be two answers to
 * “is the user signed in?”. Its lifetime is the process's, which is what the in-memory store
 * means; when the secure adapter lands this becomes the place that reads it.
 */
export const sessionPort: SessionPort = createStandInSessionPort();
