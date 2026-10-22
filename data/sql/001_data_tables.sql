-- Reference DDL for the tables data/ writes (owner: Awais).
-- Hassan ports these into Alembic migrations; keep names/types identical.
-- Requires: postgis, pgcrypto, h3, h3_postgis (docker/postgres/init/01-extensions.sql).
-- Without h3-pg (D4 stub): change `h3 h3index` to `h3 text`.

-- D6 (stub until the ontology lands) ---------------------------------------
CREATE TABLE IF NOT EXISTS species (
  code        text PRIMARY KEY,
  latin       text NOT NULL,
  name_fi     text NOT NULL,
  name_en     text NOT NULL,
  iri         text,
  colour      text,
  season_start_doy smallint,
  season_end_doy   smallint
);

-- D10 – zones ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  h3               h3index NOT NULL UNIQUE,
  h3_parent6       h3index NOT NULL,               -- zoomed-out grouping (GET /zones zoom < 10)
  name             text,
  forest_type      text NOT NULL,                  -- dominant habitat class (see zone_species_rules.yaml)
  forest_fraction  real NOT NULL CHECK (forest_fraction BETWEEN 0 AND 1),
  mire_fraction    real NOT NULL CHECK (mire_fraction BETWEEN 0 AND 1),
  habitat          jsonb NOT NULL DEFAULT '{}',    -- {"forest_unknown":0.62,"mire":0.21,...}
  fertility_class  smallint,                       -- MS-NFI 1–6, null if unknown
  area_km2         real NOT NULL,
  centroid         geometry(Point, 4326) NOT NULL,
  geom             geometry(Polygon, 4326) NOT NULL,
  built_at         timestamptz NOT NULL DEFAULT now(),
  source_version   text NOT NULL                   -- e.g. "osm-geofabrik-2026-10-20/h3r8/v1"
);
CREATE INDEX IF NOT EXISTS zones_geom_gix ON zones USING gist (geom);
CREATE INDEX IF NOT EXISTS zones_h3_ix    ON zones (h3);
CREATE INDEX IF NOT EXISTS zones_parent_ix ON zones (h3_parent6);

-- D11 – which species can grow where ----------------------------------------
CREATE TABLE IF NOT EXISTS zone_species (
  zone_id     uuid REFERENCES zones ON DELETE CASCADE,
  species     text REFERENCES species,
  suitability real CHECK (suitability BETWEEN 0 AND 1),
  rules_version text NOT NULL,
  PRIMARY KEY (zone_id, species)
);

-- Pipeline bookkeeping (architecture doc §7/§10) ----------------------------
CREATE TABLE IF NOT EXISTS ingest_runs (
  id          bigserial PRIMARY KEY,
  source      text NOT NULL,            -- zones | zone_species | weather | ndvi | …
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL,            -- running | ok | failed
  rows        integer,
  error       text,
  details     jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ingest_runs_source_ix ON ingest_runs (source, started_at DESC);

-- D13 – weather: stations + daily obs; per-zone values come from IDW weights --
CREATE TABLE IF NOT EXISTS weather_stations (
  fmisid   integer PRIMARY KEY,
  name     text NOT NULL,
  geom     geometry(Point, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_station_daily (
  fmisid      integer REFERENCES weather_stations,
  date        date NOT NULL,
  tmean_c     real,
  tmin_c      real,
  tmax_c      real,
  precip_mm   real,
  snow_cm     real,
  gdd_day     real,          -- max(0, tmean - 5)
  gdd_since_apr1 real,       -- cumulative from 1 April of the same year, 0 before
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fmisid, date)
);

CREATE TABLE IF NOT EXISTS zone_weather_weights (
  zone_id  uuid REFERENCES zones ON DELETE CASCADE,
  fmisid   integer REFERENCES weather_stations,
  weight   real NOT NULL CHECK (weight > 0 AND weight <= 1),   -- IDW, sums to 1 per zone
  PRIMARY KEY (zone_id, fmisid)
);

-- What scoring reads: weather per zone × day (IDW over stations that reported that day).
CREATE OR REPLACE VIEW weather_daily AS
SELECT w.zone_id,
       d.date,
       sum(w.weight * d.tmean_c)        / nullif(sum(w.weight) FILTER (WHERE d.tmean_c IS NOT NULL), 0) AS tmean_c,
       sum(w.weight * d.precip_mm)      / nullif(sum(w.weight) FILTER (WHERE d.precip_mm IS NOT NULL), 0) AS precip_mm,
       sum(w.weight * d.gdd_since_apr1) / nullif(sum(w.weight) FILTER (WHERE d.gdd_since_apr1 IS NOT NULL), 0) AS gdd_since_apr1,
       max(d.ingested_at) AS ingested_at
FROM zone_weather_weights w
JOIN weather_station_daily d USING (fmisid)
GROUP BY w.zone_id, d.date;

-- D14 – NDVI per zone + anomaly ---------------------------------------------
CREATE TABLE IF NOT EXISTS ndvi_obs (
  zone_id       uuid REFERENCES zones ON DELETE CASCADE,
  period_start  date NOT NULL,          -- 10-day composite window start
  period_end    date NOT NULL,
  ndvi_mean     real,
  valid_fraction real,                  -- share of cloud-free pixels used
  ndvi_baseline real,                   -- 2021–2025 mean for the same window
  ndvi_anomaly  real,                   -- ndvi_mean - ndvi_baseline (0 when missing)
  ingested_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (zone_id, period_start)
);

-- Latest NDVI anomaly per zone (scoring reads this; missing → 0).
CREATE OR REPLACE VIEW ndvi_zone_latest AS
SELECT DISTINCT ON (zone_id) zone_id, period_start, ndvi_mean, ndvi_anomaly
FROM ndvi_obs
WHERE ndvi_anomaly IS NOT NULL
ORDER BY zone_id, period_start DESC;
