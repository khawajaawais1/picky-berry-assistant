import json

import pandas as pd
import pytest

from picky_data.zone_species import build_zone_species, suitability


def test_suitability_weighted_mean():
    rules = {"mire": 0.9, "forest_unknown": 0.1}
    assert suitability({"mire": 0.5, "forest_unknown": 0.5}, rules) == pytest.approx(0.5)
    assert suitability({"mire": 0.6}, rules) == pytest.approx(0.9)
    assert suitability({}, rules) == 0.0


def test_fertility_multiplier_clips():
    assert suitability({"forest_spruce": 1.0}, {"forest_spruce": 0.95}, 2, {2: 1.1}) == 1.0


def test_build_zone_species_drops_unsuitable():
    zones = pd.DataFrame({
        "id": ["a", "b"],
        "habitat": [json.dumps({"mire": 0.8}), json.dumps({"forest_unknown": 0.9})],
        "fertility_class": [None, None],
    })
    zs = build_zone_species(zones)
    a = set(zs[zs.zone_id == "a"].species)
    b = set(zs[zs.zone_id == "b"].species)
    assert "cloudberry" in a and "bilberry" not in a
    assert {"bilberry", "lingonberry", "crowberry"} <= b and "cloudberry" not in b
    assert zs.rules_version.iloc[0].endswith("-unverified")


def test_stub_allows_everything():
    zones = pd.DataFrame({"id": ["a"], "habitat": ["{}"], "fertility_class": [None]})
    assert len(build_zone_species(zones, stub=True)) == 4
