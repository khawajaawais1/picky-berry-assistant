# Frontend audit → tickets

**Status: proposed plan, for the team board.** What the audit found, cut into tickets small
enough to take, each with one accountable owner and the ticket that must land first. The audit's
evidence stays in [PROJECT.md](../../PROJECT.md) (known issues 9–19) and the gap table in
[team-mvp-plan.md](team-mvp-plan.md) §6; this file does not restate it.

- Written: 2026-10-23, against `main` at the state recorded in PROJECT.md.
- **Owner means accountable, not solo.** "TBD" appears nowhere: where a decision is the owner's,
  the ticket says so rather than inventing a name.

## Priority

| Band | Meaning | Window |
| --- | --- | --- |
| **P0** | The 17 Dec demo is not honest without it | now → 17 Nov |
| **P1** | The demo stands, but is a walkthrough of screens rather than a working app | 18 Nov – 1 Dec |
| **P2** | After the demo, or the day its blocked decision lands | from 2 Dec |

Two rules keep this list short: a ticket that only another ticket's owner can start is not P0
(see *Blocked by*), and anything the audit found already done is not a ticket at all (last section).

## Tickets

### P0 — the demo cannot be shown without these

| ID | Ticket | Owner | Blocked by | Done when |
| --- | --- | --- | --- | --- |
| ~~**F1**~~ | ~~**One zone dataset on screen 06.**~~ **Landed 2026-10-23** (ADR-057): the card, list and both controls read the same `ZoneSource` answer as the map, and a search that keeps no zone leaves the map with no rings | Salman (app) | — | Met; known issue 14 closed. The card's link to screen 07 waits on the zone service |
| **F2** | **Settle the zone response and serve `GET /zones`.** Answer ADR-036's open questions, then return the 50 pilot zones with score and confidence | Hassan (API), Awais (data) | — | ADR-036 moves from Proposed to accepted; the shape is in [api-contract.md](../api-contract.md); the pilot geometry comes from the service, not a copied asset |
| **F3** | **API client, base URL, TanStack Query.** One generated client from the OpenAPI schema, a base URL in `config/env.ts`, and a screen that reads live data with loading, empty and failed states | Salman (app) | F2 | One screen shows server data; a stopped server shows a sentence, not a blank or a crash |
| **F4** | **Offline store, outbox, sync.** SQLite + Drizzle, an outbox table, and a sync engine that replays reports idempotently | Salman (app), Hassan (API) | F3 | A report captured in airplane mode is sent once after reconnect, and a replayed request creates no second visit |

### P1 — makes the demo a working app

| ID | Ticket | Owner | Blocked by | Done when |
| --- | --- | --- | --- | --- |
| **F5** | **Foreground visits.** Wire the tracker to a screen and the zone list, with the local notification at the end of a visit | Salman (app) | F4 | A visit starts and ends with the app open on a device, once; no raw track is stored (ADR-010). Background capture is out of scope for v1 (ADR-056) |
| **F6** | **Real scores.** Five bands, the confidence rule, "why this score" reasons and the near-me ranking, on the model's numbers | Remon (model), Salman (app) | F2, D1 | A zone's score, band and confidence come from the service; every band has a token and a word, not colour alone |
| **F7** | **Alerts.** `GET /alerts` and FCM push, with the reason phrase the reasoner produced | Asmer (reasoning), Salman (app), Hassan (API) | F3 | A push arrives on a device, opens the alert's zone, and the inbox matches the endpoint |
| **F8** | **Score meaning without colour, and a native screen-reader pass.** Close known issue 13 and run VoiceOver/TalkBack on screens 06, 07 and 10 | Salman (app), Sayeem (QA) | F6 | Score and confidence are readable with colour off, and the pass is recorded with what it found |
| **F9** | **Maestro device harness.** A device/emulator suite for the flows the web export cannot reach: permission prompts, backgrounding, push | Sayeem (QA) | — | One flow runs in CI against a simulator; the harness runs in under ten minutes |

### P2 — after the demo

| ID | Ticket | Owner | Blocked by | Done when |
| --- | --- | --- | --- | --- |
| **F10** | **Basemap tiles.** Host PMTiles derived from OSM and point the map style at it (ADR-031) | Awais (data), Sabih (infra) | — | Screen 06 draws streets and water under the rings, offline in Expo Go |
| **F11** | **Sentry, app and backend.** The SDK, a DSN in `config/env.ts`, and the EU project ADR-055 requires (AGENTS.md §11) | Sabih (infra), Salman (app) | — | A hand-thrown error arrives with no position data in the payload, and the test that proves the scrub passes |
| **F12** | **Release hygiene.** iOS bundle identifier, and a decision recorded on the route tree's names versus the plan's | Salman (app), Sabih (infra) | — | `npx expo run:ios` signs; the naming decision is an ADR, not a rename left implicit |

## Decisions that block tickets

Three were answered by the owner on 2026-10-23 and no longer hold a ticket; one remains.

| ID | Decision | Whose | State |
| --- | --- | --- | --- |
| **D1** | Which provider signs people in — Firebase as built, or the plan's email + password on FastAPI | Hassan with the project owner | **Answered** 2026-10-23: the API owns the account, Firebase issues the credential (ADR-054) |
| **D2** | Whether the app may ask for background location, and what the permission screen promises (ADR-047 §2) | Project owner | **Answered** 2026-10-23: no, foreground-only for v1 (ADR-056) |
| **D3** | Lawful basis, retention and processors, including whether Sentry may hold a stack trace | Sabih with the owner | **Answered** 2026-10-23: 12 months, 30-day backups, 90-day EU crash reports, EU-only processors (ADR-055) |
| **D4** | One word each for a zone's forecast and a visit's estimate — the plan and this repository currently swap "yield score" | Project owner | **Open** — holds F6's copy |

## Critical path

```
F2 ──► F3 ──► F4 ──► F5
        └────► F7
F2 ──► F6 ──► F8
```

F2 is the only ticket that unblocks three others; it is the week's first action, not F1.

## Already closed — do not re-ticket

Screen 06's map (MapLibre over the pilot stub, five bands, ADR-053), the four species, and the
Finnish/English catalogues were found done in this audit. Frames 08 and 09 still draw the design's
geometry (ADR-021) — nothing is ticketed until a route and a visit's zone have coordinates.
