/**
 * The transport to the team API (ADR-065 decision 5): the one module that calls `fetch` against
 * it.
 *
 * It owns four things, so that no feature re-implements them:
 *
 * - **the address**: the configured base URL, the `/api/v1` prefix and an absolute path, with
 *   query values encoded. A path that is not absolute is refused, so a caller cannot point the
 *   request at another host.
 * - **the credential**: the access token comes from the `TokenProvider` (the session port), as
 *   a bearer header. A 401 on an authenticated request triggers one refresh and one retry, never
 *   a loop. An unauthenticated request (`auth: false`, e.g. a login) never touches the token.
 * - **the boundary**: every success body goes through the caller's `parse`, which answers `null`
 *   for anything it cannot read. That is an `invalid-response`, never data.
 * - **explicit failure**: nothing here throws for a network or server problem. The caller gets
 *   `{ ok: false, error }` and has to decide what to say. Only a programming error (a bad path)
 *   rejects.
 *
 * It logs nothing: no URL (a query can carry a position), no header, no body (SECURITY.md).
 */

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** The smallest shape this module needs from `fetch`, so a test can hand in a recorder. */
export type ApiFetch = (
  url: string,
  init: { method: ApiMethod; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const platformFetch: ApiFetch = (url, init) => fetch(url, init);

/** Where the bearer credential comes from: the session port's adapter. */
export type TokenProvider = {
  /** The access token to send now, or `null` when there is no session. */
  accessToken(): Promise<string | null>;
  /** Rotates the session after a 401 and answers the new access token, or `null` if it ended. */
  refresh(): Promise<string | null>;
};

export type ApiFailure =
  /** The request never got an answer: offline, DNS, TLS, a timeout. */
  | { kind: 'network' }
  /** The build's API base URL failed validation, so nothing was sent (`app-client.ts`). */
  | { kind: 'unconfigured' }
  /** There is no session to send, or the server refused it and a refresh could not renew it. */
  | { kind: 'unauthenticated' }
  /** The server answered with a refusal. `code` is the envelope's, when it sent one. */
  | { kind: 'http'; status: number; code: string | null; requestId: string | null }
  /** The server said yes with a body the app cannot read. */
  | { kind: 'invalid-response'; status: number };

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; error: ApiFailure };

export type QueryValue = string | number | boolean | undefined;

export type ApiRequest<T> = {
  method: ApiMethod;
  /** Absolute, starting with a single `/`, without the `/api/v1` prefix. */
  path: string;
  query?: Readonly<Record<string, QueryValue>>;
  body?: unknown;
  /** Whether to send the bearer credential. Defaults to `true`: the API's default is secured. */
  auth?: boolean;
  /**
   * A bearer to send as given, instead of asking the `TokenProvider`. There is no refresh and
   * no retry: the session port uses it for the logout of the token it already holds.
   */
  bearer?: string;
  /**
   * Whether the success answer carries a body. `false` for an endpoint that answers with none,
   * such as a `202` from a void handler: the transport then reads nothing and hands `parse` `null`,
   * as it does for every `204`. Defaults to `true`.
   */
  expectsBody?: boolean;
  /** Validates the success body (`null` for an empty one). Answers `null` when it cannot read it. */
  parse: (body: unknown) => T | null;
};

export type ApiClient = {
  request<T>(request: ApiRequest<T>): Promise<ApiResult<T>>;
};

export type ApiClientOptions = {
  /** The normalised API origin from `src/config/env.ts`. */
  baseUrl: string;
  fetchImpl?: ApiFetch;
  tokens?: TokenProvider;
};

export const API_PREFIX = '/api/v1';

const nothing = async () => null;

const NO_SESSION: TokenProvider = { accessToken: nothing, refresh: nothing };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function queryString(query: Readonly<Record<string, QueryValue>> | undefined): string {
  if (!query) return '';

  const pairs = Object.entries(query)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return pairs.length === 0 ? '' : `?${pairs.join('&')}`;
}

/** Reads `{ error: { code }, request_id }` without trusting its shape. */
function envelope(body: unknown): { code: string | null; requestId: string | null } {
  if (!isRecord(body)) return { code: null, requestId: null };

  const code = isRecord(body.error) && typeof body.error.code === 'string' ? body.error.code : null;
  const requestId = typeof body.request_id === 'string' ? body.request_id : null;

  return { code, requestId };
}

async function readBody(response: {
  json: () => Promise<unknown>;
}): Promise<{ readable: true; body: unknown } | { readable: false }> {
  try {
    return { readable: true, body: await response.json() };
  } catch {
    // A body that is not JSON is not swallowed: the caller turns it into an explicit failure.
    return { readable: false };
  }
}

export function createApiClient({
  baseUrl,
  fetchImpl = platformFetch,
  tokens = NO_SESSION,
}: ApiClientOptions): ApiClient {
  const root = `${baseUrl.replace(/\/+$/, '')}${API_PREFIX}`;

  async function send<T>(
    request: ApiRequest<T>,
    token: string | null,
  ): Promise<ApiResponse | null> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token !== null) headers.Authorization = `Bearer ${token}`;

    const init: Parameters<ApiFetch>[1] = { method: request.method, headers };
    if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(request.body);
    }

    try {
      return await fetchImpl(`${root}${request.path}${queryString(request.query)}`, init);
    } catch {
      return null;
    }
  }

  return {
    async request<T>(request: ApiRequest<T>): Promise<ApiResult<T>> {
      if (!request.path.startsWith('/') || request.path.startsWith('//')) {
        throw new RangeError('an API path is absolute and names no host');
      }

      if (request.bearer !== undefined) {
        return settle(request, await send(request, request.bearer));
      }

      const authenticated = request.auth !== false;
      let token: string | null = null;

      if (authenticated) {
        token = await tokens.accessToken();
        if (token === null) return { ok: false, error: { kind: 'unauthenticated' } };
      }

      let response = await send(request, token);
      if (response === null) return { ok: false, error: { kind: 'network' } };

      if (authenticated && response.status === 401) {
        const renewed = await tokens.refresh();
        if (renewed === null) return { ok: false, error: { kind: 'unauthenticated' } };

        response = await send(request, renewed);
        if (response === null) return { ok: false, error: { kind: 'network' } };
        if (response.status === 401) return { ok: false, error: { kind: 'unauthenticated' } };
      }

      return settle(request, response);
    },
  };
}

type ApiResponse = Awaited<ReturnType<ApiFetch>>;

async function settle<T>(
  request: ApiRequest<T>,
  response: ApiResponse | null,
): Promise<ApiResult<T>> {
  if (response === null) return { ok: false, error: { kind: 'network' } };

  if (!response.ok) {
    const read = await readBody(response);
    const { code, requestId } = envelope(read.readable ? read.body : null);
    return { ok: false, error: { kind: 'http', status: response.status, code, requestId } };
  }

  let body: unknown = null;
  if (response.status !== 204 && request.expectsBody !== false) {
    const read = await readBody(response);
    if (!read.readable) {
      return { ok: false, error: { kind: 'invalid-response', status: response.status } };
    }
    body = read.body;
  }

  const data = request.parse(body);
  if (data === null) {
    return { ok: false, error: { kind: 'invalid-response', status: response.status } };
  }

  return { ok: true, status: response.status, data };
}
