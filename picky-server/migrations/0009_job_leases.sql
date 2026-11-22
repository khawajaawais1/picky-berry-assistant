-- Up Migration
-- Queue-safety contract for the Python worker.
--
-- A claimed job carries a 5-minute lease and a 30-second heartbeat. A worker must
-- call heartbeat_job() while it works; a heartbeat after the lease has expired
-- returns false and the worker must stop. Expired leases are recovered by
-- reap_stale_jobs() (also called by claim_job()) before another claim is made.

ALTER TABLE jobs
  ADD COLUMN worker_id text,
  ADD COLUMN heartbeat_at timestamptz,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN recovered_at timestamptz,
  ADD COLUMN recovery_count int NOT NULL DEFAULT 0;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_recovery_count_check CHECK (recovery_count >= 0);

-- Existing running rows predate the lease contract. Keep them recoverable once
-- their lock is five minutes old; the backfill is only a starting point.
UPDATE jobs
SET heartbeat_at = COALESCE(locked_at, now()),
    lease_expires_at = COALESCE(locked_at, now()) + interval '5 minutes'
WHERE status = 'running';

CREATE INDEX jobs_running_lease_ix
  ON jobs (lease_expires_at)
  WHERE status = 'running';
CREATE INDEX jobs_running_heartbeat_ix
  ON jobs (heartbeat_at)
  WHERE status = 'running';

-- Requeue running jobs whose lease is gone. A running job with no lease falls
-- back to its lock/creation time, so rows created before this migration are not
-- stranded. If another queued job already owns the same dedupe key, the stale
-- row is failed rather than violating jobs_dedupe_ix.
CREATE OR REPLACE FUNCTION reap_stale_jobs(p_limit integer DEFAULT 100)
RETURNS TABLE (job_id bigint, result text)
LANGUAGE plpgsql
AS $$
DECLARE
  stale jobs%ROWTYPE;
BEGIN
  FOR stale IN
    SELECT j.*
    FROM jobs j
    WHERE j.status = 'running'
      AND COALESCE(
            j.lease_expires_at,
            j.locked_at + interval '5 minutes',
            j.created_at + interval '5 minutes'
          ) < now()
    ORDER BY COALESCE(
               j.lease_expires_at,
               j.locked_at + interval '5 minutes',
               j.created_at + interval '5 minutes'
             ),
             j.id
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 1000))
  LOOP
    IF stale.dedupe_key IS NOT NULL AND EXISTS (
      SELECT 1 FROM jobs queued
      WHERE queued.status = 'queued'
        AND queued.dedupe_key = stale.dedupe_key
    ) THEN
      UPDATE jobs
      SET status = 'failed',
          finished_at = now(),
          locked_at = NULL,
          worker_id = NULL,
          heartbeat_at = NULL,
          lease_expires_at = NULL,
          recovered_at = now(),
          recovery_count = recovery_count + 1,
          last_error = 'lease expired; a newer queued job with the same dedupe key exists'
      WHERE id = stale.id;
      job_id := stale.id;
      result := 'failed';
    ELSE
      BEGIN
        UPDATE jobs
        SET status = 'queued',
            run_at = now(),
            locked_at = NULL,
            worker_id = NULL,
            heartbeat_at = NULL,
            lease_expires_at = NULL,
            finished_at = NULL,
            recovered_at = now(),
            recovery_count = recovery_count + 1,
            last_error = 'lease expired before completion'
        WHERE id = stale.id;
        job_id := stale.id;
        result := 'requeued';
      EXCEPTION WHEN unique_violation THEN
        UPDATE jobs
        SET status = 'failed',
            finished_at = now(),
            locked_at = NULL,
            worker_id = NULL,
            heartbeat_at = NULL,
            lease_expires_at = NULL,
            recovered_at = now(),
            recovery_count = recovery_count + 1,
            last_error = 'lease expired; a newer queued job with the same dedupe key exists'
        WHERE id = stale.id;
        job_id := stale.id;
        result := 'failed';
      END;
    END IF;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Claim the oldest runnable job and establish ownership. Reaping first means a
-- single worker loop repairs leases without a separate scheduler.
CREATE OR REPLACE FUNCTION claim_job(
  p_worker_id text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS SETOF jobs
LANGUAGE plpgsql
AS $$
DECLARE
  claimed jobs%ROWTYPE;
  lease_seconds integer := GREATEST(30, LEAST(COALESCE(p_lease_seconds, 300), 3600));
BEGIN
  IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
    RAISE EXCEPTION 'worker_id is required' USING ERRCODE = '22023';
  END IF;

  PERFORM reap_stale_jobs(100);

  UPDATE jobs j
  SET status = 'running',
      attempts = j.attempts + 1,
      locked_at = now(),
      worker_id = p_worker_id,
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => lease_seconds)
  WHERE j.id = (
    SELECT id
    FROM jobs
    WHERE status = 'queued'
      AND run_at <= now()
    ORDER BY run_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO claimed;

  IF claimed.id IS NULL THEN
    RETURN;
  END IF;
  RETURN NEXT claimed;
END;
$$;

-- Extend a live lease. The lease must still be valid; this prevents a worker
-- that paused past its lease from reviving a job another worker may have taken.
CREATE OR REPLACE FUNCTION heartbeat_job(
  p_job_id bigint,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  lease_seconds integer := GREATEST(30, LEAST(COALESCE(p_lease_seconds, 300), 3600));
BEGIN
  UPDATE jobs
  SET heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => lease_seconds)
  WHERE id = p_job_id
    AND status = 'running'
    AND worker_id = p_worker_id
    AND lease_expires_at > now();
  RETURN FOUND;
END;
$$;

-- Completion and failure are fenced by both worker id and a live lease. A worker
-- that lost ownership gets false and must not commit its side effects.
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id bigint,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE jobs
  SET status = 'done',
      finished_at = now(),
      locked_at = NULL,
      heartbeat_at = NULL,
      lease_expires_at = NULL,
      last_error = NULL
  WHERE id = p_job_id
    AND status = 'running'
    AND worker_id = p_worker_id
    AND lease_expires_at > now();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION fail_job(
  p_job_id bigint,
  p_worker_id text,
  p_error text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE jobs
  SET status = 'failed',
      finished_at = now(),
      locked_at = NULL,
      heartbeat_at = NULL,
      lease_expires_at = NULL,
      last_error = left(COALESCE(p_error, 'worker reported failure'), 4000)
  WHERE id = p_job_id
    AND status = 'running'
    AND worker_id = p_worker_id
    AND lease_expires_at > now();
  RETURN FOUND;
END;
$$;

-- Down Migration
DROP FUNCTION fail_job(bigint, text, text);
DROP FUNCTION complete_job(bigint, text);
DROP FUNCTION heartbeat_job(bigint, text, integer);
DROP FUNCTION claim_job(text, integer);
DROP FUNCTION reap_stale_jobs(integer);

DROP INDEX jobs_running_heartbeat_ix;
DROP INDEX jobs_running_lease_ix;

ALTER TABLE jobs
  DROP CONSTRAINT jobs_recovery_count_check,
  DROP COLUMN recovery_count,
  DROP COLUMN recovered_at,
  DROP COLUMN lease_expires_at,
  DROP COLUMN heartbeat_at,
  DROP COLUMN worker_id;