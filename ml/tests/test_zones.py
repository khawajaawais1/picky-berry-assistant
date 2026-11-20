import json
from pathlib import Path

import pytest

from berry_ml import SPECIES, ZoneGrid, ripeness

REPO = Path(__file__).resolve().parents[2]
APP_CONFIDENCE = {"low", "medium", "high"}            # app/src/features/discover/domain/zone-source.ts
APP_RIPENESS = {"unripe", "ripening", "ripe", "past"}


@pytest.fixture(scope="module")
def grid():
    return ZoneGrid()


@pytest.fixture(scope="module")
def pilot():
    return json.loads((REPO / "data/test_zones.geojson").read_text(encoding="utf-8"))


def test_every_pilot_zone_is_covered_and_valid_for_the_app(grid, pilot):
    out = grid.score_zones(pilot, date="2026-07-25")
    assert len(out["features"]) == len(pilot["features"])
    for f in out["features"]:
        p = f["properties"]
        assert p["coverage"] == "grid" and p["stub"] is False
        assert set(p["scores"]) == set(SPECIES)
        for s in p["scores"].values():
            assert isinstance(s["score"], int) and 0 <= s["score"] <= 100
            assert s["confidence"] in APP_CONFIDENCE and s["ripeness"] in APP_RIPENESS
        assert p["updated_at"].endswith("Z")
        assert f["geometry"] == next(g["geometry"] for g in pilot["features"] if g["properties"]["h3"] == p["h3"])


def test_scores_follow_the_season(grid, pilot):
    ring = pilot["features"][1]["geometry"]["coordinates"][0]
    july, nov = grid.score_zone(ring, "2026-07-25"), grid.score_zone(ring, "2026-11-20")
    assert july["bilberry"].score > 0 and july["bilberry"].ripeness == "ripe"
    assert all(s.score == 0 for s in nov.values())
    assert july["lingonberry"].ripeness in {"unripe", "ripening"}


def test_zone_outside_the_grid_is_reported_not_guessed(grid):
    helsinki = [[24.93, 60.16], [24.95, 60.16], [24.95, 60.17], [24.93, 60.17], [24.93, 60.16]]
    assert grid.score_zone(helsinki, "2026-07-25") is None


def test_ripening_shifts_north():
    assert ripeness("bilberry", 192, lat=62.0)[1] == "ripe"
    assert ripeness("bilberry", 192, lat=68.0)[1] == "ripening"   # 12 days later in Lapland


def test_perfect_forest_ripe_normal_year_is_80(grid):
    from berry_ml.zones import map_score
    assert map_score(1.0, 1.0, 1.0) == 80
