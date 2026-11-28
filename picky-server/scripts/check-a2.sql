WITH covered_zones AS (
  SELECT DISTINCT zone_id FROM zone_model_scores
)
SELECT z.zone_id, s.code AS species
FROM covered_zones z
CROSS JOIN species s
LEFT JOIN zone_scores_current c
  ON c.zone_id = z.zone_id
 AND c.species = s.code
WHERE c.zone_id IS NULL
ORDER BY z.zone_id, s.code;
