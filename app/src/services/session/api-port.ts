import {
  failureVerdict,
  type ApiClient,
  type ApiResult,
  type TokenProvider,
} from '@/services/api/api-client';

import type { PasswordResetCompletion, PasswordResetRequest } from './password-reset';
import { parseSession, type Session } from './session';
import type { Credential, SessionPort, SignInResult } from './port';
import type { SessionStore } from './store';

/**
 * The session port's API adapter (ADR-065). The team API checks the password and issues a JWT
 * access token and a rotating refresh token. This port keeps the pair in the store (secure
 * storage in the app, ADR-006) and rotates it.
 *
 * - **The password is passed through, never kept.** It is in one request body and nowhere else.
 * - **`Session` stays the screens' shape.** `accountId` is the account's address, as the
 *   stand-in had it. `displayName` is the API's `nickname`. `expiresAt` is the access token's
 *   expiry: the credential's truth, not a lifetime of the app's own.
 * - **Refresh is single-flight.** The server revokes the whole token family when a refresh token
 *   is reused, so concurrent callers share one `/auth/refresh` rather than racing two.
 * - **Offline is not signed out.** A refresh that cannot reach the server keeps the stored pair
 *   and `current()` answers the session the device already holds, so a picker who opens the app
 *   without a signal stays signed in (the refresh token is still valid; only the access token
 *   is stale). A refresh the server refuses drops the session (ADR-006: cleared on a refresh
 *   failure).
 */

/** Refresh this long before expiry, so the app never sends a token the server is about to refuse. */
export const REFRESH_MARGIN_MS = 30_000;

export type RegistrationConsents = {
  terms_version?: string;
  privacy_policy_version?: string;
  background_location?: boolean;
};

/** What `POST /auth/register` takes: a credential plus the account's language and consents. */
export type Registration = Credential & {
  lang: 'fi' | 'en';
  consents: RegistrationConsents;
};

export type ApiSessionPort = SessionPort & {
  register(registration: Registration): Promise<SignInResult>;
  /** What the transport authenticates every other request with. */
  tokens: TokenProvider;
};

export type ApiSessionPortOptions = {
  /** A transport without a token provider: every call here is unauthenticated or explicit. */
  client: ApiClient;
  store: SessionStore;
  now?: () => Date;
  /** The reset request's provider, when one is composed. */
  passwordReset?: PasswordResetRequest;
  /** The other half of a reset: spending the emailed link's token on a new password. */
  passwordResetComplete?: PasswordResetCompletion;
};

type Held = { session: Session; accessToken: string; refreshToken: string };

type Issued = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  email: string;
  nickname: string | null;
};

/** The server could not be asked. The held session is kept. */
export class SessionUnreachableError extends Error {
  constructor() {
    super('the account service could not be reached');
    this.name = 'SessionUnreachableError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** Validates `AuthSession` at the boundary. Anything else is not a session. */
export function parseAuthSession(body: unknown): Issued | null {
  if (!isRecord(body) || !isRecord(body.user)) return null;

  const { access_token, refresh_token, token_type, expires_in } = body;
  const { email, nickname } = body.user;

  if (!nonEmpty(access_token) || !nonEmpty(refresh_token) || token_type !== 'Bearer') return null;
  if (typeof expires_in !== 'number' || !Number.isInteger(expires_in) || expires_in < 1) {
    return null;
  }
  if (!nonEmpty(email)) return null;
  if (nickname !== null && typeof nickname !== 'string') return null;

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresInSeconds: expires_in,
    email: email.trim(),
    nickname: nickname === null || nickname.trim() === '' ? null : nickname,
  };
}

function parseHeld(raw: string | null): Held | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // An unreadable value is no session, never an account (the rule `parseSession` follows).
    return null;
  }

  if (!isRecord(parsed) || parsed.v !== 1) return null;
  if (!nonEmpty(parsed.accessToken) || !nonEmpty(parsed.refreshToken)) return null;

  const session = parseSession(JSON.stringify(parsed.session));
  if (session === null) return null;

  return { session, accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
}

function refusal(result: ApiResult<unknown>): SignInResult {
  if (result.ok) throw new Error('a successful result is not a refusal');

  // Only the server saying no is a refusal: a throttled or missing endpoint is not, so a rate-limited
  // refresh keeps the session rather than signing the picker out.
  return {
    ok: false,
    reason: failureVerdict(result.error) === 'refused' ? 'refused' : 'unavailable',
  };
}

export function createApiSessionPort({
  client,
  store,
  now = () => new Date(),
  passwordReset,
  passwordResetComplete,
}: ApiSessionPortOptions): ApiSessionPort {
  let refreshing: Promise<Held | null> | null = null;

  async function keep(issued: Issued): Promise<Held> {
    const issuedAt = now();
    const held: Held = {
      session: {
        accountId: issued.email,
        displayName: issued.nickname,
        issuedAt: issuedAt.toISOString(),
        expiresAt: new Date(issuedAt.getTime() + issued.expiresInSeconds * 1000).toISOString(),
      },
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
    };

    // Rejecting here is the point: a session the store would not keep is not one the app has.
    await store.write(JSON.stringify({ v: 1, ...held }));
    return held;
  }

  async function exchange(path: '/auth/login' | '/auth/register', body: object) {
    const result = await client.request({
      method: 'POST',
      path,
      body,
      auth: false,
      parse: parseAuthSession,
    });

    if (!result.ok) return refusal(result);

    const held = await keep(result.data);
    return { ok: true, session: held.session } as const;
  }

  async function read(): Promise<Held | null> {
    const held = parseHeld(await store.read());
    if (held === null) await store.clear();
    return held;
  }

  /** One rotation at a time. Resolves `null` when the server refused, rejects when unreachable. */
  function rotate(held: Held): Promise<Held | null> {
    refreshing ??= (async () => {
      const result = await client.request({
        method: 'POST',
        path: '/auth/refresh',
        body: { refresh_token: held.refreshToken },
        auth: false,
        parse: parseAuthSession,
      });

      if (result.ok) return keep(result.data);

      const answer = refusal(result);
      if (!answer.ok && answer.reason === 'refused') {
        await store.clear();
        return null;
      }

      throw new SessionUnreachableError();
    })().finally(() => {
      refreshing = null;
    });

    return refreshing;
  }

  function stale(held: Held): boolean {
    return Date.parse(held.session.expiresAt) - REFRESH_MARGIN_MS <= now().getTime();
  }

  /** The held pair, rotated first if its access token is (nearly) expired. */
  async function fresh(): Promise<Held | null> {
    const held = await read();
    if (held === null) return null;
    return stale(held) ? rotate(held) : held;
  }

  function requireAccount(email: string, password: string) {
    if (email.trim() === '') {
      throw new RangeError('a session is about an account, and this credential named none');
    }
    if (password === '') {
      throw new RangeError('a password was offered, and it was empty');
    }
  }

  return {
    async signIn({ email, password }) {
      requireAccount(email, password);
      return exchange('/auth/login', { email: email.trim(), password });
    },

    async register({ email, password, displayName, lang, consents }) {
      requireAccount(email, password);
      const nickname = displayName?.trim();

      return exchange('/auth/register', {
        email: email.trim(),
        password,
        ...(nickname ? { nickname } : {}),
        lang,
        consents,
      });
    },

    async current() {
      try {
        return (await fresh())?.session ?? null;
      } catch (error) {
        if (!(error instanceof SessionUnreachableError)) throw error;

        // The refresh could not be asked, so the device still holds a session it has not been
        // told to drop: the refresh token outlives the access token, and the app's other reads
        // already send the stale token while offline (`tokens.accessToken`). Answering the held
        // session here is what keeps a cold start without a signal from looking like a sign-out.
        return (await read())?.session ?? null;
      }
    },

    async signOut() {
      const held = await read();

      if (held !== null) {
        // The answer is deliberately not inspected. Signing out must succeed on the device even
        // when the server cannot be told, and an unrevoked refresh token still expires there.
        await client.request({
          method: 'POST',
          path: '/auth/logout',
          body: { refresh_token: held.refreshToken },
          bearer: held.accessToken,
          parse: () => true,
        });
      }

      await store.clear();
    },

    async requestPasswordReset(email) {
      if (email.trim() === '') {
        throw new RangeError('a password reset names an account, and this request named none');
      }

      return passwordReset ? passwordReset(email.trim()) : { ok: false, reason: 'unavailable' };
    },

    async completePasswordReset(token, password) {
      return passwordResetComplete
        ? passwordResetComplete(token, password)
        : { ok: false, reason: 'unavailable' };
    },

    tokens: {
      async accessToken() {
        try {
          return (await fresh())?.accessToken ?? null;
        } catch (error) {
          if (!(error instanceof SessionUnreachableError)) throw error;
          // Offline: send the stale token, so the transport reports `network`, the true reason,
          // rather than `unauthenticated`.
          return (await read())?.accessToken ?? null;
        }
      },

      async refresh() {
        const held = await read();
        if (held === null) return null;

        try {
          return (await rotate(held))?.accessToken ?? null;
        } catch (error) {
          if (!(error instanceof SessionUnreachableError)) throw error;
          return null;
        }
      },
    },
  };
}
