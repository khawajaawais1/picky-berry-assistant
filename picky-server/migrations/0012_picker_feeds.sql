-- Up Migration
-- Picker-facing feeds the mobile app reads instead of design samples.
--
-- reports: the post-visit report carries the harvest the picker entered and how long the visit
--   lasted, and the app's own id so an outbox replay cannot store the same report twice.

ALTER TABLE reports
  ADD COLUMN client_id uuid,
  ADD COLUMN amount_kg numeric(6, 2) CHECK (amount_kg IS NULL OR (amount_kg >= 0 AND amount_kg <= 500)),
  ADD COLUMN minutes integer CHECK (minutes IS NULL OR (minutes >= 0 AND minutes <= 1440)),
  ADD COLUMN recorded_at timestamptz;
CREATE UNIQUE INDEX reports_client_id_uq ON reports (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX reports_user_ix ON reports (user_id, created_at DESC);

-- Down Migration
DROP INDEX IF EXISTS reports_user_ix;
DROP INDEX IF EXISTS reports_client_id_uq;
ALTER TABLE reports DROP COLUMN recorded_at, DROP COLUMN minutes, DROP COLUMN amount_kg, DROP COLUMN client_id;
