-- Up Migration
-- Investigation fields for privileged actions and a database-level append-only guard.
-- Existing rows keep outcome='success'; the old detail shape remains readable.

ALTER TABLE audit_log
  ADD COLUMN reason text,
  ADD COLUMN before_data jsonb,
  ADD COLUMN after_data jsonb,
  ADD COLUMN outcome text NOT NULL DEFAULT 'success',
  ADD COLUMN ip inet,
  ADD COLUMN user_agent text;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_outcome_check
    CHECK (outcome IN ('success', 'failure')),
  ADD CONSTRAINT audit_log_reason_check
    CHECK (reason IS NULL OR length(btrim(reason)) >= 3);

CREATE OR REPLACE FUNCTION audit_log_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only; % is not permitted', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_reject_mutation();

-- Down Migration
DROP TRIGGER audit_log_append_only ON audit_log;
DROP FUNCTION audit_log_reject_mutation();

ALTER TABLE audit_log
  DROP CONSTRAINT audit_log_reason_check,
  DROP CONSTRAINT audit_log_outcome_check,
  DROP COLUMN user_agent,
  DROP COLUMN ip,
  DROP COLUMN outcome,
  DROP COLUMN after_data,
  DROP COLUMN before_data,
  DROP COLUMN reason;