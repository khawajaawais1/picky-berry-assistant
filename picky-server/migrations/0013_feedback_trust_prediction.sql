-- Up Migration

CREATE TABLE zone_model_scores (
  zone_id uuid NOT NULL REFERENCES zones(id),
  species text NOT NULL REFERENCES species(code),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  ripeness text NOT NULL CHECK (ripeness IN ('unripe', 'ripening', 'ripe', 'past', 'off_season')),
  explanation jsonb NOT NULL,
  score_date date NOT NULL,
  model_version text NOT NULL,
  rules_version text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (species, zone_id)
);
CREATE INDEX zone_model_scores_date_ix ON zone_model_scores (score_date, zone_id);
ALTER TABLE zone_model_scores ENABLE ROW LEVEL SECURITY;

CREATE TABLE photos (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  submission_id uuid NOT NULL,
  counts jsonb NOT NULL,
  total integer NOT NULL CHECK (total >= 0),
  model_version text NOT NULL,
  image_width integer CHECK (image_width IS NULL OR image_width > 0),
  image_height integer CHECK (image_height IS NULL OR image_height > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_submission_ix ON photos (submission_id);
CREATE INDEX photos_user_submission_ix ON photos (user_id, submission_id);
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

ALTER TABLE reports
  ADD COLUMN submission_id uuid,
  ADD COLUMN amount_l real CHECK (amount_l IS NULL OR amount_l BETWEEN 0 AND 200),
  ADD COLUMN flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN trust_processed_at timestamptz;

UPDATE reports SET submission_id = gen_random_uuid() WHERE submission_id IS NULL;
ALTER TABLE reports ALTER COLUMN submission_id SET NOT NULL;

WITH duplicate_visits AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY visit_id, species
           ORDER BY created_at, id
         ) AS row_number
  FROM reports
  WHERE visit_id IS NOT NULL
)
UPDATE reports r
SET flags = array_append(r.flags, 'legacy_duplicate')
FROM duplicate_visits d
WHERE d.id = r.id AND d.row_number > 1;

CREATE UNIQUE INDEX reports_submission_species_uq
  ON reports (submission_id, species);
CREATE UNIQUE INDEX reports_visit_species_uq
  ON reports (visit_id, species)
  WHERE visit_id IS NOT NULL
    AND NOT ('legacy_duplicate' = ANY(flags));
CREATE INDEX reports_user_day_ix ON reports (user_id, created_at DESC);
CREATE INDEX reports_unflagged_zone_species_ix
  ON reports (zone_id, species, created_at DESC)
  WHERE cardinality(flags) = 0;

ALTER TABLE user_trust ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Down Migration
ALTER TABLE user_trust DROP COLUMN updated_at;
DROP INDEX reports_unflagged_zone_species_ix, reports_user_day_ix,
  reports_visit_species_uq, reports_submission_species_uq;
ALTER TABLE reports
  DROP COLUMN trust_processed_at,
  DROP COLUMN flags,
  DROP COLUMN amount_l,
  DROP COLUMN submission_id;
DROP TABLE photos, zone_model_scores;
