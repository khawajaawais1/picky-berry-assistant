# Explanation contract, version 1

The scoring worker stores structured inputs and stable reason codes in the
`explanation` JSON column. It never stores localized sentences. The API owns
localization in one service so other backend features can reuse the same
translations.

```json
{
  "version": 1,
  "inputs": {
    "gdd_since_apr1": 812,
    "gdd_ripe": 780,
    "ndvi_anomaly": 0.04,
    "reports_7d": 4,
    "avg_rating_7d": 4.2,
    "n_eff": 2.6,
    "suitability": 0.9,
    "s_model": 66,
    "s_reports": 84,
    "alpha": 0.46
  },
  "reasons": ["ripe_by_gdd", "recent_reports_high", "good_habitat"],
  "model_version": "baseline-0.1"
}
```

Changing the structure or reason-code catalogue requires a version bump and
agreement with the scoring-worker owner. See the backend API brief's section
7.7 for the current Finnish and English templates.
