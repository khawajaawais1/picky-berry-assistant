/**
 * A fake of the team API's `/auth/*` endpoints, for tests that need the app's real `sessionPort`
 * to hold a session. **Test-only**: nothing in the app imports it.
 *
 * It replaces the global `fetch` with a spy that answers the four auth endpoints the way the
 * served contract does (ADR-065). Register remembers a nickname so a later login answers with it,
 * as the real account would. Any other request is a 404, so a test that reaches the network
 * by accident fails loudly instead of passing quietly.
 */
type FakeAccount = { nickname: string | null };

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installFakeAuthServer() {
  const accounts = new Map<string, FakeAccount>();
  let issued = 0;

  function session(email: string) {
    issued += 1;
    return {
      access_token: `access-${issued}`,
      refresh_token: `refresh-${issued}`,
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        id: `00000000-0000-4000-8000-${String(issued).padStart(12, '0')}`,
        email,
        nickname: accounts.get(email)?.nickname ?? null,
        role: 'picker',
      },
    };
  }

  return jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    const email = typeof body.email === 'string' ? body.email : '';

    if (url.endsWith('/api/v1/auth/register')) {
      accounts.set(email, {
        nickname: typeof body.nickname === 'string' ? body.nickname : null,
      });
      return json(201, session(email));
    }
    if (url.endsWith('/api/v1/auth/login')) return json(200, session(email));
    if (url.endsWith('/api/v1/auth/refresh')) return json(200, session(''));
    if (url.endsWith('/api/v1/auth/logout')) return json(204);

    return json(404, { error: { code: 'NOT_FOUND', message: 'not faked' }, request_id: 'fake' });
  });
}
