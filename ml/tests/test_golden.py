"""The golden examples in tests/golden/ must match what the service returns today.

They are the backend's test fixtures (ml/API.md §golden examples). If a rule or the grid changes on
purpose, run `python scripts/make_golden.py` and commit the new files with the change.
"""
import json
from pathlib import Path

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from berry_ml import ZONE_GRID_VERSION  # noqa: E402
from service.app import app  # noqa: E402

GOLDEN = sorted((Path(__file__).parent / "golden").glob("*.json"))
client = TestClient(app)


def test_there_are_four_golden_files():
    assert {p.stem for p in GOLDEN} == {"zone_with_reports", "zone_without_reports", "off_season_zone",
                                        "batch_5_points"}


@pytest.mark.parametrize("path", GOLDEN, ids=lambda p: p.stem)
def test_golden(path):
    case = json.loads(path.read_text(encoding="utf-8"))
    if case["grid_version"] != ZONE_GRID_VERSION:
        pytest.skip(f"golden made on {case['grid_version']}, loaded grid is {ZONE_GRID_VERSION}")
    for step in case["steps"]:
        route = step["endpoint"].split(" ", 1)[1]
        r = client.post(route, json=step["request"])
        assert r.status_code == 200
        assert r.json() == step["response"], f"{path.name}: {step['endpoint']} changed"
