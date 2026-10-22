import { appEnvironment, type AppEnvironment } from '@/config/env';

import { isExpired, mintSession, parseSession, type Session } from './session';
import { verifyCode } from './stand-in-code';
import { createInMemorySessionStore, type SessionStore } from './store';

/**
 * The authentication seam: one port the app acquires, holds and drops a session through, with a
 * stand-in provider behind it until the account service exists.
 *
 * Why it exists: ADR-013 decides Firebase Authentication and PROJECT.md's open question 12 is
 * still open on whether the app talks to Firebase directly or through our own backend. Every
 * screen that needs a signed-in user would otherwise wait for that answer. With a port, the
 * answer changes the **provider** and nothing else: the sign-in screen, the app shell and the
 * profile screen are written against `signIn`, `current` and `signOut` and cannot tell which
 * implementation is behind them.
 *
 * What this is not: an authorisation layer. A session says who the user is; **nothing here
 * grants privilege**, and the client is untrusted at all times (SECURITY.md §3–4). When the real
 * provider arrives, everything this module answers remains the client's own understanding; the
 * server still decides what a caller may see and do.
 */

/**
 * What a caller offers in exchange for a session: who it is about, the code they were sent, and —
 * at sign-up — the name the account is being created under.
 *
 * The name is not a credential — it proves nothing — but it is part of what the session has to
 * carry, and the sign-up is where a new account gets it (ADR-029). A real provider takes the
 * same value at sign-up and keeps it as the profile's display name.
 *
 * **A credential that names no account omits it**, which is the sign-in journey: nothing was
 * collected to send, and the account's own name is the provider's answer rather than the
 * caller's to supply (ADR-038). Absent and blank are therefore different things, and the port
 * treats them differently: a blank name is what a caller that *meant* to pass one produces, and
 * it is refused, while an absent one is a returning account whose name the session records as
 * unknown.
 */
export type Credential = {
  /** The email address or phone number the code belongs to, as typed on screen 03. */
  identifier: string;
  /**
   * The name screen 03 collected for the account, as typed — or omitted by a sign-in, where
   * nothing collected one and the service owns the answer.
   */
  displayName?: string;
  /** The six digits the user enters on screen 04. */
  code: string;
};

/**
 * Why a credential was not exchanged for a session.
 *
 * - `refused` — nothing accepted it. With the stand-in that means the code is not one this app
 *   can accept outside a production build; with a real provider it is the server's answer, and
 *   the app is careful not to distinguish “wrong code” from “no such account” when the API says
 *   so (PROJECT.md's open question 11 covers the design's missing error treatment).
 * - `unavailable` — nothing here can answer the question at all. A production build is the case
 *   that matters: there is no account service to ask, so no credential is accepted there,
 *   including the stand-in one (ADR-027).
 */
export type SignInRefusal = 'refused' | 'unavailable';

/** A credential was exchanged for a session, or refused with a reason the caller can act on. */
export type SignInResult = { ok: true; session: Session } | { ok: false; reason: SignInRefusal };

/**
 * The port. Three operations, because they are the three things the app does with a session:
 * acquire one, ask for the one it is holding, and drop it.
 *
 * Both failures a caller must not miss are **explicit rather than thrown**: a refused credential
 * resolves to `{ ok: false }`, so a screen has to decide what to say about it. The two things
 * that *do* reject are the two a caller cannot do anything about — a credential naming no
 * account at all (a programming error) and a store that would not keep the session (a session
 * the app does not have must not be reported as one).
 */
export type SessionPort = {
  signIn(credential: Credential): Promise<SignInResult>;
  /** The session being held, or `null` — including when the one being held has expired. */
  current(): Promise<Session | null>;
  signOut(): Promise<void>;
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
 * The stand-in provider: it issues a session about whoever offers the stand-in code, and refuses
 * everyone else.
 *
 * It is the smallest thing that lets the rest of the app be built, and it is built so that it
 * cannot be mistaken for a real check: it answers only the one code, it answers nothing at all in
 * a production build, it keeps the session in memory rather than on disk, and it talks to no
 * server — so a session it issues is worth exactly as much as the stand-in code behind it, which
 * is to say nothing outside this repository. What it *does* hold is the port's contract, so a
 * real provider is a swap rather than a rewrite.
 */
export function createStandInSessionPort(options: StandInSessionPortOptions = {}): SessionPort {
  const environment = options.environment ?? appEnvironment();
  const now = options.now ?? (() => new Date());
  const store = options.store ?? createInMemorySessionStore();

  return {
    async signIn({ code, displayName, identifier }) {
      const accountId = identifier.trim();
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

      if (verifyCode(code, environment) === 'rejected') {
        return {
          ok: false,
          reason: environment === 'production' ? 'unavailable' : 'refused',
        };
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
  };
}

/**
 * The port the app itself uses — the sign-up flow today, the sign-in screen and the app shell's
 * session check as they are built.
 *
 * One instance, because a session is one thing: two ports over two stores would be two answers to
 * “is the user signed in?”. Its lifetime is the process's, which is what the in-memory store
 * means; when the secure adapter lands this becomes the place that reads it.
 */
export const sessionPort: SessionPort = createStandInSessionPort();
