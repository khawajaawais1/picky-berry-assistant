# ml/ — models (ML team: Remon · Asmer · Sayeem) — features 6.2, 6.4, 6.5, 6.6

**Status (2026-11-21): v1 is built, tested and ready to wire into the backend.**
Building the endpoints? Start with **[API.md](API.md)**: endpoints, tables, jobs and who does what.

| Part | What it does | Result | Code | Model file |
|---|---|---|---|---|
| Berry detector (6.4, 6.5) | photo → berries per species, with boxes | **mAP50 0.80** on 312 unseen WildBe photos (bilberry 0.94 · cloudberry 0.91 · crowberry 0.79 · lingonberry 0.55) | [`berry_ml/detector.py`](berry_ml/detector.py) | `models/detector/v1/berry-yolo11n.onnx` (10.7 MB) |
| Zone score (6.2) | zone polygon + date → score 0–100, confidence, ripeness per species | all 50 pilot zones covered; forest mix from Luke MS-NFI 2023 | [`berry_ml/zones.py`](berry_ml/zones.py) | `models/zones/v1/zone_grid.csv` (2.9 MB) |
| Reports → score (6.4, 6.5) | pickers' ratings + photo counts update a zone's score; reporter trust | rule v1, map 55 + photo of 32 bilberries → 82 | [`berry_ml/reports.py`](berry_ml/reports.py) | — (rules) |
| Season quality (6.6) | weather → how good this year is (year index) | weather models did **not** beat a “normal year” guess on hidden years → v1 returns 1.0 | [`berry_ml/yield_model.py`](berry_ml/yield_model.py) | `models/yield/v1/yield_model.joblib` |

```bash
cd ml
pip install -r requirements.txt -r requirements-service.txt
pytest -q                                       # 24 tests
uvicorn service.app:app --reload --port 8100    # reference API → http://localhost:8100/docs
```

```python
from berry_ml import BerryDetector, ZoneGrid, Report, update_zone_score
BerryDetector().detect("examples/test_1.jpg").counts            # {'bilberry': 2, ..., 'lingonberry': 1}
ZoneGrid().score_zone(ring, date="2026-07-25")["bilberry"]      # ZoneScore(score=49, confidence='medium', ripeness='ripe', ...)
```

## Layout

```
ml/
  API.md                 ← the guide for the backend/app teams
  berry_ml/              ← the package the backend imports (numpy, pandas, pillow, onnxruntime, joblib)
    detector.py            YOLO11n via onnxruntime (no PyTorch/Ultralytics at serving time)
    zones.py               forest grid → zone scores, ripeness windows, site potential tables
    reports.py             report evidence, trust, freshness → updated score (all constants at the top)
    yield_model.py         season quality (year index)
    paths.py               model paths + versions (override with BERRY_ML_* env vars)
  service/app.py         ← reference FastAPI router: /api/v1/ml/{health,detections,zones,score-updates}
  sql/010_ml_tables.sql  ← zone_scores (+ zone_scores_current view), photo_detections, reporter_trust
  models/                ← versioned model files (v1)
    detector/v1/           berry-yolo11n.onnx, metrics.json, model_card.md, training curves
    zones/v1/              zone_grid.csv, zone_preview.png, model_card.md
    yield/v1/              yield_model.joblib, metrics.json, training_data.csv, model_card.md
  out/                   ← pilot_zone_scores_2026-07-25.geojson / _2026-08-20.geojson (drop-in for data/test_zones.geojson)
  scripts/build_zone_scores.py   score any zones GeoJSON for a date
  notebooks/             ← the Kaggle notebooks that produced v1 (detector, weather, harvest labels, yield, zone grid)
  detection/prepare_wildbe.py    WildBe parquet → YOLO folders (90/10 split by source image, seed 42)
  yield/parse_marsi.py           parses Ruokavirasto's Marsi harvest reports (2013–2025)
  zones/build_zone_grid.py       builds the forest grid from Luke MS-NFI 2023 (runs locally)
  examples/              ← 3 WildBe test photos used by the tests
  tests/                 ← detector (incl. parity with Ultralytics), zones (app payload rules), reports, service
```

## How v1 was made (reproducible)

1. **Detector** — `notebooks/BPA_Berry_Detection_YOLO.ipynb` on Kaggle (GPU T4): WildBe (HF `FBK-TeV/WildBe`,
   3,516 images, 18,468 boxes) → 2,852 train / 176 val / 312 test → YOLO11n, imgsz 640, 89 epochs (early stop,
   patience 20), seed 42 → ONNX export. `berry_ml.detector` re-implements the pre/post-processing in numpy and
   matches Ultralytics' counts exactly on the test photos (`tests/test_detector.py`).
2. **Season quality** — `BPA_Weather_Features` (FMI open data, 16 regions, 2000–2025) + `BPA_Harvest_Labels`
   (Marsi PDFs → `marsi_labels.csv`, 109 rows) → `BPA_Yield_Model`: gradient boosting, ridge and a frost rule
   tested leave-one-year-out against the normal-year baseline. Bilberry MAE: baseline 0.78, frost rule 0.79,
   ridge 0.89, boosting 1.36 → the baseline is shipped. Reason: the statistics count berries **bought**, which
   depends on picker numbers (Covid 2020, the 2023 shortage), not only on the weather.
3. **Zone grid** — `zones/build_zone_grid.py` (or `BPA_Zone_Grid.ipynb`) reads Luke MS-NFI 2023 (site main
   class, site fertility, stand age; 16 m) for 40 × 40 km around Jyväskylä, classifies each pixel into
   herb-rich / mesic heath / sub-xeric / xeric / peatland / clear-cut / non-forest and summarises 256 m cells.
   The area is 34 % non-forest, 31 % mesic heath, 16 % herb-rich, 8 % sub-xeric, 6 % peatland, 4 % clear-cut.

## Known limits (be honest in the demo)

* Lingonberry detection is the weakest class (0.55) — v2 (Remon) retrains with a larger image size.
* The grid covers 40 × 40 km around Jyväskylä; zones outside it get no ML score (rebuild with `HALF_M = 30000`
  for the 60 × 60 km pilot area).
* Site potentials (kg/ha per forest type) and ripening windows are literature-based rules, not fitted;
  crowberry's table is a coarse rule, so its confidence is always `low`.
* The report rule's constants are a first choice, to tune with real test reports (Asmer).

## Model files in git

The plan was object storage under `models/{name}/{version}/`. The team has no bucket yet, so v1 is committed
here (≈ 14 MB in total; the largest file is 10.7 MB, well under GitHub's limits). When MinIO/S3 is live, move
`models/` there and point `BERRY_ML_MODELS_DIR` at the mounted copy; nothing else changes.

**Licences:** WildBe CC BY-NC 4.0 and Ultralytics AGPL-3.0 (the detector was trained with it) — fine for the
course, see [../docs/licences.md](../docs/licences.md). Luke MS-NFI and FMI open data are CC BY 4.0
(© Natural Resources Institute Finland; Finnish Meteorological Institute). Harvest statistics: Ruokavirasto.
