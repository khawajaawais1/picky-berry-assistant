# ml/ — models (ML team: Remon · Asmer · Sayeem) — features 6.2, 6.4, 6.5, 6.6

**Status (2026-11-21): v1 is built, tested and deployed; ready to wire into the backend.**
Building the endpoints? Start with **[API.md](API.md)**: endpoints, tables, jobs and who does what.

**Live service:** `https://picky-berry-assistant.onrender.com` (Render free plan: the first call after 15 idle minutes can take up to a minute).
**Every request** needs the header `X-API-Key: <key>` (ask Awais; never put it in the app or in git). Missing or wrong key → `401` with JSON `{"detail": string}`.
Other errors are `application/problem+json`: `{"type": string, "title": string, "status": integer, "detail": string}`.

| Part | Input (exact, with types) | Output (exact, with types) | Result | Code | Model file |
|---|---|---|---|---|---|
| Berry detector (6.4, 6.5) | `POST /api/v1/ml/detections`<br>Body: `multipart/form-data`<br>• `photo`: file, **JPEG or PNG** (WebP also works; **not HEIC** — convert iPhone photos to JPEG in the app), max **15 MB**, max 12,000 px per side, required<br>Query:<br>• `boxes`: boolean, default `true`<br>• `confidence`: number 0.05–0.95, default `0.25` | `200` `application/json`<br>• `counts`: object `{bilberry: integer, cloudberry: integer, crowberry: integer, lingonberry: integer}`<br>• `total`: integer<br>• `imageSize`: object `{width: integer, height: integer}` (pixels)<br>• `modelVersion`: string, e.g. `"berry-yolo11n-v1"`<br>• `detections` (only when `boxes=true`): array of `{berry: string (one of the 4 species), confidence: number 0–1, box: [x1, y1, x2, y2] numbers in pixels of the original photo}`<br>Errors: `400` unreadable photo · `413` larger than 15 MB · `422` bad query value | **mAP50 0.80** on 312 unseen WildBe photos (bilberry 0.94 · cloudberry 0.91 · crowberry 0.79 · lingonberry 0.55) | [`berry_ml/detector.py`](berry_ml/detector.py) | `models/detector/v1/berry-yolo11n.onnx` (10.7 MB) |
| Zone score (6.2, 6.6) | `GET /api/v1/ml/zones`<br>Query:<br>• `species`: string, one of `bilberry` \| `lingonberry` \| `cloudberry` \| `crowberry`, default `bilberry`<br>• `date`: string `YYYY-MM-DD`, default today<br>(Scores the 50 pilot zones of `data/test_zones.geojson`. Scoring the backend's own zones = Python `ZoneGrid.score_zones(feature_collection: dict, date: str, year_index: float)`; an HTTP endpoint for that is planned.) | `200` `application/geo+json`: a GeoJSON `FeatureCollection`; each `Feature` has<br>• `geometry`: `Polygon`, coordinates `[[[lon: number, lat: number], …]]`<br>• `properties`:<br>  `h3`: string · `name`: string · `species`: string<br>  `score`: integer 0–100<br>  `confidence`: string `low` \| `medium` \| `high`<br>  `ripeness`: string `unripe` \| `ripening` \| `ripe` \| `past`<br>  `scores`: object, species → `{score: integer, confidence: string, ripeness: string}` (all 4 species)<br>  `forest_share`: number 0–1 · `coverage`: string `grid` \| `none`<br>  `updated_at`: string ISO-8601 UTC · `score_date`: string `YYYY-MM-DD`<br>  `model`: string · `stub`: boolean (`false`)<br>(snake_case on purpose: it is the shape the app already reads)<br>Errors: `422` unknown species or bad date | all 50 pilot zones covered; forest mix from Luke MS-NFI 2023 | [`berry_ml/zones.py`](berry_ml/zones.py) | `models/zones/v1/zone_grid.csv` (2.9 MB) |
| Spot score (6.2, 6.6) | `GET /api/v1/ml/score`<br>Query:<br>• `lat`: number −90…90, WGS84 decimal degrees, required<br>• `lon`: number −180…180, WGS84 decimal degrees, required<br>• `date`: string `YYYY-MM-DD`, default today<br>Example: `?lat=62.30&lon=25.60&date=2026-07-25`<br>(Same model as `/zones`, for one spot: the 256 m forest cell at that point.) | `200` `application/json`<br>• `lat`: number · `lon`: number<br>• `date`: string `YYYY-MM-DD`<br>• `scores`: object, species → `{score: integer 0–100, confidence: string low\|medium\|high, ripeness: string unripe\|ripening\|ripe\|past}` (all 4 species)<br>• `forestShare`: number 0–1<br>• `modelVersion`: string<br>Errors: `404` point outside the 40 × 40 km grid · `422` bad `lat`/`lon`/`date` | example above → bilberry 52 (ripe), cloudberry 3, crowberry 11, lingonberry 0 (unripe) | [`berry_ml/zones.py`](berry_ml/zones.py) `ZoneGrid.score_point` | `models/zones/v1/zone_grid.csv` |
| Reports → score (6.4, 6.5) | `POST /api/v1/ml/score-updates`<br>Body: `application/json`, for **one zone and one species**<br>• `mapScore`: integer 0–100, required<br>• `mapConfidence`: string `low` \| `medium` \| `high`, default `medium`<br>• `reports`: array, default `[]`, each:<br>  `createdAt`: string ISO-8601 date-time, required<br>  `rating`: integer 1–5 or `null`<br>  `photoCount`: integer ≥ 0 or `null` (detector count for this species)<br>  `reporterTrust`: number 0–1, default `0.5`<br>• `now`: string ISO-8601 date-time or `null` (default: server time)<br>Trust update has no endpoint yet: Python `update_trust(trust: float, rating: int \| None, photo_count: int \| None) -> float` | `200` `application/json`<br>• `score`: integer 0–100 (new zone score)<br>• `confidence`: string `low` \| `medium` \| `high`<br>• `sModel`: integer 0–100 (the map score sent in)<br>• `sFeedback`: number 0–100 or `null` (reports only)<br>• `evidenceWeight`: number ≥ 0<br>• `reportsUsed`: integer (reports older than 28 days are ignored)<br>Errors: `422` field out of range (e.g. `rating` 9) | rule v1, map 55 + photo of 32 bilberries → 82 | [`berry_ml/reports.py`](berry_ml/reports.py) | — (rules) |
| Season quality (6.6) | No HTTP endpoint (used inside `/zones`). Python: `YieldModel().year_index(area: str, berry: str, weather: dict[str, float] \| None)`<br>• `area`: one of `Lappi` \| `Oulu-Kainuu` \| `Ita-Suomi` \| `Lansi-Suomi`<br>• `berry`: species string<br>• `weather`: optional weather features | `float` 0.5–1.5 (`1.0` = normal year); v1 always returns `1.0` | weather models did **not** beat a “normal year” guess on hidden years → v1 returns 1.0 | [`berry_ml/yield_model.py`](berry_ml/yield_model.py) | `models/yield/v1/yield_model.joblib` |
| Health | `GET /api/v1/ml/health`, no body | `200` `application/json`: `{status: string "ok", models: {detector: string, zoneGrid: string, yield: string, scoreRules: string}}` | — | [`service/app.py`](service/app.py) | — |

```bash
cd ml
pip install -r requirements.txt -r requirements-service.txt
pytest -q                                       # 27 tests
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
  service/app.py         ← reference FastAPI router: /api/v1/ml/{health,detections,zones,score,score-updates}
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
