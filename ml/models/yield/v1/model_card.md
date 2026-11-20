# Model card — yield-baseline-v1 (season quality)

| | |
|---|---|
| Task | Year index per area × berry: how good this season is compared with a normal year (1.0) |
| Data | FMI daily weather 2000–2025 (16 regions, CC BY 4.0) → 15 features (growing degree days, frost nights at flowering, rain in May–August, …); Ruokavirasto Marsi harvest statistics 2013–2025 (4 areas, bilberry + lingonberry; 109 rows) |
| Method | Leave-one-year-out test of a frost rule, ridge regression and gradient boosting against the “normal year” baseline |
| Result (MAE of log index, lower is better) | bilberry: baseline **0.777**, frost rule 0.792, ridge 0.889, boosting 1.358 · lingonberry: baseline **0.854**, frost rule 0.895, ridge 0.982, boosting 1.246 |
| Shipped | the baseline: `year_index()` returns 1.0 for every area and berry |
| Owner | Asmer (features, labels), Sayeem (pipeline) |

**Why it did not work.** The statistics count berries **bought from pickers**, which depends on how many
pickers came (Covid 2020, the 2023 shortage), not only on the weather; 11 years × 4 areas is also very little
data. A future model should learn from the app's own reports instead.
