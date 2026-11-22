export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
).replace(/\/+$/, '');

export interface SessionUser {
  id: string;
  email: string;
  nickname: string | null;
  role: 'picker' | 'buyer' | 'admin';
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SessionUser;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: SessionUser;
}

interface ProblemBody {
  error?: { code?: string; message?: string; details?: unknown };
  request_id?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null = null,
    details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

const STORAGE_KEY = 'picky.admin.session.v1';
const REFRESH_AHEAD_MS = 30_000;

function fallbackCode(status: number): string {
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  return status >= 500 ? 'INTERNAL' : 'REQUEST_FAILED';
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const user = candidate.user as Record<string, unknown> | undefined;
  return (
    typeof candidate.access_token === 'string' &&
    typeof candidate.refresh_token === 'string' &&
    typeof candidate.expires_at === 'number' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    user.role === 'admin'
  );
}

function readStoredSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistSession(session: Session | null): void {
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // A browser that refuses sessionStorage still works in memory for this tab.
  }
}

let currentSession: Session | null = readStoredSession();
let refreshPromise: Promise<Session> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot(): Session | null {
  return currentSession;
}

export function updateSession(session: Session | null): void {
  currentSession = session;
  persistSession(session);
  emit();
}

function toSession(response: LoginResponse): Session {
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: Date.now() + response.expires_in * 1000,
    user: response.user,
  };
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ProblemBody | null = null;
  try {
    body = (await response.json()) as ProblemBody;
  } catch {
    body = null;
  }
  const fallback =
    response.statusText.trim() ||
    `Request failed with status ${response.status}`;
  return new ApiError(
    response.status,
    body?.error?.code ?? fallbackCode(response.status),
    body?.error?.message ?? fallback,
    body?.request_id ?? response.headers.get('x-request-id'),
    body?.error?.details ?? null,
  );
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function send(
  path: string,
  method: string,
  body: unknown,
  token: string | null | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${normalizePath(path)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function refreshSession(): Promise<Session> {
  const session = currentSession;
  if (!session) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Your session has ended.');
  }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await send('/auth/refresh', 'POST', {
        refresh_token: session.refresh_token,
      }, null);
      if (!response.ok) {
        updateSession(null);
        throw await toApiError(response);
      }
      const next = toSession((await response.json()) as LoginResponse);
      updateSession(next);
      return next;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  let session = currentSession;

  if (session && session.expires_at - Date.now() < REFRESH_AHEAD_MS) {
    try {
      session = await refreshSession();
    } catch {
      session = currentSession;
    }
  }

  let response = await send(path, method, options.body, session?.access_token);
  if (
    response.status === 401 &&
    currentSession &&
    !path.startsWith('/auth/')
  ) {
    session = await refreshSession();
    response = await send(path, method, options.body, session.access_token);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface RawResult {
  status: number;
  ok: boolean;
  duration_ms: number;
  request_id: string | null;
  content_type: string | null;
  body: unknown;
  text: string;
}

/** The feature lab's door: same auth and refresh, but never throws on a non-2xx answer. */
export async function apiRaw(
  method: string,
  path: string,
  body?: unknown,
): Promise<RawResult> {
  const started = performance.now();
  let session = currentSession;
  if (session && session.expires_at - Date.now() < REFRESH_AHEAD_MS) {
    try {
      session = await refreshSession();
    } catch {
      session = currentSession;
    }
  }

  let response = await send(path, method, body, session?.access_token);
  if (response.status === 401 && currentSession && !path.startsWith('/auth/')) {
    session = await refreshSession();
    response = await send(path, method, body, session.access_token);
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type');
  let parsed: unknown = null;
  if (contentType?.includes('json') && text.length > 0) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    duration_ms: Math.round(performance.now() - started),
    request_id: response.headers.get('x-request-id'),
    content_type: contentType,
    body: parsed,
    text,
  };
}

export async function login(email: string, password: string): Promise<Session> {
  const response = await send('/auth/login', 'POST', { email, password }, null);
  if (!response.ok) throw await toApiError(response);
  const body = (await response.json()) as LoginResponse;
  if (body.user.role !== 'admin') {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'This account is not an admin. Ask an admin to promote it, or run npm run make-admin.',
    );
  }
  const session = toSession(body);
  updateSession(session);
  return session;
}

export async function logout(): Promise<void> {
  const session = currentSession;
  updateSession(null);
  if (!session) return;
  try {
    await send('/auth/logout', 'POST', {
      refresh_token: session.refresh_token,
    }, session.access_token);
  } catch {
    // The local session is already gone; a failed revoke must not block sign-out.
  }
}
