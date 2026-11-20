-- ML tables — reference DDL for the backend (port into Alembic with identical names).
-- Depends on data/sql/001_data_tables.sql (zones, species). Owner of the logic: ml/ (berry_ml).
-- Every row says which model produced it, so a score can always be traced and recomputed.

-- 1. Zone scores: one row per zone × species × computation. History is kept (analytics, 6.8).
CREATE TABLE IF NOT EXISTS zone_scores (
  id              bigserial PRIMARY KEY,
  zone_id         uuid NOT NULL REFERENCES zones ON DELETE CASCADE,
  species         text NOT NULL REFERENCES species,
  score           smallint NOT NULL CHECK (score BETWEEN 0 AND 100),     -- what the app shows
  confidence      text NOT NULL CHECK (confidence IN ('low','medium','high')),
  ripeness        text NOT NULL CHECK (ripeness IN ('unripe','ripening','ripe','past')),
  s_model         smallint NOT NULL CHECK (s_model BETWEEN 0 AND 100),   -- map score before reports
  s_feedback      real,                                                   -- weighted mean of report evidence, null if none
  evidence_weight real NOT NULL DEFAULT 0,                                -- W in berry_ml.reports
  reports_used    integer NOT NULL DEFAULT 0,
  site_potential  real NOT NULL CHECK (site_potential BETWEEN 0 AND 1),
  forest_share    real NOT NULL CHECK (forest_share BETWEEN 0 AND 1),
  year_index      real NOT NULL DEFAULT 1.0,
  score_date      date NOT NULL,                                          -- the day the score is for
  computed_at     timestamptz NOT NULL DEFAULT now(),
  model_version   text NOT NULL                                           -- e.g. zone-grid-jkl-v1+rules-v1
);
CREATE INDEX IF NOT EXISTS zone_scores_latest ON zone_scores (zone_id, species, computed_at DESC);

-- The latest score per zone × species (data/sql/900_data_checks.sql C8 reads this view).
CREATE OR REPLACE VIEW zone_scores_current AS
SELECT DISTINCT ON (zone_id, species) *
FROM zone_scores
ORDER BY zone_id, species, computed_at DESC;

-- 2. What the detector found in a feedback photo (6.4). One row per photo.
CREATE TABLE IF NOT EXISTS photo_detections (
  photo_id        uuid PRIMARY KEY,                 -- the media module's photo id
  feedback_id     uuid,                             -- the report the photo belongs to
  status          text NOT NULL CHECK (status IN ('pending','done','failed')),
  counts          jsonb,                            -- {"bilberry":32,"cloudberry":0,"crowberry":0,"lingonberry":0}
  total           integer,
  detections      jsonb,                            -- [{"berry","confidence","box":[x1,y1,x2,y2]}], optional
  error           text,                             -- why it failed (never shown to other users)
  model_version   text NOT NULL,                    -- berry-yolo11n-v1
  created_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz
);

-- 3. Reporter trust (6.5). Server-only: never returned in a response about another account.
CREATE TABLE IF NOT EXISTS reporter_trust (
  account_id      text PRIMARY KEY,                 -- the identity provider's subject
  trust           real NOT NULL DEFAULT 0.5 CHECK (trust BETWEEN 0.05 AND 1.0),
  reports_scored  integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  rules_version   text NOT NULL DEFAULT 'zone-score-rules-v1'
);
