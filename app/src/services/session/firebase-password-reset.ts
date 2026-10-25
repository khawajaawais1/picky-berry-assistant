import type { PasswordResetRequest } from './password-reset';

/**
 * The endpoint Firebase's own client SDK uses for a password-reset email: the Identity Toolkit's
 * `accounts:sendOobCode` method with a `PASSWORD_RESET` request. The Web API key is a public
 * project identifier, not a server credential; SECURITY.md and `.env.example` say the same.
 *
 * The app calls it directly rather than installing the Firebase SDK: the request needs one public
 * key and returns no session, so there is no client state for an SDK to keep. The email template
 * and the page where the new password is set live in the Firebase project, not in this app.
 */
const ENDPOINT = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode';

/**
 * The smallest shape this adapter needs from `fetch`, so a test can hand it a recorder and the
 * app can hand it the platform's own implementation without a DOM type leaking through.
 */
export type FirebaseFetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const platformFetch: FirebaseFetch = (url, init) => fetch(url, init);

export type FirebasePasswordResetOptions = {
  /** Firebase's public Web API key, or `null` when the build has none. */
  apiKey: string | null;
  /** Injected by tests; defaults to the platform's `fetch`. */
  fetchImpl?: FirebaseFetch;
};

/** Pull Firebase's `error.message` out of a response without trusting its shape. */
function errorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const error = (body as { error?: unknown }).error;

  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const message = (error as { message?: unknown }).message;

  return typeof message === 'string' ? message : null;
}

/**
 * Builds the real reset request, or `null` when no Firebase project is configured.
 *
 * **Every address gets the same answer where account existence is concerned.** Firebase's
 * `EMAIL_NOT_FOUND` is read as acceptance: the caller sees the same confirmation as a registered
 * address, so the screen cannot be used to learn which addresses have accounts. A refused request
 * (a malformed address, or the provider asking the caller to wait) is `refused`; a provider that
 * cannot answer at all — no key, an invalid key, a 5xx, a network failure — is `unavailable`. The
 * screen draws one failure sentence for both, so the reason never reaches a stranger.
 *
 * Nothing is written anywhere: no address, token, link or new password. The function has no
 * logging and returns only the result value; a `fetch` that rejects becomes `unavailable` rather
 * than an exception the screen would have to catch.
 */
export function createFirebasePasswordResetRequest({
  apiKey,
  fetchImpl = platformFetch,
}: FirebasePasswordResetOptions): PasswordResetRequest | null {
  const key = apiKey?.trim();

  if (!key) {
    return null;
  }

  const url = `${ENDPOINT}?key=${encodeURIComponent(key)}`;

  return async (email) => {
    const address = email.trim();

    if (address === '') {
      // Not a provider refusal: there is no request about nobody. The screen already refuses an
      // empty address, so reaching here is a caller bug and deserves to be loud.
      throw new RangeError('a password reset names an account, and this request named none');
    }

    let response: { ok: boolean; status: number; json: () => Promise<unknown> };

    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: address }),
      });
    } catch {
      return { ok: false, reason: 'unavailable' };
    }

    if (response.ok) {
      return { ok: true };
    }

    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      // A response without a readable body is still a response; the status decides below.
    }

    const code = errorCode(body);

    // Firebase deliberately does not tell a caller whether an address has an account. If a
    // project without enumeration protection answers, the app keeps the same silence.
    if (code === 'EMAIL_NOT_FOUND' || code === 'USER_NOT_FOUND') {
      return { ok: true };
    }

    if (
      code === 'OPERATION_NOT_ALLOWED' ||
      code === 'API_KEY_INVALID' ||
      code === 'INVALID_API_KEY' ||
      response.status === 401 ||
      response.status === 403 ||
      response.status >= 500
    ) {
      return { ok: false, reason: 'unavailable' };
    }

    return { ok: false, reason: 'refused' };
  };
}
