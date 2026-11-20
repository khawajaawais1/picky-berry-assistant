-- Up Migration

CREATE EXTENSION IF NOT EXISTS postgis;
SET search_path TO public, extensions;

CREATE TABLE species_phenology (
  species text PRIMARY KEY REFERENCES species(code),
  gdd_flowering real,
  gdd_ripe real,
  gdd_past real,
  source_url text,
  verified boolean NOT NULL DEFAULT false
);

CREATE TABLE zone_scores (
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  computed_at timestamptz NOT NULL DEFAULT now(),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  ripeness text NOT NULL CHECK (ripeness IN ('unripe', 'ripening', 'ripe', 'past', 'off_season')),
  s_reports smallint,
  s_model smallint,
  n_eff real,
  band_width real,
  explanation jsonb NOT NULL,
  PRIMARY KEY (zone_id, species, computed_at)
);

CREATE TABLE zone_scores_current (
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  ripeness text NOT NULL CHECK (ripeness IN ('unripe', 'ripening', 'ripe', 'past', 'off_season')),
  s_reports smallint,
  s_model smallint,
  n_eff real,
  band_width real,
  explanation jsonb NOT NULL,
  computed_at timestamptz NOT NULL,
  PRIMARY KEY (species, zone_id)
);

CREATE TABLE jobs (
  id bigserial PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  dedupe_key text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX jobs_dedupe_ix ON jobs (dedupe_key) WHERE status = 'queued';
CREATE INDEX jobs_pick_ix ON jobs (run_at) WHERE status = 'queued';

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  visit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_trust (
  user_id uuid PRIMARY KEY,
  trust real NOT NULL DEFAULT 0.5 CHECK (trust BETWEEN 0 AND 1)
);

CREATE INDEX zs_hist_ix ON zone_scores (zone_id, species, computed_at DESC);
CREATE INDEX reports_zone_ix ON reports (zone_id, species, created_at DESC);
CREATE INDEX IF NOT EXISTS zones_centroid_geog_ix ON zones USING gist ((centroid::geometry));

ALTER TABLE species_phenology ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_scores_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust ENABLE ROW LEVEL SECURITY;

-- Down Migration
DROP INDEX IF EXISTS zones_centroid_geog_ix;
DROP TABLE user_trust, reports, jobs, zone_scores_current, zone_scores, species_phenology;
