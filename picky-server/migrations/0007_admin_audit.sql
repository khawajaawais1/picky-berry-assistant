-- Up Migration
-- Every privileged mutation the operator surface performs. Rows carry ids and actions, not
-- picker positions; the actor's email is joined on read, so deleting an account does not
-- duplicate personal data here.

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  detail jsonb NOT NULL DEFAULT '{}',
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_ix ON audit_log (created_at DESC);
CREATE INDEX audit_log_actor_ix ON audit_log (actor_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Down Migration
DROP TABLE audit_log;
