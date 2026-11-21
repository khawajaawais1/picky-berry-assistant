from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from service.app import app  # noqa: E402

EX = Path(__file__).resolve().parents[1] / "examples"
client = TestClient(app)


def test_health_lists_model_versions():
    r = client.get("/api/v1/ml/health")
    assert r.status_code == 200 and r.json()["models"]["detector"] == "berry-yolo11n-v1"


def test_detection_from_upload():
    r = client.post("/api/v1/ml/detections", files={"photo": ("t.jpg", (EX / "test_1.jpg").read_bytes(), "image/jpeg")})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == sum(body["counts"].values()) and "detections" in body


def test_unreadable_photo_is_a_problem_json_400():
    r = client.post("/api/v1/ml/detections", files={"photo": ("x.jpg", b"nope", "image/jpeg")})
    assert r.status_code == 400 and r.headers["content-type"].startswith("application/problem+json")
    assert "Traceback" not in r.text and "cannot identify" not in r.text  # no exception text leaks


def test_zones_payload():
    r = client.get("/api/v1/ml/zones", params={"species": "lingonberry", "date": "2026-08-20"})
    assert r.status_code == 200
    f = r.json()["features"][0]["properties"]
    assert f["species"] == "lingonberry" and f["score"] == f["scores"]["lingonberry"]["score"]


def test_bad_species_is_422_problem_json():
    r = client.get("/api/v1/ml/zones", params={"species": "strawberry"})
    assert r.status_code == 422 and r.json()["status"] == 422
    assert r.json()["detail"] == "Check these fields: species"


def test_score_update():
    report = {"created_at": "2026-07-25T12:00:00Z", "rating": 5, "photo_count": 32, "reporter_trust": 1.0,
              "visit_backed": True}
    body = {"map_score": 55, "map_confidence": "medium", "now": "2026-07-25T12:00:00Z", "reports": [report]}
    r = client.post("/api/v1/ml/score-updates", json=body)
    assert r.status_code == 200 and r.json()["score"] == 78 and r.json()["explanation"] is None


def test_camel_case_bodies_are_refused():
    r = client.post("/api/v1/ml/score-updates", json={"mapScore": 55})
    assert r.status_code == 422


def test_point_score_from_coordinates():
    r = client.get("/api/v1/ml/score", params={"lat": 62.30, "lon": 25.60, "date": "2026-07-25"})
    assert r.status_code == 200
    body = r.json()
    assert set(body["scores"]) == {"bilberry", "lingonberry", "cloudberry", "crowberry"}
    b = body["scores"]["bilberry"]
    assert b["ripeness"] == "ripe" and 0 < b["score"] <= 100 and len(b["explanation"]["reasons"]) >= 2
    assert body["date"] == "2026-07-25" and 0 <= body["forest_share"] <= 1


def test_point_outside_grid_is_404_problem_json():
    r = client.get("/api/v1/ml/score", params={"lat": 60.17, "lon": 24.94})  # Helsinki
    assert r.status_code == 404 and r.headers["content-type"].startswith("application/problem+json")


def test_point_bad_latitude_is_422():
    assert client.get("/api/v1/ml/score", params={"lat": 95, "lon": 25.6}).status_code == 422


def test_zone_scores_batch_echoes_ids_and_marks_outside():
    pts = [{"id": "z1", "h3": "881f1d4b6bfffff", "lat": 62.30, "lon": 25.60},
           {"id": "z2", "h3": "88089b1b0dfffff", "lat": 60.17, "lon": 24.94}]
    r = client.post("/api/v1/ml/zone-scores", json={"date": "2026-07-25", "points": pts})
    assert r.status_code == 200
    a, b = r.json()["results"]
    assert (a["id"], a["h3"], a["coverage"]) == ("z1", "881f1d4b6bfffff", "grid")
    assert a["scores"]["bilberry"]["explanation"]["inputs"]["window_start"] == "2026-07-10"
    assert (b["id"], b["coverage"], b["scores"], b["forest_share"]) == ("z2", "none", None, None)


def test_trust_update_endpoint():
    body = {"trust": 0.5, "rating": 4, "photo_count": None, "species": "bilberry", "zone_consensus": 3.5}
    r = client.post("/api/v1/ml/trust-updates", json=body)
    assert r.status_code == 200 and r.json()["trust"] == 0.55
