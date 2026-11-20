# Model card — zone-grid-jkl-v1 (+ rules-v1)

| | |
|---|---|
| Task | Map score 0–100 per zone × species × date (S_model), with confidence and ripeness |
| Data | Luke MS-NFI 2023 (CC BY 4.0), 16 m rasters: site main class (`paatyyppi`), site fertility (`kasvupaikka`), stand age (`ika`) |
| Grid | 24,336 cells of 256 m, 40 × 40 km around Jyväskylä (62.06–62.42 N, 25.36–26.13 E), each with the share of 7 forest types |
| Score | 100 × site potential × ripeness × year quality / 2 × 1.6 (perfect forest, ripe, normal year = 80) |
| Site potential | kg/ha per forest type from Finnish berry research (bilberry best on mesic heath, lingonberry on sub-xeric, cloudberry on peatland); crowberry is a coarse rule |
| Ripeness | windows at 62 N: bilberry 190–240, lingonberry 225–280, cloudberry 185–215, crowberry 200–260 (day of year); ±10 days = ripening/past at half weight; +2 days per degree north |
| Confidence | `low` if forest share < 30 %, out of season, or crowberry; else `medium`. `high` only from pickers' reports (`berry_ml.reports`) |
| Owner | Sayeem (grid, scoring), Asmer (forest and ripening rules) |

**Limits.** Rules, not a fitted model: there are no zone-level harvest labels yet. Pickers' reports are what
will make the scores learn.
