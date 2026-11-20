# ML → API guide for the dev team

**For:** Hassan (backend), Awais (data), Salman and Sabih (app)  ·  **From:** the ML team (Remon, Asmer, Sayeem)
**Status (2026-11-21):** the models are trained and committed, `berry_ml` is a tested Python package,
and [`service/app.py`](service/app.py) is a runnable reference of every endpoint below. What is left is
wiring it into `backend/` and the database. This guide is the step-by-step for that.

---

## 1. The idea in one picture

```
 App ──photo + rating──▶ POST /api/v1/feedback ──▶ feedback module ──▶ media (photo stored)
                                                        │
                                                        ▼ job: detect
                                              berry_ml.BerryDetector ──▶ photo_detections
                                                        │
                                                        ▼ job: rescore zone
                       berry_ml.update_zone_score (+ update_trust) ──▶ zone_scores ──▶ reporter_trust
                                                        ▲
 nightly job (05:00): berry_ml.ZoneGrid.score_zone ─────┘  (map score for every zone × species)

 App ◀── GET /api/v1/zones?species=… ◀── zones module reads zone_scores_current
```

* The ML never runs inside a request the app is waiting on, except the optional direct photo check (§4.3).
* **No endpoint takes the user's coordinates** ([app/SECURITY.md](../app/SECURITY.md) §10). The server scores
  its **own zones**; the app asks by species and zone id.
* Conventions from [docs/architecture.md](../docs/architecture.md) and [app/docs/api-contract.md](../app/docs/api-contract.md):
  `/api/v1`, camelCase JSON, `Authorization: Bearer <ID token>`, errors as RFC 9457 `application/problem+json`.

## 2. Install and try it (10 minutes)

```bash
cd ml
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-service.txt
pytest -q                                             # 24 tests, ~5 s
uvicorn service.app:app --reload --port 8100          # then open http://localhost:8100/docs
```

In the backend, add the runtime dependencies (numpy, pandas, pillow, onnxruntime, joblib — see
[requirements.txt](requirements.txt)) and make `ml/` importable, e.g. `PYTHONPATH=/app/ml` in the Docker
image, or `COPY ml/berry_ml ml/models /app/ml/` and set `BERRY_ML_MODELS_DIR`. No PyTorch, no Ultralytics.

Load the models **once** at startup (FastAPI lifespan) and keep them on `app.state`:

```python
from berry_ml import BerryDetector, ZoneGrid, YieldModel

@asynccontextmanager
async def lifespan(app):
    app.state.detector = BerryDetector()   # loads in < 0.1 s, ~35 MB RAM; ~70 ms per photo (2 CPUs)
    app.state.zone_grid = ZoneGrid()       # < 0.1 s, 24,336 cells
    app.state.yield_model = YieldModel()
    yield
```

## 3. Database (port into Alembic)

[`sql/010_ml_tables.sql`](sql/010_ml_tables.sql) holds the reference DDL, next to `data/sql/001_data_tables.sql`:

| Table / view | What | Written by | Read by |
|---|---|---|---|
| `zone_scores` | score, confidence, ripeness per zone × species × run (history kept) | nightly job, rescore job | zones, analytics |
| `zone_scores_current` | latest row per zone × species (the data checks' C8 already expects it) | — | `GET /zones` |
| `photo_detections` | what the detector found in each feedback photo | detect job | feedback, rescore job |
| `reporter_trust` | trust 0.05–1.0 per account, starts at 0.5. **Server-only** | rescore job | rescore job |

## 4. Endpoints to build

### 4.1 `GET /api/v1/zones?species={species}` — zones module (Hassan) · feature 6.2

Return the zones with scores **in the exact shape the app already reads** (`data/test_zones.geojson`,
validated by `app/src/features/discover/domain/zone-source.ts`). Only the data source changes:
`zones` + `zone_scores_current` instead of the stub file.

```jsonc
// 200  application/geo+json
{ "type": "FeatureCollection", "features": [ {
    "type": "Feature",
    "properties": {
      "h3": "8811250e25fffff", "name": "Laajavuori 2", "species": "bilberry",
      "score": 49, "confidence": "medium", "ripeness": "ripe",          // for ?species
      "scores": { "bilberry":    { "score": 49, "confidence": "medium", "ripeness": "ripe" },
                  "lingonberry": { "score": 0,  "confidence": "low",    "ripeness": "unripe" },
                  "cloudberry":  { "score": 1,  "confidence": "medium", "ripeness": "ripe" },
                  "crowberry":   { "score": 14, "confidence": "low",    "ripeness": "ripe" } },
      "updated_at": "2026-07-25T05:00:00Z",                              // computed_at
      "stub": false },
    "geometry": { "type": "Polygon", "coordinates": [[[25.70, 62.25], …]] } } ] }
```

Rules the app enforces (so the API must too): `score` is an **integer 0–100**; `confidence` ∈ `low|medium|high`;
`ripeness` ∈ `unripe|ripening|ripe|past`; `updated_at` is an ISO instant with `Z` or an offset.
Try it now: `GET http://localhost:8100/api/v1/ml/zones?species=bilberry&date=2026-07-25`, or use the
ready files [`out/pilot_zone_scores_2026-07-25.geojson`](out/) (bilberry season) and
`…_2026-08-20.geojson` (lingonberry season) as a drop-in for the stub.

### 4.2 `POST /api/v1/feedback` — feedback module (Hassan; photo upload: Sabih) · features 6.4, 6.5

The app already builds this report. The ML part happens **after** the response:

```jsonc
// request
{ "visitId": "…", "zoneId": "…", "species": "bilberry", "rating": 5, "photoId": "…" }   // photoId optional
// 201
{ "id": "…", "detection": { "status": "pending" } }      // "detection" only when a photo was attached
```

Server side, in order (an APScheduler/Postgres job, not inside the request):

```python
from berry_ml import Report, update_trust, update_zone_score

# 1) detect (only if photoId)
result = app.state.detector.detect(photo_bytes)          # raises InvalidImageError -> status "failed"
save_photo_detection(photo_id, status="done", counts=result.counts, total=result.total,
                     detections=result.to_dict()["detections"], model_version=result.model_version)

# 2) trust: only moves when the report has BOTH a rating and a photo
count = result.counts[species] if photo else None
trust = get_trust(account_id)                             # 0.5 if no row yet
set_trust(account_id, update_trust(trust, rating, count))

# 3) rescore this zone × species from its last 28 days of reports
current = zone_scores_current(zone_id, species)           # gives s_model + its confidence
reports = [Report(r.created_at, r.rating, r.photo_count, r.trust_at_report) for r in recent_reports(zone_id, species)]
new = update_zone_score(current.s_model, current.map_confidence, reports)
insert_zone_score(zone_id, species, **new, ...)           # keys: score, confidence, sModel, sFeedback, evidenceWeight, reportsUsed
```

The rule (in [`berry_ml/reports.py`](berry_ml/reports.py), all constants at the top): photo evidence =
min(100, 100 × count / 30), rating evidence = (rating − 1) × 25, weight = trust × freshness (half-life 7 days,
ignored after 28) × 1.5 for a photo, and `score = (S_model + W × S_feedback) / (1 + W)`. One fresh photo from
a fully trusted picker is 40 % map + 60 % photo: map 55 + 32 bilberries → **82**.

### 4.3 `GET /api/v1/feedback/{id}` — so the app can show “32 bilberries found”

```jsonc
// 200
{ "id": "…", "zoneId": "…", "species": "bilberry", "rating": 5,
  "detection": { "status": "done",                       // pending | done | failed
                 "counts": { "bilberry": 32, "cloudberry": 0, "crowberry": 0, "lingonberry": 0 },
                 "total": 32, "modelVersion": "berry-yolo11n-v1" } }
```

Only the report's author may read it (404 otherwise, same as the share rule). **Optional for the demo:** a
synchronous `POST /api/v1/photos/analyze` (multipart field `photo`, ≤ 15 MB) that returns the same
`detection` object immediately — that is exactly `POST /api/v1/ml/detections` in the reference service.

### 4.4 Errors (RFC 9457)

| Case | Status | `title` |
|---|---|---|
| photo is not a readable image (`InvalidImageError`) | 400 | Unreadable photo |
| photo larger than 15 MB, or more than 12,000 px a side | 413 / 400 | Photo too large |
| unknown `species`, rating not 1–5 | 422 | Invalid request |
| zone outside the forest grid (`score_zone` returns `None`) | — | not an error: keep the zone, omit `scores`, log it |

### 4.5 `GET /api/v1/ml/health` (internal, for monitoring)

`{"status":"ok","models":{"detector":"berry-yolo11n-v1","zoneGrid":"zone-grid-jkl-v1","yield":"yield-baseline-v1","scoreRules":"zone-score-rules-v1"}}`

## 5. Jobs

| Job | When | Code | Writes |
|---|---|---|---|
| `score_zones_daily` | every day 05:00 Europe/Helsinki | for each zone: `grid.score_zone(ring, date=today, year_index=yield_model.year_index(area, species))`, then apply recent reports with `update_zone_score` | `zone_scores` |
| `detect_photo` | when a feedback photo is stored | `detector.detect(bytes)` | `photo_detections` |
| `rescore_zone` | after `detect_photo`, or after a report without photo | `update_trust` + `update_zone_score` | `reporter_trust`, `zone_scores` |

`score_zone` takes the zone's exterior ring as `[[lon, lat], …]` (from `ST_AsGeoJSON(geom)`). A zone outside
the grid returns `None`: the grid covers **40 × 40 km around Jyväskylä** (62.06–62.42 N, 25.36–26.13 E).
For Awais's full 60 × 60 km pilot area, rebuild the grid with `HALF_M = 30000` in
[`zones/build_zone_grid.py`](zones/build_zone_grid.py) (runs on a laptop in ~3 min; Kaggle cannot reach the
map server).

## 6. Who does what

| Step | Owner | Done when |
|---|---|---|
| Port `sql/010_ml_tables.sql` to Alembic | Hassan | `alembic upgrade head` creates the 3 tables + view |
| Load models in the FastAPI lifespan | Hassan | `/api/v1/ml/health` answers |
| `score_zones_daily` job + `GET /zones` from `zone_scores_current` | Hassan, Awais | the app's map shows `stub: false` zones |
| Photo upload → `detect_photo` job | Sabih, Hassan | a feedback photo gets a `photo_detections` row |
| `rescore_zone` job | Hassan with Sayeem | the 82 example works end to end |
| Show `detection.counts` on the visit screen | Salman | “32 bilberries found” after a photo |
| Rebuild the grid for 60 × 60 km if needed | Sayeem | every zone has `coverage: grid` |
| Better lingonberry detection (v2 model) | Remon | mAP50 lingonberry > 0.55 on the same test split |
| Tune the report rule with test reports | Asmer | constants in `reports.py` reviewed |

Questions: ML team (Remon · Asmer · Sayeem).
