# ML API contract (v2): what every function and endpoint takes and returns

**For:** Awais (wraps `berry_ml` in HTTP on Render), Hassan (picky-server calls those APIs), Salman and Sabih (app)
**From:** the ML team (Remon, Asmer, Sayeem) · **Rules version:** `zone-score-rules-v2` · **Updated:** 2026-11-21

This file is the contract. Every input and output below is exact, with its type. The reference
implementation is [`service/app.py`](service/app.py): run it and open `/docs` to try any call. The
golden examples in [`tests/golden/`](tests/golden/) are exact requests and responses to use as test fixtures.

```
 App ──▶ picky-server (NestJS, Vercel) ──X-API-Key──▶ ML API (Render) ──▶ berry_ml (this folder)
                 │  stores scores, explanations,                   stateless: no database,
                 │  reports, trust                                 no photos kept
```

## 1. Conventions (apply to everything below)

| Rule | Value |
|---|---|
| JSON field names | **snake_case** everywhere, in and out (same as picky-server). camelCase bodies are refused (422). |
| `date` inputs | Europe/Helsinki calendar date, `YYYY-MM-DD`. Default when omitted: today in Finland. |
| Timestamps | UTC, ISO-8601 with `Z`, e.g. `2026-07-25T09:30:00Z`. A timestamp without a zone is read as UTC. |
| Coordinates | WGS84 decimal degrees, `lat` −90…90, `lon` −180…180. |
| Scores | integer 0–100. |
| `confidence` | `low` \| `medium` \| `high` |
| `ripeness` | `unripe` \| `ripening` \| `ripe` \| `past` |
| Species codes | `bilberry` \| `lingonberry` \| `cloudberry` \| `crowberry` (same as the ontology and app) |
| Outside the forest grid | `coverage: "none"` and `scores: null`, **never 0** |
| Auth | header `X-API-Key: <key>` on every call. Missing/wrong → `401` `{"detail": string}` |
| Other errors | `application/problem+json`: `{"type": string, "title": string, "status": integer, "detail": string}` |
| Photos | the app sends a resized JPEG (long side ≈ 1280 px, EXIF stripped, HEIC converted). PNG and WebP also work. Max 15 MB, max 12,000 px a side. Nothing is stored; only counts come back. |
| Grid coverage | v2: 60 × 60 km around Jyväskylä (`zone-grid-jkl60-v2`). v1 was 40 × 40 km. |

## 2. Functions and endpoints

Each block gives the Python function in `berry_ml`, the HTTP route in the reference service, the exact
input, the exact output and the errors. The HTTP body is the same JSON the function takes or returns.

### 2.1 Health: `GET /api/v1/ml/health`

* In: nothing.
* Out `200`: `{"status": "ok", "models": {"detector": string, "zone_grid": string, "yield": string, "score_rules": string}}`
  e.g. `{"detector": "berry-yolo11n-v1", "zone_grid": "zone-grid-jkl60-v2", "yield": "yield-baseline-v1", "score_rules": "zone-score-rules-v2"}`.

### 2.2 Berry detector: `BerryDetector().detect(image, conf=0.25)` · `POST /api/v1/ml/detections`

| In | Type | Notes |
|---|---|---|
| `photo` | multipart file field | JPEG (preferred), PNG or WebP; ≤ 15 MB; ≤ 12,000 px a side. Python: `bytes`, path, PIL image or RGB numpy array |
| `boxes` (query) | boolean, default `true` | include every detection's box |
| `confidence` (query) | number 0.05–0.95, default `0.25` | detection threshold |

| Out `200` | Type |
|---|---|
| `counts` | object `{bilberry: integer, cloudberry: integer, crowberry: integer, lingonberry: integer}` |
| `total` | integer (sum of counts) |
| `image_size` | object `{width: integer, height: integer}`, pixels |
| `model_version` | string, e.g. `"berry-yolo11n-v1"` |
| `detections` (only when `boxes=true`) | array of `{berry: string, confidence: number 0–1, box: [x1, y1, x2, y2] numbers, pixels of the sent photo}` |

Errors: `400` unreadable photo · `413` larger than 15 MB · `422` bad query value.
Python: `result.to_dict(include_boxes=True)` gives this exact object; `result.counts[species]` is the
`photo_count` used in 2.5 and 2.6.

### 2.3 Score many zones: `ZoneGrid().score_points(points, date=None, year_index=1.0, radius_m=400)` · `POST /api/v1/ml/zone-scores`

The backend's own zones, one centroid each, in one call (the nightly job). Cells within `radius_m`
(400 m ≈ an H3 res-8 hexagon) of each centroid are averaged; if none is that close, the nearest cell
within 185 m is used; otherwise the point is outside the grid.

| In (body) | Type | Notes |
|---|---|---|
| `date` | string `YYYY-MM-DD` or omitted | Helsinki date the scores are for |
| `points` | array, 1–5,000 items | |
| `points[].id` | string, required | the zone's id, echoed back |
| `points[].h3` | string or `null` | echoed back unchanged |
| `points[].lat`, `points[].lon` | number | zone centroid, WGS84 |

Python: `year_index` is a number or `{species: number}` (the service passes `YieldModel` values, 1.0 in v1).

| Out `200` | Type |
|---|---|
| `date` | string `YYYY-MM-DD` |
| `model_version` | string (grid version) |
| `rules_version` | string |
| `results` | array, same order and length as `points` |
| `results[].id`, `results[].h3` | echoed from the input |
| `results[].lat`, `results[].lon` | number |
| `results[].coverage` | `"grid"` or `"none"` |
| `results[].cells` | integer, grid cells averaged (0 when outside) |
| `results[].forest_share` | number 0–1, or `null` when outside |
| `results[].scores` | `null` when outside, else object species → `{score: integer 0–100, confidence: string, ripeness: string, explanation: Explanation}` (all 4 species) |

Errors: `422` empty `points`, more than 5,000, or bad lat/lon/date.
Performance (3,500 points, 60 × 60 km-sized grid of 54,756 cells, 1 CPU): **3.4 s, 144 MB peak** (load 0.1 s).
Re-run with `python scripts/benchmark_score_points.py`.

### 2.4 Score one spot: `ZoneGrid().score_point(lat, lon, date=None, year_index=1.0)` · `GET /api/v1/ml/score`

Scores the 256 m cell under one point (no averaging).

| In (query) | Type |
|---|---|
| `lat` | number −90…90, required |
| `lon` | number −180…180, required |
| `date` | string `YYYY-MM-DD`, optional |

Out `200`: `{"lat": number, "lon": number, "date": string, "coverage": "grid", "forest_share": number 0–1,
"scores": {species: {score, confidence, ripeness, explanation}}, "model_version": string}`.
Errors: `404` outside the grid (problem+json) · `422` bad lat/lon/date. Python returns `None` outside
the grid, else `{species: ZoneScore}`; `ZoneScore.to_payload(explanation=True)` is the per-species object.

### 2.5 Reports → new zone score: `update_zone_score(map_score, map_confidence, reports, now=None, map_explanation=None)` · `POST /api/v1/ml/score-updates`

For ONE zone and ONE species, after a report arrives. Pass all its reports from the last 28 days.

| In (body) | Type | Notes |
|---|---|---|
| `map_score` | integer 0–100, required | the map score (`score` from 2.3 / `s_model` stored) |
| `map_confidence` | `low`\|`medium`\|`high`, default `medium` | the map's confidence |
| `map_explanation` | Explanation or `null` | the explanation stored with the map score. **Always send it**: without it `explanation` comes back `null` |
| `reports` | array, default `[]` | |
| `reports[].created_at` | timestamp (UTC), required | |
| `reports[].rating` | integer 1–5 or `null` | |
| `reports[].photo_count` | integer ≥ 0 or `null` | detector count for THIS species; `null` = no photo |
| `reports[].reporter_trust` | number 0–1, default `0.5` | the reporter's trust when scoring |
| `reports[].visit_backed` | boolean, default `false` | the report is linked to a detected visit |
| `now` | timestamp (UTC) or `null` | default: server time |

| Out `200` | Type | Store in picky-server's `zone_scores_current` as |
|---|---|---|
| `score` | integer 0–100 | `score` |
| `confidence` | string | `confidence` |
| `s_model` | integer 0–100 (the `map_score` sent) | `s_model` |
| `s_feedback` | number 0–100 (1 decimal) or `null` when no report counted | `s_reports` |
| `evidence_weight` | number ≥ 0 (3 decimals) | `n_eff` |
| `reports_used` | integer | in `explanation.inputs.reports_used` |
| `explanation` | Explanation or `null` | `explanation` |

Errors: `422` a value out of range (e.g. `rating` 9) or an unknown field.

### 2.6 Trust after a report: `update_trust(trust, rating, photo_count, species, zone_consensus)` · `POST /api/v1/ml/trust-updates`

| In | Type | Notes |
|---|---|---|
| `trust` | number 0–1, required | current trust (new users: 0.5) |
| `rating` | integer 1–5 or `null` | the report's rating |
| `photo_count` | integer ≥ 0 or `null` | detector count for the reported species; `null` = no photo |
| `species` | species code, required | the reported species |
| `zone_consensus` | number 1–5 or `null` | mean rating of **other** users' reports for this zone and species in the last 7 days; `null` if none |

Out `200`: `{"trust": number 0.05–1.0 (3 decimals), "rules_version": string}`. Python returns the number.
Errors: `422` (HTTP) / `ValueError` (Python) for an unknown species or a rating outside 1–5. Rule: §4.

### 2.7 Season quality: `YieldModel().year_index(area, berry, weather=None)` (no endpoint)

`area` ∈ `Lappi | Oulu-Kainuu | Ita-Suomi | Lansi-Suomi`, `berry` a species code → number 0.5–1.5
(1.0 = normal year). v1 always returns 1.0: no weather model beat the normal-year baseline.

### 2.8 App GeoJSON for the 50 pilot zones: `ZoneGrid().score_zones(fc, date, year_index)` · `GET /api/v1/ml/zones?species=&date=`

Kept for the app's demo map (`data/test_zones.geojson` shape, snake_case properties). New code should
use 2.3. Per-species objects here have no `explanation`.

## 3. Explanation object and reason codes

Every score result carries `explanation`, the object picky-server stores in `zone_scores_current.explanation`
and renders as sentences in Finnish and English:

```jsonc
{ "model_version": "zone-grid-jkl60-v2",      // string: the grid the map score came from
  "rules_version": "zone-score-rules-v2",     // string: the score rules
  "reasons": ["in_ripe_window", "good_site", "no_reports_baseline"],   // 2–5 codes, most important first
  "inputs": {
    "site_class": "good",            // good | moderate | poor
    "site_potential": 0.6,           // number 0–1 (site_class: >= 0.60 good, >= 0.30 moderate, else poor)
    "window_start": "2026-07-10",    // first ripe day this year at this latitude, YYYY-MM-DD
    "window_end": "2026-08-29",      // last ripe day
    "year_index": 1.0,               // season quality, 1.0 = normal year
    "forest_share": 0.984,           // share of forest land around the zone, 0–1
    "reports_used": 0,               // reports that counted (0 for a map-only score)
    "evidence_weight": 0.0 } }       // total report weight W (0 for a map-only score)
```

A result always has **one season code, one site code and one reports code** (so at least 3), plus the
optional ones:

| Code | Group | Meaning (one line) |
|---|---|---|
| `in_ripe_window` | season | The date is inside this species' ripening window here. |
| `ripening_window` | season | Ripening starts within 10 days. |
| `before_window` | season | Ripening starts in 11–60 days. |
| `past_window` | season | The window ended up to 10 days ago; few berries left. |
| `off_season` | season | More than 60 days before the window or more than 10 days after it. |
| `good_site` | site | The forest types here suit this species well (site potential ≥ 0.60). |
| `moderate_site` | site | Fair forest types for this species (0.30–0.60). |
| `poor_site` | site | Poor forest types for this species (< 0.30). |
| `no_reports_baseline` | reports | No report in the last 28 days counted, so the score is the map estimate. |
| `recent_reports_high` | reports | Recent reports rate the zone at or above the map estimate (`s_feedback` ≥ `s_model`). |
| `recent_reports_low` | reports | Recent reports rate the zone below the map estimate. |
| `photo_confirms_species` | optional | At least one counted report's photo showed this species. |
| `low_confidence_species` | optional | Confidence is capped at low: crowberry's yield table is a coarse rule, or the zone is under 30 % forest. |

## 4. Report and trust rules (`berry_ml/reports.py`, constants at the top)

**Evidence of one report (0–100):** rating only: `(rating − 1) × 25`. Photo only: `min(100, 100 × photo_count / 30)`,
but a count of 0 is not evidence (leaf or unripe photos give 0). Both: `max(rating evidence, photo evidence)`,
so **a photo can only raise a report**.

**Weight of one report:** `w = trust × recency × visit`, where `recency = 0.5 ^ (age_days / 7)` (0 after 28 days)
and `visit = 1.0` with a detected visit (`visit_backed`), `0.5` without.

**New score:** `W = Σ w`, `s_feedback = Σ(w × evidence) / W`, `score = round((1.0 × s_model + W × s_feedback) / (1.0 + W))`.
Confidence: `high` if `W ≥ 2` and the newest counted report is ≤ 7 days old; at least `medium` if `W ≥ 0.5`;
otherwise the map's confidence. Example: map 55 + one fresh visit-backed report, trust 1.0, 32 bilberries
→ W = 1.0 → **78**.

**Trust (0.05–1.0, start 0.5):** a report **agrees** if `|rating − zone_consensus| ≤ 1` **or** the detector found the
reported species (`photo_count > 0`) → **+0.05**. It **disagrees** if `|rating − zone_consensus| > 1` and the photo
does not confirm the species → **−0.10**. Anything else (no consensus and no confirming photo) → no change.
A photo can only raise trust, never lower it.

## 5. What the backend does with these (flows)

1. **Nightly (e.g. 05:00 Helsinki):** send all zones as `points` to 2.3 (≤ 5,000 per call). Store each
   zone × species `score`, `confidence`, `ripeness`, `s_model = score`, `explanation`. Zones with
   `coverage: "none"` get no score row (never 0).
2. **On a report:** if it has a photo, call 2.2 and keep only `counts`. Call 2.6 with the user's trust and
   the zone consensus; save the new trust. Call 2.5 with the stored map score, map confidence and map
   explanation plus the zone × species reports of the last 28 days (each with the reporter's trust and
   `visit_backed = visit_id is not null`). Store the result.
3. **Zone card "why":** render `explanation.reasons` with your templates, filling numbers from `explanation.inputs`.

## 6. Golden examples (test fixtures)

[`tests/golden/`](tests/golden/), each with `request` and `response` for every step (made by
`python scripts/make_golden.py`, checked by `tests/test_golden.py`):

| File | Case |
|---|---|
| `zone_with_reports.json` | ripe bilberry zone: 2.3, then 2.5 with a visit-backed photo report and an older rating-only report |
| `zone_without_reports.json` | lingonberry zone with no reports: the map score is kept, `no_reports_baseline` |
| `off_season_zone.json` | bilberry in January: score 0, `off_season` |
| `batch_5_points.json` | 5 centroids in one call; one 25 km north (inside the 60 × 60 km grid), one in Helsinki (`coverage: "none"`) |

The `h3` values in the examples are placeholders; they are only echoed back.

## 7. Run it

```bash
cd ml
pip install -r requirements.txt -r requirements-service.txt
pytest -q                                          # all tests incl. the golden examples
uvicorn service.app:app --reload --port 8100       # http://localhost:8100/docs
```

Live reference service: `https://picky-berry-assistant.onrender.com` (free plan: the first call after 15 idle
minutes can take up to a minute). Model files: `models/` (detector v1, zone grid v2, yield v1).
