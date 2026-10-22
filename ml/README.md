# ml/ — models (owner: Remon) — features 6.2, 6.4, 6.5, 6.6

Two models, trained offline on free GPUs (Colab / Kaggle / JYU), shipped as versioned files.
Design: architecture doc §9.

| Model | Purpose | Data | Output | Target |
|-------|---------|------|--------|--------|
| YOLO11n (→ 11s if needed) | Berry species + count in feedback photos (6.4, 6.5) | WildBe (HF `FBK-TeV/WildBe`, 3,516 images, 4 classes) + team phone photos | ONNX (opset 17) + model_card.md | mAP@50 ≥ 0.6 on WildBe test |
| Phenology baseline v1 | S_model + ripeness until labels exist (6.2) | GDD, NDVI anomaly, season window, suitability | `zone_scores_current` | Map never empty |
| XGBoost quantile (0.1/0.5/0.9) | Expected rating next 7 days per zone × species (6.6) | Awais's tables (`weather_daily`, `ndvi_zone_latest`, `zone_features`) + reports | median = S_model, band = confidence input | Beats the baseline on a time-based split |

## Suggested layout
```
ml/
  detection/   # YOLO training notebooks/scripts, export to ONNX
  yield/       # feature building, XGBoost training, evaluation vs. baseline
  eval.py      # fixed test split + metric thresholds (runs in CI)
  reports/     # metrics per run
  model_cards/
```
Model files go to object storage under `models/{name}/{version}/` — never into git.

**Licences:** WildBe is CC BY-NC 4.0, Ultralytics is AGPL-3.0 — fine for the course, see
[../docs/licences.md](../docs/licences.md).
