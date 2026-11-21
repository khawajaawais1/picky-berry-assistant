"""Write the golden examples in tests/golden/ (exact JSON in and out of the ML endpoints).

    python scripts/make_golden.py      # run after any change to the grid or the score rules

Each file holds the HTTP request body and the exact response body for one case; the same JSON is
what the berry_ml functions take and return (ml/API.md). tests/test_golden.py checks them.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))
os.environ.pop("ML_API_KEY", None)
from fastapi.testclient import TestClient  # noqa: E402

from berry_ml import SCORE_RULES_VERSION, ZONE_GRID_VERSION  # noqa: E402
from service.app import app  # noqa: E402

OUT = ML / "tests" / "golden"
client = TestClient(app)
NOW = "2026-07-25T12:00:00Z"


def call(path: str, body: dict) -> dict:
    r = client.post(path, json=body)
    assert r.status_code == 200, (path, r.status_code, r.text)
    return r.json()


def zone_case(name: str, desc: str, point: dict, date: str, species: str, reports: list[dict]) -> dict:
    zs_in = {"date": date, "points": [point]}
    zs_out = call("/api/v1/ml/zone-scores", zs_in)
    s = zs_out["results"][0]["scores"][species]
    up_in = {"map_score": s["score"], "map_confidence": s["confidence"], "map_explanation": s["explanation"],
             "reports": reports, "now": NOW if date == "2026-07-25" else f"{date}T12:00:00Z"}
    up_out = call("/api/v1/ml/score-updates", up_in)
    return {"case": name, "description": desc, "grid_version": ZONE_GRID_VERSION, "rules_version": SCORE_RULES_VERSION,
            "species": species,
            "steps": [{"endpoint": "POST /api/v1/ml/zone-scores", "function": "ZoneGrid.score_points",
                       "request": zs_in, "response": zs_out},
                      {"endpoint": "POST /api/v1/ml/score-updates", "function": "update_zone_score",
                       "request": up_in, "response": up_out}]}


CASES = [
    zone_case("zone_with_reports", "Ripe bilberry zone with two reports: a visit-backed photo report today and "
              "a rating-only report from 3 days ago without a visit.",
              {"id": "zone-laajavuori", "h3": "881126d2c3fffff", "lat": 62.2595, "lon": 25.6880}, "2026-07-25",
              "bilberry",
              [{"created_at": "2026-07-25T09:30:00Z", "rating": 4, "photo_count": 26, "reporter_trust": 0.8,
                "visit_backed": True},
               {"created_at": "2026-07-22T15:00:00Z", "rating": 2, "photo_count": None, "reporter_trust": 0.5,
                "visit_backed": False}]),
    zone_case("zone_without_reports", "Lingonberry zone on 20 August with no reports: the map score is kept "
              "and the explanation says no_reports_baseline.",
              {"id": "zone-muurame", "h3": "881126d0b7fffff", "lat": 62.1300, "lon": 25.6700}, "2026-08-20",
              "lingonberry", []),
    zone_case("off_season_zone", "Bilberry in mid-January: score 0, ripeness unripe, reason off_season.",
              {"id": "zone-off-season", "h3": "881126d2d1fffff", "lat": 62.3000, "lon": 25.6000}, "2026-01-15",
              "bilberry", []),
]
BATCH_IN = {"date": "2026-08-01", "points": [
    {"id": "z1", "h3": "881126d2c3fffff", "lat": 62.2595, "lon": 25.6880},
    {"id": "z2", "h3": "881126d0b7fffff", "lat": 62.1300, "lon": 25.6700},
    {"id": "z3", "h3": "881126d2d1fffff", "lat": 62.3000, "lon": 25.6000},
    {"id": "z4", "h3": "8811268a6dfffff", "lat": 62.4700, "lon": 25.7500},
    {"id": "z5", "h3": "88089b1b0dfffff", "lat": 60.1700, "lon": 24.9400}]}
BATCH = {"case": "batch_5_points", "description": "Five zone centroids in one call. z4 is 25 km north of "
         "Jyvaskyla (inside the 60 x 60 km grid only), z5 is Helsinki (outside: coverage none, scores null).",
         "grid_version": ZONE_GRID_VERSION, "rules_version": SCORE_RULES_VERSION,
         "steps": [{"endpoint": "POST /api/v1/ml/zone-scores", "function": "ZoneGrid.score_points",
                    "request": BATCH_IN, "response": call("/api/v1/ml/zone-scores", BATCH_IN)}]}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for case in CASES + [BATCH]:
        path = OUT / f"{case['case']}.json"
        path.write_text(json.dumps(case, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", path.relative_to(ML))
