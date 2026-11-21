# API integration plan

**Source:** `https://picky-berry-assistant.vercel.app/docs` (OpenAPI 3.1 at `/docs-json`,
"Berry Picker Zones API" 1.0.0). Base path `/api/v1`. Everything except `/auth/*` and `/species`
requires a bearer token. The auth model is [ADR-065](../adr/ADR-065-the-api-issues-the-credential.md).

Every phase is test-first (AGENTS.md §4): an injected `fetch` recorder, with no network in the
suite.

| #   | Phase                    | Endpoints                                                                                          | Replaces                                                    | Status      |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------- |
| 0   | Transport                | (all)                                                                                              | nothing; new `src/services/api/`                            | In progress |
| 1   | Auth and session         | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`        | stand-in session port, in-memory store → secure store      | In progress |
| 2   | Zones                    | `GET /zones` (bbox + species), `/zones/near`                                                       | `testZoneSource` behind the `ZoneSource` port               | Next        |
| 3   | Zone details             | `GET /zones/{id}`, `/zones/{id}/explanation`, `/zones/{id}/history`, `GET /species`                | screen 07's sample outlook and reports                      | Planned     |
| 4   | Visits                   | `POST /visits` (idempotent `client_id`), `GET /visits`                                             | local-only visit lifecycle; outbox flush                    | Planned     |
| 5   | Account and privacy      | `GET/PATCH/DELETE /me`, `PATCH /me/privacy`, `POST /me/export`, `POST /me/devices`                 | privacy screens' local state, your-data export              | Planned     |
| 6   | Offline                  | `GET /zones/snapshot` (full and incremental)                                                       | downloads screen's stand-in                                 | Planned     |

## Known contract gaps to raise with the backend team

1. `GET /zones` features carry one species' score at the top level and a nullable `name`. The
   app's `parseZones` requires a name and reads a per-species `scores` map when present. Phase 2
   needs a display fallback for a null name.
2. `GET /zones` requires `bbox`, but the `ZoneSource` port only takes `species`. Phase 2 widens
   `ZoneQuery` with the map's viewport.
3. There is no password-reset endpoint (ADR-065 decision 4).
4. `/health` returns 404 under `/api/v1` on the deployed host.
