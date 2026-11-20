-- Up Migration

WITH base AS (
  SELECT zs.zone_id, zs.species, zs.suitability,
         abs(hashtext(zs.zone_id::text || zs.species)::bigint) AS h
  FROM zone_species zs
  WHERE zs.suitability > 0
), scored AS (
  SELECT zone_id, species, suitability,
         LEAST(100, GREATEST(0, round(100 * suitability * (0.4 + (h % 60) / 100.0))))::smallint AS score,
         (ARRAY['high','medium','low'])[1 + ((h / 7) % 3)::int] AS confidence,
         (ARRAY['unripe','ripening','ripe','ripe','past'])[1 + ((h / 11) % 5)::int] AS ripeness
  FROM base
)
INSERT INTO zone_scores_current
  (zone_id, species, score, confidence, ripeness, s_model, n_eff, band_width, explanation, computed_at)
SELECT zone_id, species, score, confidence, ripeness, score, 0, 50,
       jsonb_build_object(
         'version', 1,
         'inputs', jsonb_build_object('suitability', suitability),
         'reasons', jsonb_build_array(
           CASE ripeness WHEN 'ripe' THEN 'ripe_by_gdd' WHEN 'ripening' THEN 'ripening_by_gdd'
                         WHEN 'unripe' THEN 'unripe_by_gdd' ELSE 'past_by_gdd' END,
           'no_reports_baseline', 'good_habitat'),
         'model_version', 'seed-0'),
       now()
FROM scored
ON CONFLICT (species, zone_id) DO NOTHING;   -- never overwrite real scores

INSERT INTO zone_scores
  (zone_id, species, computed_at, score, confidence, ripeness, s_model, n_eff, band_width, explanation)
SELECT zone_id, species, computed_at, score, confidence, ripeness, s_model, n_eff, band_width, explanation
FROM zone_scores_current
WHERE explanation->>'model_version' = 'seed-0'
ON CONFLICT DO NOTHING;

-- Down Migration

DELETE FROM zone_scores_current WHERE explanation->>'model_version' = 'seed-0';
DELETE FROM zone_scores WHERE explanation->>'model_version' = 'seed-0';