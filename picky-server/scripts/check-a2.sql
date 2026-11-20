SELECT zs.zone_id, zs.species
FROM zone_species zs
LEFT JOIN zone_scores_current c
  ON c.zone_id = zs.zone_id
 AND c.species = zs.species
WHERE c.zone_id IS NULL;
