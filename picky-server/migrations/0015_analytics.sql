-- Up Migration

CREATE TABLE analytics_refresh (
  name text PRIMARY KEY,
  refreshed_at timestamptz NOT NULL
);
ALTER TABLE analytics_refresh ENABLE ROW LEVEL SECURITY;

CREATE MATERIALIZED VIEW mv_zone_daily AS
WITH v AS (
  SELECT zone_id,
         (started_at AT TIME ZONE 'Europe/Helsinki')::date AS day,
         count(*)::int AS visits,
         count(DISTINCT user_id)::int AS visitors,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_s) AS median_stay_s
  FROM visits
  WHERE status = 'accepted' AND zone_id IS NOT NULL AND user_id IS NOT NULL
  GROUP BY zone_id, day
), r AS (
  SELECT zone_id,
         (created_at AT TIME ZONE 'Europe/Helsinki')::date AS day,
         count(*)::int AS reports,
         count(DISTINCT user_id)::int AS reporters
  FROM reports
  WHERE cardinality(flags) = 0 AND user_id IS NOT NULL
  GROUP BY zone_id, day
)
SELECT COALESCE(v.zone_id, r.zone_id) AS zone_id,
       COALESCE(v.day, r.day) AS day,
       COALESCE(v.visits, 0) AS visits,
       COALESCE(v.visitors, 0) AS visitors,
       v.median_stay_s,
       COALESCE(r.reports, 0) AS reports,
       COALESCE(r.reporters, 0) AS reporters
FROM v
FULL OUTER JOIN r ON r.zone_id = v.zone_id AND r.day = v.day;

CREATE UNIQUE INDEX mv_zone_daily_uq ON mv_zone_daily (zone_id, day);

INSERT INTO analytics_refresh (name, refreshed_at)
VALUES ('mv_zone_daily', now());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON mv_zone_daily FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON mv_zone_daily FROM authenticated';
  END IF;
END $$;

-- Down Migration
DROP MATERIALIZED VIEW mv_zone_daily;
DROP TABLE analytics_refresh;
