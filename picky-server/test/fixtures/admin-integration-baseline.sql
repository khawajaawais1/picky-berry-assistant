-- Minimal reference schema for the admin integration suite.
-- The real data baseline (data/sql/001_data_tables.sql) needs h3-pg. The pinned
-- PostGIS test image does not ship h3, so the test baseline keeps the same API-facing
-- columns and uses text for the H3 identifiers. API migrations run on top of this.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE species (
  code text PRIMARY KEY,
  latin text NOT NULL,
  name_fi text NOT NULL,
  name_en text NOT NULL,
  iri text,
  colour text,
  season_start_doy smallint,
  season_end_doy smallint
);

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  h3 text NOT NULL UNIQUE,
  h3_parent6 text NOT NULL,
  name text,
  forest_type text NOT NULL,
  forest_fraction real NOT NULL DEFAULT 1,
  mire_fraction real NOT NULL DEFAULT 0,
  habitat jsonb NOT NULL DEFAULT '{}',
  fertility_class smallint,
  area_km2 real NOT NULL,
  centroid geometry(Point, 4326) NOT NULL,
  geom geometry(Polygon, 4326) NOT NULL,
  built_at timestamptz NOT NULL DEFAULT now(),
  source_version text NOT NULL
);
CREATE INDEX zones_geom_gix ON zones USING gist (geom);

CREATE TABLE zone_species (
  zone_id uuid REFERENCES zones ON DELETE CASCADE,
  species text REFERENCES species,
  suitability real CHECK (suitability BETWEEN 0 AND 1),
  rules_version text NOT NULL,
  PRIMARY KEY (zone_id, species)
);

CREATE TABLE ingest_runs (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  rows integer,
  error text,
  details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX ingest_runs_source_ix ON ingest_runs (source, started_at DESC);
