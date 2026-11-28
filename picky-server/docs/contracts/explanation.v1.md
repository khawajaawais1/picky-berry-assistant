# Explanation contract, version 1 (ML rules v2)

The ML scoring service returns this structured object. The backend stores it
without translating or renaming fields, then renders the reason codes in
Finnish or English. Localized sentences are never stored.

```json
{
  "model_version": "zone-grid-jkl60-v2",
  "rules_version": "zone-score-rules-v2",
  "reasons": ["in_ripe_window", "good_site", "no_reports_baseline"],
  "inputs": {
    "site_class": "good",
    "site_potential": 0.6,
    "window_start": "2026-07-10",
    "window_end": "2026-08-29",
    "year_index": 1.0,
    "forest_share": 0.984,
    "reports_used": 0,
    "evidence_weight": 0.0
  }
}
```

`model_version` and `rules_version` identify the map and report-scoring
versions. Reasons are stable codes from `ml/API.md` §3, not user-facing copy.
The backend owns Finnish and English templates. Changes to the JSON shape or
reason catalogue require coordination with the ML service and a contract
version update.
