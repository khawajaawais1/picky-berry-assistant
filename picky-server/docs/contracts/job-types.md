# Scoring job contract

The API and the scoring worker communicate through PostgreSQL's `jobs` table.
The API only inserts queued jobs; the Python worker owns claiming, processing,
retries, and completion.

| `type` | `payload` | `dedupe_key` |
|---|---|---|
| `recompute_zone_score` | `{ "zone_id": "<uuid>", "species": "<code>?" }` | `recompute:<zone_id>` for all species · `recompute:<zone_id>:<species>` for one |
| `recompute_all` | `{}` | `recompute_all` |
| `validate_report` | `{ "report_id": "<uuid>" }` | `validate:<report_id>` |

Queued jobs with the same non-null `dedupe_key` are unique. A contract change
must be coordinated with the worker in the same change.
