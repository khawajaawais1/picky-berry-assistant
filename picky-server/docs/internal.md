# Internal job endpoints

These endpoints are protected by service-specific secrets and are intentionally
not part of the public Swagger document.

| Method and path | Authentication | Behavior |
|---|---|---|
| `GET /api/v1/internal/jobs/cron` | `Authorization: Bearer <CRON_SECRET>` | Enqueues today's Helsinki-date `score_zones_daily` job, then drains the queue within `JOBS_RUN_BUDGET_MS`. |
| `POST /api/v1/internal/jobs/run` | `X-Jobs-Token: <JOBS_RUN_TOKEN>` | Drains queued jobs within the configured budget. |

The runner uses PostgreSQL's lease-aware `claim_job`, `complete_job`, and
`reap_stale_jobs` functions. Responses include counts and bounded error summaries
with the job ID and type, but never job payloads or stack traces. Failures are
also logged with job context. Do not send either token to the app or log it.

For the temporary cron test, Vercel calls the route daily at 12:25 UTC (14:25
Finland time on November 28). Restore the normal 03:00 UTC schedule after
verification; that is 05:00 in Finland during standard time and 06:00 during
daylight-saving time.
