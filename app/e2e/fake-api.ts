import type { Page, Route } from '@playwright/test';

/**
 * The team API's account endpoints (`/auth/*`, `/me`), faked in the browser for the built web
 * export (ADR-065).
 *
 * The harness builds the export with `EXPO_PUBLIC_API_BASE_URL` on the reserved `.invalid` TLD
 * (`playwright.config.ts`), so a request that is not faked here can never reach a real server.
 * This answers `/auth/*` the way the served contract does. Register remembers the nickname so a
 * later login answers with it, as a real account would. Anything else is a 404, so a journey
 * that starts reading another endpoint fails visibly until it is faked here too.
 *
 * The export calls the API cross-origin, so every answer carries CORS headers and a preflight
 * is answered before the request it guards.
 */
export const FAKE_API_ORIGIN = 'https://picky-api.invalid';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export async function fakeAccountService(page: Page): Promise<void> {
  const nicknames = new Map<string, string | null>();
  const emailByToken = new Map<string, string>();
  let issued = 0;

  function session(email: string) {
    issued += 1;
    emailByToken.set(`access-${issued}`, email);
    return {
      access_token: `access-${issued}`,
      refresh_token: `refresh-${issued}`,
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        id: `00000000-0000-4000-8000-${String(issued).padStart(12, '0')}`,
        email,
        nickname: nicknames.get(email) ?? null,
        role: 'picker',
      },
    };
  }

  function profile(email: string) {
    return {
      id: '00000000-0000-4000-8000-000000000001',
      email,
      // The harness's accounts are verified: the journeys read the verified line.
      email_verified: true,
      nickname: nicknames.get(email) ?? null,
      role: 'picker',
      privacy_level: 'private',
      background_location: false,
      alert_radius_km: 10,
      species_interest: [],
      lang: 'en',
      created_at: '2026-11-21T12:00:00.000Z',
    };
  }

  async function answer(route: Route, status: number, body?: unknown) {
    await route.fulfill({
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: body === undefined ? '' : JSON.stringify(body),
    });
  }

  await page.route(`${FAKE_API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    const path = new URL(request.url()).pathname;
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email : '';

    switch (path) {
      case '/api/v1/auth/register':
        nicknames.set(email, typeof body.nickname === 'string' ? body.nickname : null);
        await answer(route, 201, session(email));
        return;
      case '/api/v1/auth/login':
        await answer(route, 200, session(email));
        return;
      case '/api/v1/auth/refresh':
        await answer(route, 200, session(''));
        return;
      case '/api/v1/auth/logout':
        await answer(route, 204);
        return;
      case '/api/v1/auth/password-reset':
        // The service's own answer for every address: accepted, whether or not one is registered.
        await answer(route, 202);
        return;
      case '/api/v1/me': {
        const token = (request.headers()['authorization'] ?? '').replace(/^Bearer /, '');
        const owner = emailByToken.get(token);
        if (owner === undefined) {
          await answer(route, 401, {
            error: { code: 'UNAUTHORIZED', message: 'x' },
            request_id: 'h',
          });
          return;
        }
        if (request.method() === 'DELETE') {
          await answer(route, 204);
          return;
        }
        await answer(route, 200, profile(owner));
        return;
      }
      case '/api/v1/me/export': {
        const token = (request.headers()['authorization'] ?? '').replace(/^Bearer /, '');
        const owner = emailByToken.get(token) ?? '';
        await answer(route, 200, {
          profile: profile(owner),
          consents: [],
          devices: [],
          visits: [],
          reports: [],
        });
        return;
      }
      default:
        await answer(route, 404, {
          error: { code: 'NOT_FOUND', message: 'not faked by the harness' },
          request_id: 'harness',
        });
    }
  });
}
