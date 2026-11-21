"""The ontology against the configs it was copied from.

`bpa.ttl` and `species.ttl` are transcribed from `data/config/species.yaml` and
`data/config/zone_species_rules.yaml`, and the ontology does not read the YAML at runtime.
This is the test that fails when the two disagree, so a value changed in one place cannot
leave the graph quietly stale.
"""

from pathlib import Path

import pytest
import yaml
from rdflib import RDF, Namespace

from app.modules.reasoning.graph import load_ontology

BPA = Namespace("https://picky.example/onto#")
REPO_ROOT = Path(__file__).resolve().parents[2]
ONTOLOGY_DIR = REPO_ROOT / "ontology"
SPECIES_YAML = REPO_ROOT / "data" / "config" / "species.yaml"
RULES_YAML = REPO_ROOT / "data" / "config" / "zone_species_rules.yaml"


@pytest.fixture(scope="module")
def graph():
    return load_ontology(ONTOLOGY_DIR)


@pytest.fixture(scope="module")
def species_config() -> dict:
    return yaml.safe_load(SPECIES_YAML.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def rules_config() -> dict:
    return yaml.safe_load(RULES_YAML.read_text(encoding="utf-8"))


def species_nodes(graph) -> dict[str, object]:
    return {
        str(graph.value(node, BPA.speciesCode)): node
        for node in graph.subjects(RDF.type, BPA.Species)
    }


def habitat_values(graph) -> dict[tuple[str, str], float]:
    values: dict[tuple[str, str], float] = {}
    for node in graph.subjects(RDF.type, BPA.HabitatSuitability):
        species = graph.value(node, BPA.species)
        code = str(graph.value(species, BPA.speciesCode))
        habitat = str(graph.value(node, BPA.habitatClass)).removeprefix(str(BPA))
        values[(code, habitat)] = float(graph.value(node, BPA.suitability))
    return values


def fertility_values(graph) -> dict[tuple[str, int], float]:
    values: dict[tuple[str, int], float] = {}
    for node in graph.subjects(RDF.type, BPA.FertilityMultiplier):
        species = graph.value(node, BPA.species)
        key = (str(graph.value(species, BPA.speciesCode)), int(graph.value(node, BPA.fertilitySiteClass)))
        values[key] = float(graph.value(node, BPA.fertilityMultiplier))
    return values


def test_the_graph_holds_exactly_the_configs_species(graph, species_config: dict) -> None:
    nodes = species_nodes(graph)

    assert set(nodes) == {entry["code"] for entry in species_config["species"]}
    for entry in species_config["species"]:
        node = nodes[entry["code"]]
        assert str(node) == entry["iri"], "the IRI must stay the placeholder the YAML publishes"
        assert str(graph.value(node, BPA.latinName)) == entry["latin"]
        assert str(graph.value(node, BPA.nameFi)) == entry["name_fi"]
        assert str(graph.value(node, BPA.nameEn)) == entry["name_en"]


def test_habitat_suitability_matches_the_config(graph, rules_config: dict) -> None:
    expected = {
        (code, habitat): float(value)
        for code, classes in rules_config["rules"].items()
        for habitat, value in classes.items()
    }

    actual = habitat_values(graph)
    assert set(actual) == set(expected)
    for key, value in expected.items():
        assert actual[key] == pytest.approx(value)


def test_every_habitat_class_in_the_config_is_declared(graph, rules_config: dict) -> None:
    declared = {
        str(habitat).removeprefix(str(BPA))
        for habitat in graph.subjects(RDF.type, BPA.HabitatClass)
    }
    used = {habitat for classes in rules_config["rules"].values() for habitat in classes}

    assert used == declared


def test_fertility_multipliers_match_the_config(graph, rules_config: dict) -> None:
    expected = {
        (code, int(site_class)): float(value)
        for code, classes in rules_config["fertility_multiplier"].items()
        for site_class, value in classes.items()
    }

    actual = fertility_values(graph)
    assert set(actual) == set(expected)
    for key, value in expected.items():
        assert actual[key] == pytest.approx(value)


def test_min_suitability_and_verified_flag_match_the_config(
    graph, rules_config: dict, species_config: dict
) -> None:
    nodes = species_nodes(graph)

    assert set(nodes) == {entry["code"] for entry in species_config["species"]}
    for node in nodes.values():
        assert float(graph.value(node, BPA.minHabitatSuitability)) == pytest.approx(
            rules_config["min_suitability"]
        )
        # The YAML's `verified: false` is what lets an alert admit its ecology is unsourced.
        assert graph.value(node, BPA.verified).toPython() == rules_config["verified"]
