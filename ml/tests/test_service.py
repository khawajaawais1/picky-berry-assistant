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
    report = {"createdAt": "2026-07-25T12:00:00Z", "rating": 5, "photoCount": 32, "reporterTrust": 1.0}
    body = {"mapScore": 55, "mapConfidence": "medium", "now": "2026-07-25T12:00:00Z", "reports": [report]}
    r = client.post("/api/v1/ml/score-updates", json=body)
    assert r.status_code == 200 and r.json()["score"] == 82
