-- Up Migration

CREATE TABLE visits (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  zone_id uuid REFERENCES zones(id),
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_s int GENERATED ALWAYS AS ((extract(epoch FROM (ended_at - started_at)))::int) STORED,
  manual boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'rejected')),
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'rejected' OR zone_id IS NOT NULL),
  CHECK ((status = 'rejected') = (reject_reason IS NOT NULL))
);
CREATE INDEX visits_user_ix ON visits (user_id, started_at DESC);
CREATE INDEX visits_zone_ix ON visits (zone_id, started_at DESC) WHERE status = 'accepted';

ALTER TABLE reports ADD CONSTRAINT reports_visit_fk FOREIGN KEY (visit_id) REFERENCES visits(id);
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Down Migration
ALTER TABLE reports DROP CONSTRAINT reports_visit_fk;
DROP TABLE visits;
