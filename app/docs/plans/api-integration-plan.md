# API integration plan

**Source:** `https://picky-berry-assistant.vercel.app/docs` (OpenAPI 3.1 at `/docs-json`,
"Berry Picker Zones API" 1.0.0). Base path `/api/v1`. Everything except `/auth/*` requires a
bearer token, `/species` included. The auth model is [ADR-065](../adr/ADR-065-the-api-issues-the-credential.md).

Every phase is test-first (AGENTS.md §4): an injected `fetch` recorder, with no network in the
suite.

| #   | Phase                    | Endpoints                                                                                          | Replaces                                                    | Status      |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------- |
| 0   | Transport                | (all)                                                                                              | nothing; new `src/services/api/`                            | Done        |
| 1   | Auth and session         | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`        | stand-in session port, in-memory store → secure store      | Done        |
| 2   | Zones                    | `GET /zones` (bbox + species), `/zones/near`                                                       | `testZoneSource` behind the `ZoneSource` port               | Done        |
| 3   | Zone details             | `GET /zones/{id}`, `/zones/{id}/explanation`, `/zones/{id}/history`, `GET /species`                | screen 07's sample outlook and reports                      | Done        |
| 4   | Visits                   | `POST /visits` (idempotent `client_id`), `GET /visits`                                             | local-only visit lifecycle; outbox flush                    | Done        |
| 5   | Account and privacy      | `GET/PATCH/DELETE /me`, `PATCH /me/privacy`, `POST /me/export`, `POST /me/devices`                 | privacy screens' local state, your-data export              | Done        |
| 6   | Offline                  | `GET /zones/snapshot` (full and incremental)                                                       | downloads screen's stand-in                                 | Done        |

## Known contract gaps to raise with the backend team

1. Resolved in phase 2: a served feature's one species becomes the zone's only score, and a null
   `name` gets the data contract's fallback ("Zone 50E25", from the H3 cell).
2. Resolved in phase 2: the map does not load by viewport, so `GET /zones` is asked for a fixed
   pilot bbox (`PILOT_BBOX`) at zoom 12. Viewport loading needs a map that pans first.
3. Resolved: the reset screen asks `POST /auth/password-reset` (picky-server PR #24) and claims an
   accepted request, not a sent email, while the API's mail is console-only. The Firebase reset
   adapter and its key are removed.
4. Corrected: `/health` was never broken. The served OpenAPI document gives it a per-path `/`
   server, which this plan first missed. #24 also serves it at `/api/v1/health` for uniformity.
5. Resolved by [ADR-068](../adr/ADR-068-registration-records-the-notice-version.md): the API refuses empty consents (`422 CONSENT_REQUIRED`), so registration records the device notice's version (`device-notice-2026-11-21`) as both versions until real terms exist.
6. Resolved by [ADR-066](../adr/ADR-066-the-tracker-is-mounted-over-the-zone-service.md): the app
   shell mounts the visit tracker over the zone service's zones, and finalized visits post to
   `POST /visits`. Open and unsent visits do not survive the process ending.
7. **Not built in phase 5, each for a stated reason:** `PATCH /me` (nickname, alert radius,
   species interest, language) and `PATCH /me/privacy` (privacy level) have no control in any
   frame, so drawing one is a design decision. `background_location` stays false (ADR-056).
   `POST /me/devices` needs an FCM token, and the app has no push notifications set up yet.
