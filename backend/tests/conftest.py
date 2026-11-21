"""Shared fixtures for the backend's tests.

The snapshot rows mirror what the reasoning job will read: one row per zone × species,
joined from `zones`, `zone_scores_current` and `zone_species` (ml/API.md §3,
docs/data-contract.md). They are the same four cases the ontology's own fixture graph
carries, so the loader is tested on the shape the database will hand it.
"""

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
ONTOLOGY_DIR = REPO_ROOT / "ontology"

ZONE_A = "11111111-1111-4111-8111-111111111111"
ZONE_B = "22222222-2222-4222-8222-222222222222"
ZONE_C = "33333333-3333-4333-8333-333333333333"
ZONE_D = "44444444-4444-4444-8444-444444444444"

SNAPSHOT_ROWS = [
    {  # an alert: ripe, above bilberry's 0.30 minimum, no separate place name
        "zone_id": ZONE_A,
        "zone_name": "Laajavuori 18",
        "place": None,
        "species": "bilberry",
        "score": 82,
        "confidence": "high",
        "ripeness": "ripe",
        "suitability": 0.70,
    },
    {  # an alert with a place to print
        "zone_id": ZONE_B,
        "zone_name": "07",
        "place": "Killerjärvi",
        "species": "lingonberry",
        "score": 55,
        "confidence": "medium",
        "ripeness": "ripe",
        "suitability": 0.95,
    },
    {  # ripe but under min_suitability 0.30: the species cannot occur here
        "zone_id": ZONE_C,
        "zone_name": "23",
        "place": "Muuratsalo",
        "species": "cloudberry",
        "score": 60,
        "confidence": "medium",
        "ripeness": "ripe",
        "suitability": 0.10,
    },
    {  # suitable but not ripe yet
        "zone_id": ZONE_D,
        "zone_name": "Laajavuori 42",
        "place": None,
        "species": "bilberry",
        "score": 70,
        "confidence": "low",
        "ripeness": "ripening",
        "suitability": 0.95,
    },
]


@pytest.fixture
def ontology_dir() -> Path:
    return ONTOLOGY_DIR


@pytest.fixture
def rule_path() -> Path:
    return ONTOLOGY_DIR / "rules" / "ripe_nearby.rq"


@pytest.fixture
def snapshot_rows() -> list[dict]:
    return [dict(row) for row in SNAPSHOT_ROWS]


@pytest.fixture
def zone_a() -> str:
    return ZONE_A


@pytest.fixture
def zone_b() -> str:
    return ZONE_B
