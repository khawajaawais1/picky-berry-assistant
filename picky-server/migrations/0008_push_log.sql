-- Up Migration
-- Feature 6.7: push delivery log — throttle and audit.
--
-- push_log: one row per FCM send attempt. The throttle logic reads it to enforce:
--   - max 2 pushes per user per day
--   - no repeat for the same zone × species to the same user within 3 days
-- Keeping zone_id + species denormalised (instead of just alert_id) means the
-- 3-day cooldown query uses an index rather than joining back through alerts.

CREATE TABLE push_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id   uuid REFERENCES alerts(id) ON DELETE SET NULL,
  zone_id    uuid NOT NULL REFERENCES zones(id),
  species    text NOT NULL REFERENCES species(code),
  fcm_token  text NOT NULL,
  status     text NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at    timestamptz NOT NULL DEFAULT now()
);

-- Rate-limit check: how many pushes did this user receive today?
CREATE INDEX push_log_user_day_ix   ON push_log (user_id, sent_at DESC) WHERE status = 'sent';
-- 3-day zone × species cooldown: has this user seen this zone × species recently?
CREATE INDEX push_log_cooldown_ix   ON push_log (user_id, zone_id, species, sent_at DESC) WHERE status = 'sent';

ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;

-- Down Migration
DROP TABLE push_log;
