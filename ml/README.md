# ml/ — models (ML team: Remon · Asmer · Sayeem) — features 6.2, 6.4, 6.5, 6.6

**Status (2026-11-21): v2 contract.** **[API.md](API.md) is the exact contract** (every input and output with types, reason codes, rules, golden examples). This table is the summary.
All JSON is **snake_case**; `date` inputs are Europe/Helsinki dates; timestamps are UTC.

**Live service:** `https://picky-berry-assistant.onrender.com` (Render free plan: the first call after 15 idle minutes can take up to a minute).
**Every request** needs the header `X-API-Key: <key>` (ask Awais; never put it in the app or in git). Missing or wrong key → `401` with JSON `{"detail": string}`.
Other errors are `application/problem+json`: `{"type": string, "title": string, "status": integer, "detail": string}`.

| Part | Input (exact, with types) | Output (exact, with types) | Result | Code | Model file |
|---|---|---|---|---|---|
| Berry detector (6.4, 6.5) | `POST /api/v1/ml/detections`<br>Body: `multipart/form-data`<br>• `photo`: file, **JPEG** (resized, long side ≈ 1280 px, EXIF stripped; PNG/WebP also work; **not HEIC**), max **15 MB**, max 12,000 px per side, required<br>Query:<br>• `boxes`: boolean, default `true`<br>• `confidence`: number 0.05–0.95, default `0.25` | `200` JSON<br>• `counts`: `{bilberry, cloudberry, crowberry, lingonberry}` integers<br>• `total`: integer<br>• `image_size`: `{width: integer, height: integer}` px<br>• `model_version`: string<br>• `detections` (when `boxes=true`): `[{berry: string, confidence: number 0–1, box: [x1, y1, x2, y2] px}]`<br>Errors: `400` unreadable · `413` > 15 MB · `422` bad query. Photo is not stored. | **mAP50 0.80** on 312 unseen WildBe photos (bilberry 0.94 · cloudberry 0.91 · crowberry 0.79 · lingonberry 0.55) | [`berry_ml/detector.py`](berry_ml/detector.py) | `models/detector/v1/berry-yolo11n.onnx` (10.7 MB) |
| Zone scores, batch (6.2, 6.6) | `POST /api/v1/ml/zone-scores`<br>Body JSON:<br>• `date`: string `YYYY-MM-DD` (Helsinki), optional, default today<br>• `points`: array 1–5,000 of `{id: string, h3: string \| null, lat: number, lon: number}` (zone centroids)<br>Python: `ZoneGrid().score_points(points, date)` | `200` JSON `{date, model_version, rules_version, results: [...]}`, one result per point, same order:<br>• `id`, `h3`: echoed<br>• `lat`, `lon`: number<br>• `coverage`: `grid` \| `none`<br>• `cells`: integer<br>• `forest_share`: number 0–1 or `null`<br>• `scores`: `null` outside the grid (never 0), else species → `{score: integer 0–100, confidence: low\|medium\|high, ripeness: unripe\|ripening\|ripe\|past, explanation}`<br>Explanation `{model_version: string, rules_version: string, reasons: [string, 2–5 codes], inputs: {site_class, site_potential, window_start, window_end, year_index, forest_share, reports_used, evidence_weight}}` (codes and types: [API.md §3](API.md#3-explanation-object-and-reason-codes))<br>Errors: `422` | 3,500 points in **4.2 s**, 144 MB peak (60 × 60 km grid, 54,756 cells) | [`berry_ml/zones.py`](berry_ml/zones.py) `score_points` | `models/zones/v2/zone_grid.csv` (60 × 60 km) |
| Spot score (6.2, 6.6) | `GET /api/v1/ml/score`<br>Query: `lat`: number −90…90 · `lon`: number −180…180 · `date`: `YYYY-MM-DD`, optional | `200` JSON `{lat, lon, date, coverage: "grid", forest_share: number, scores: species → {score, confidence, ripeness, explanation}, model_version: string}`<br>Errors: `404` outside the grid · `422` | the 256 m cell under the point | `ZoneGrid.score_point` | same grid |
| Reports → score (6.4, 6.5) | `POST /api/v1/ml/score-updates`, one zone and one species<br>• `map_score`: integer 0–100, required<br>• `map_confidence`: `low`\|`medium`\|`high`, default `medium`<br>• `map_explanation`: explanation stored with the map score (send it)<br>• `reports`: array of `{created_at: UTC timestamp, rating: integer 1–5 \| null, photo_count: integer ≥ 0 \| null, reporter_trust: number 0–1 (default 0.5), visit_backed: boolean (default false)}`<br>• `now`: UTC timestamp, optional | `200` JSON<br>• `score`: integer 0–100<br>• `confidence`: string<br>• `s_model`: integer 0–100<br>• `s_feedback`: number 0–100 \| `null`<br>• `evidence_weight`: number ≥ 0<br>• `reports_used`: integer<br>• `explanation`: explanation with the reports code<br>Errors: `422` | weight = trust × recency × visit (1.0 / 0.5); photo only raises; map 55 + 1 visit-backed photo report (32 berries, trust 1.0) → 78 | [`berry_ml/reports.py`](berry_ml/reports.py) `update_zone_score` | — (rules v2) |
| Reporter trust (6.5) | `POST /api/v1/ml/trust-updates`<br>• `trust`: number 0–1<br>• `rating`: integer 1–5 \| `null`<br>• `photo_count`: integer ≥ 0 \| `null`<br>• `species`: species code<br>• `zone_consensus`: number 1–5 \| `null` (mean rating of OTHER users, this zone and species, last 7 days) | `200` JSON `{trust: number 0.05–1.0, rules_version: string}`<br>Errors: `422` | +0.05 if within 1 star of consensus or photo confirms the species; −0.10 if > 1 star off and no confirming photo; photo never lowers | `update_trust` | — |
| Season quality (6.6) | No HTTP endpoint (used inside the scores). Python: `YieldModel().year_index(area: str, berry: str, weather: dict \| None)` | number 0.5–1.5 (`1.0` = normal year); v1 always `1.0` | weather models did **not** beat a normal-year guess on hidden years | [`berry_ml/yield_model.py`](berry_ml/yield_model.py) | `models/yield/v1/yield_model.joblib` |
| App map (demo) | `GET /api/v1/ml/zones?species=&date=` | GeoJSON of the 50 pilot zones (app shape, snake_case) | all 50 pilot zones covered | `ZoneGrid.score_zones` | same grid |
| Health | `GET /api/v1/ml/health` | `{status: "ok", models: {detector, zone_grid, yield, score_rules}}` strings | — | [`service/app.py`](service/app.py) | — |

```bash
cd ml
pip install -r requirements.txt -r requirements-service.txt
pytest -q                                       # all tests, incl. golden examples
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
    zones/v2/              zone_grid.csv (60 x 60 km, 54,756 cells), zone_preview.png
    zones/v1/              the first 40 x 40 km grid, model_card.md
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
   class, site fertility, stand age; 16 m) for 60 × 60 km around Jyväskylä (v2, `HALF_M = 30000`; v1 was 40 × 40 km), classifies each pixel into
   herb-rich / mesic heath / sub-xeric / xeric / peatland / clear-cut / non-forest and summarises 256 m cells.
   The area is 34 % non-forest, 31 % mesic heath, 16 % herb-rich, 8 % sub-xeric, 6 % peatland, 4 % clear-cut.

## Known limits (be honest in the demo)

* Lingonberry detection is the weakest class (0.55) — v2 (Remon) retrains with a larger image size.
* The grid covers 60 × 60 km around Jyväskylä (the pilot area); zones outside it get `coverage: "none"` and no score.
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
