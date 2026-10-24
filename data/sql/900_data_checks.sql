-- Data checks (owner: Awais). Every query must return 0 rows / true. Run: picky-data check --db
-- Pilot bbox in EPSG:3067 must match data/config/pilot_area.yaml.

-- C1: H3 ids unique (also enforced by UNIQUE)
SELECT h3, count(*) FROM zones GROUP BY h3 HAVING count(*) > 1;

-- C2: no zone outside the pilot bbox (centroid test, 1 cell of tolerance)
SELECT id FROM zones
WHERE NOT ST_Intersects(
  ST_Transform(centroid, 3067),
  ST_Expand(ST_MakeEnvelope(405000, 6872000, 465000, 6932000, 3067), 1000));

-- C3: valid, non-empty geometry
SELECT id FROM zones WHERE NOT ST_IsValid(geom) OR ST_IsEmpty(geom);

-- C4: every zone has at least one suitable species
SELECT z.id FROM zones z LEFT JOIN zone_species s ON s.zone_id = z.id WHERE s.zone_id IS NULL;

-- C5: IDW weights sum to 1 per zone
SELECT zone_id, sum(weight) FROM zone_weather_weights GROUP BY zone_id
HAVING abs(sum(weight) - 1) > 0.001;

-- C6: every zone has weather weights (only once weather has been loaded)
SELECT z.id FROM zones z LEFT JOIN zone_weather_weights w ON w.zone_id = z.id
WHERE w.zone_id IS NULL AND EXISTS (SELECT 1 FROM zone_weather_weights);

-- C7: GDD never decreases within a season at a station
SELECT fmisid, date FROM (
  SELECT fmisid, date, gdd_since_apr1,
         lag(gdd_since_apr1) OVER (PARTITION BY fmisid, extract(year FROM date) ORDER BY date) AS prev
  FROM weather_station_daily) t
WHERE gdd_since_apr1 < prev - 1e-6;

-- C8 (acceptance A2, after Remon's scoring has run): every zone × allowed species has a score today
-- SELECT zs.zone_id, zs.species FROM zone_species zs
-- LEFT JOIN zone_scores_current c USING (zone_id, species)
-- WHERE c.zone_id IS NULL OR c.computed_at::date < current_date;
