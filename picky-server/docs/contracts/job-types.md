# Scoring job contract

The API and the NestJS job runner communicate through PostgreSQL's `jobs` table.
User requests enqueue jobs; the internal runner claims, processes, retries, and
completes them. Migration `0009_job_leases.sql` supplies the lease-aware queue
functions used by the runner.

## Job types

| `type`                 | `payload`                                      | `dedupe_key`                    |
| ---------------------- | ---------------------------------------------- | ------------------------------- |
| `score_zones_daily`    | `{ "date": "YYYY-MM-DD", "offset": 0 }`        | `daily:<date>:<offset>`         |
| `recompute_zone_score` | `{ "zone_id": "<uuid>", "species": "<code>" }` | `recompute:<zone_id>:<species>` |
| `process_report`       | `{ "report_id": "<uuid>" }`                    | `process:<report_id>`           |
| `refresh_analytics`    | `{}`                                           | `refresh_analytics`             |

Queued jobs with the same non-null `dedupe_key` are unique. A contract change
must update enqueueing code and the job handler together.

The analytics refresh is enqueued after daily score finalization, and lazily when
the runner starts and `mv_zone_daily` is older than `ANALYTICS_REFRESH_MINUTES`.
`POST /api/v1/admin/analytics/refresh` also enqueues it. The materialized view
refresh runs outside a transaction because PostgreSQL does not allow
`REFRESH MATERIALIZED VIEW CONCURRENTLY` inside one.

## Lease and heartbeat

Every claim establishes worker ownership and a lease:

| Column             | Meaning                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `worker_id`        | The process that owns the current claim. Use a unique value such as `<host>:<pid>:<uuid>`; a restarted worker must not reuse an old id. |
| `heartbeat_at`     | When the owner last proved it was alive.                                                                                                |
| `lease_expires_at` | The claim is valid only before this instant. Default lease: **5 minutes**.                                                              |
| `recovered_at`     | When the reaper last touched this row.                                                                                                  |
| `recovery_count`   | How many times an expired claim has been recovered.                                                                                     |

The current internal runner has a 40-second budget, below the five-minute job
lease, so its handlers do not heartbeat. If a handler can exceed its lease, split
the work into pages or add periodic `heartbeat_job(job_id, worker_id, lease_seconds)`
calls. The database accepts a heartbeat only while the lease is live and the
worker still owns the row:

```sql
SELECT heartbeat_job($1, $2, 300) AS still_owned;
```

`false` means the worker has lost the claim (lease expired, reaped, or another
worker owns it). Stop work and roll back; do not write scores after that point.
The lease is not revived if it has already expired.

## Claim

The runner calls `claim_job()` before each unit of work:

```sql
SELECT * FROM claim_job('<host>:<pid>:<uuid>', 300);
```

The function:

1. runs `reap_stale_jobs(100)`;
2. takes the oldest queued, runnable row with `FOR UPDATE SKIP LOCKED`;
3. sets `status = 'running'`, increments `attempts`, records `worker_id`,
   `heartbeat_at`, `locked_at`, and `lease_expires_at`.

No row means the queue is empty. The runner must not claim a row with its own
SQL; use this function so reaping and lease setup happen atomically.

## Completion and failure

Both operations are fenced by the worker id and a still-live lease:

```sql
SELECT complete_job($1, $2) AS completed;
SELECT fail_job($1, $2, $3) AS failed;
```

`false` means the worker no longer owns the job. It must not commit side
effects. A successful completion leaves `worker_id` as the last owner for
investigation and clears the heartbeat, lease, and lock.

## Stale-job recovery

`reap_stale_jobs(p_limit)` requeues running jobs whose lease is expired. A
running row with no lease falls back to `locked_at + 5 minutes`, then
`created_at + 5 minutes`, so rows created before `0009` are not stranded.

- A stale row with no queued job sharing its `dedupe_key` becomes `queued` with
  `run_at = now()`, a cleared worker/lease/heartbeat, `recovered_at = now()`,
  `recovery_count + 1`, and `last_error = 'lease expired before completion'`.
- If a queued job already has the same `dedupe_key`, the stale row becomes
  `failed` instead, so `jobs_dedupe_ix` is never violated. Its `last_error`
  names the newer queued job.

`claim_job()` reaps before claiming, so the internal runner recovers stale
rows without a separate scheduler. An operator can see the same contract in
`GET /api/v1/admin/jobs`; the API never claims or reaps.

## Admin-visible stuck fields

The admin queue derives these from the raw columns; they are not stored:

| Field                   | Meaning                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `lease_expired`         | A running job whose lease deadline has passed.                          |
| `heartbeat_age_seconds` | Seconds since the last heartbeat, or `null`.                            |
| `stuck`                 | Running and without a heartbeat in 2 minutes, or with an expired lease. |
| `stuck_for_seconds`     | How long the current stuck condition has lasted, or `null`.             |

The operations health check fails on any expired lease and warns on a live
lease with a heartbeat older than 2 minutes. A broken runner therefore shows up
before the 5-minute lease expires, while the reaper handles the eventual expiry.
