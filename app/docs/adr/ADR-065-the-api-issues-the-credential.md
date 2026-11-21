# ADR-065 — The team API issues the credential; the app integrates the served contract

- **Status:** Accepted (2026-11-21)
- **Date:** 2026-11-21
- **Deciders:** Project owner, on 2026-11-21, choosing to integrate against the backend as built.
- **Supersedes:** [ADR-054](ADR-054-the-account-belongs-to-the-api.md) decisions 2, 3 and 6, and
  the Firebase half of decision 7. Decision 1 still holds: the account is the API's record. Also
  supersedes [ADR-041](ADR-041-a-session-that-can-run-out-says-so.md)'s countdown: a renewed
  session has no hour to count down.
- **Related:** [ADR-006](ADR-006-secure-credential-storage.md) (secure storage),
  [ADR-028](ADR-028-an-authentication-seam-behind-a-port.md) (the session port),
  [ADR-062](ADR-062-password-reset-belongs-to-the-provider.md) (password reset).

## Context

The deployed backend (`picky-server`, served at `https://picky-berry-assistant.vercel.app/api/v1`,
OpenAPI at `/docs-json`) implements the team plan as written. `POST /auth/register` and
`POST /auth/login` take `{ email, password }`. The server hashes the password itself and issues
its own JWT access token and a rotating refresh token (`/auth/refresh`, `/auth/logout`). Every
other endpoint requires `Authorization: Bearer <access token>`, the zone reads included.

ADR-054 rejected exactly this model (its alternative 1). It was never built, and the app has run
on a stand-in session port ever since. The owner chose to integrate against the served contract
rather than wait for an idToken exchange.

## Decision

1. **The password goes to the team API**, over HTTPS only, in the `/auth/register` and
   `/auth/login` bodies. The app still never stores, logs or echoes it.
2. **The API's tokens are the session.** The access token and the refresh token live in platform
   secure storage through `expo-secure-store` (ADR-006). Nothing token-shaped is written to
   AsyncStorage, the query cache, a log or a URL.
3. **The session port keeps its shape** (`signIn`, `current`, `signOut`,
   `requestPasswordReset`). An API adapter replaces the stand-in. Refresh happens inside the
   transport: a 401 on an authenticated call triggers one refresh and one retry, and a failed
   refresh ends the session.
4. **Password reset is unavailable in every build** until the API has an endpoint for it. Firebase
   holds none of these accounts, so the ADR-062 Firebase request would report success for a link
   that can never arrive. `passwordResetAvailability()` answers `unavailable`, and the reset screen
   draws its action disabled.
   **Amended 2026-11-21:** the API now has `POST /auth/password-reset` (picky-server, PR #24).
   The reset request goes there through the session port, and `passwordResetAvailability()`
   answers `accepted` in any build that can reach the API. The API's mail is console-only, so the
   screen says the request was accepted and claims no email; `live` is kept for when the service
   sends real mail. The Firebase adapter and `EXPO_PUBLIC_FIREBASE_API_KEY` are removed, which
   supersedes [ADR-062](ADR-062-password-reset-belongs-to-the-provider.md)'s Firebase provider.
5. **The transport is one module** (`src/services/api/`). It is the only code that calls `fetch`
   against the team API. It reads the base URL from `src/config/env.ts`, appends `/api/v1`, and
   returns explicit results (`ok: true | false`) rather than throwing. Every response body is
   validated at that boundary before a feature sees it.

## Alternatives considered

1. **Keep ADR-054 and wait for an idToken exchange.** Rejected by the owner. Every authenticated
   endpoint would stay unreachable from the app.
2. **Firebase in front of the served API.** This would need server changes that nobody has
   planned.

## Consequences

- The breach surface ADR-054 avoided now exists server-side: password hashing, lockout and reset
  are the backend team's to own. The client's job is not to widen it.
- Registration happens in one system, so ADR-054 decision 4's recovery path is no longer needed.
- Deletion is `DELETE /me` alone.
- The stand-in session port is deleted (ADR-054 decision 8). The account-security screen states
  where the session is kept (secure storage, or the tab's memory on the web) and that it is
  renewed, and draws no countdown.
