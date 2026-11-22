-- Up Migration
-- Feature 6.7: reasoning job output tables.
--
-- alert_rules_log: one row per rule execution (the job writes this first so each
--   alert can reference it; the app can query it for observability).
-- alerts: one candidate per zone × species × rule, produced by run_reasoning.
--   Columns mirror the Alert dataclass in backend/app/modules/reasoning/service.py.
--   name_en / name_fi / zone_iri / species_iri are denormalised from the ontology so
--   the router can serve them without re-loading the graph per request.
--   No user_id here: user filtering (radius, species_interest, throttle) happens at
--   serve time in GET /api/v1/alerts (feature 6.7 layers 5–6).

CREATE TABLE alert_rules_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id      text NOT NULL,
  rule_version text NOT NULL,
  zone_count   int,
  alert_count  int,
  status       text NOT NULL CHECK (status IN ('ok', 'failed')),
  error        text,
  duration_ms  int,
  run_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alert_rules_log_rule_ix ON alert_rules_log (rule_id, run_at DESC);

CREATE TABLE alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           uuid NOT NULL REFERENCES alert_rules_log(id) ON DELETE CASCADE,
  zone_id          uuid NOT NULL REFERENCES zones(id),
  species          text NOT NULL REFERENCES species(code),
  rule_id          text NOT NULL,
  rule_version     text NOT NULL,
  score            smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence       text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  ripeness         text NOT NULL CHECK (ripeness IN ('unripe', 'ripening', 'ripe', 'past')),
  suitability      real NOT NULL CHECK (suitability BETWEEN 0 AND 1),
  ecology_verified boolean NOT NULL DEFAULT false,
  sentence         text NOT NULL,
  place            text,
  zone_number      text NOT NULL,
  zone_iri         text NOT NULL,
  species_iri      text NOT NULL,
  name_en          text NOT NULL,
  name_fi          text NOT NULL,
  computed_at      timestamptz NOT NULL DEFAULT now()
);

-- Latest alert per zone × species (router reads this to serve alerts).
CREATE INDEX alerts_zone_species_ix  ON alerts (zone_id, species, computed_at DESC);
-- Throttle check: how many alerts were sent for a user's zone in the last N days.
CREATE INDEX alerts_computed_at_ix   ON alerts (computed_at DESC);
-- Rule audit: how many alerts did rule X produce in the latest run?
CREATE INDEX alerts_rule_run_ix      ON alerts (rule_id, run_id);

ALTER TABLE alert_rules_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;

-- Down Migration
DROP TABLE alerts, alert_rules_log;
