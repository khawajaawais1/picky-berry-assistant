"""Fixture-graph test for rules/ripe_nearby.rq.

Loads the committed ontology (bpa.ttl + species.ttl) and a fixture zone snapshot into one
graph, runs the rule exactly as the reasoning module will, and checks what it fires on.
The point is the rule's boundary: a ripe stage is necessary but not enough — the zone's
habitat suitability must clear the species' own min_suitability.
"""

from pathlib import Path

import pytest
from rdflib import Graph

ONTOLOGY_DIR = Path(__file__).resolve().parents[1]
RULE = ONTOLOGY_DIR / "rules" / "ripe_nearby.rq"
FIXTURE = ONTOLOGY_DIR / "tests" / "fixtures" / "zones.ttl"


@pytest.fixture(scope="module")
def graph() -> Graph:
    g = Graph()
    for path in (ONTOLOGY_DIR / "bpa.ttl", ONTOLOGY_DIR / "species.ttl", FIXTURE):
        g.parse(path, format="turtle")
    return g


def run_rule(graph: Graph) -> list:
    rows = graph.query(RULE.read_text(encoding="utf-8"))
    return list(rows)


def test_ripe_nearby_fires_only_on_ripe_zones_the_species_can_live_in(graph: Graph) -> None:
    rows = run_rule(graph)

    # zone-1 (bilberry 82) and zone-4 (bilberry 49) qualify; zone-2 is only ripening and
    # zone-3's 0.10 suitability is under bilberry/cloudberry's 0.30 minimum.
    assert [str(row.zoneNumber) for row in rows] == ["18", "42"]
    assert {str(row.speciesCode) for row in rows} == {"bilberry"}
    # zone-4 has no place name, so the OPTIONAL leaves it unbound rather than dropping the row.
    assert [None if row.placeName is None else str(row.placeName) for row in rows] == [
        "Laajavuori",
        None,
    ]


def test_ripe_nearby_orders_by_score_and_carries_the_sentence_inputs(graph: Graph) -> None:
    rows = run_rule(graph)

    assert [int(row.yieldScore) for row in rows] == [82, 49]
    first = rows[0]
    assert str(first.speciesCode) == "bilberry"
    assert str(first.nameEn) == "bilberry"
    assert str(first.nameFi) == "mustikka"
    assert str(first.confidence) == "high"
    assert float(first.zoneSuitability) == pytest.approx(0.70)
    assert str(first.ripenessStage) == "https://picky.example/onto#Ripe"
    # The species' threshold comes from species.ttl (zone_species_rules.yaml's min_suitability),
    # not from a constant in the query.
    assert all(float(row.zoneSuitability) >= 0.30 for row in rows)


def test_ripe_nearby_excludes_a_ripe_species_below_its_habitat_minimum(graph: Graph) -> None:
    rows = run_rule(graph)

    assert [row for row in rows if str(row.speciesCode) == "cloudberry"] == []

    # The fixture really does carry that ripe cloudberry row — the suitability filter rejected it.
    rejected = list(
        graph.query(
            """PREFIX bpa: <https://picky.example/onto#>
            SELECT ?stage ?suitability WHERE {
              bpa:zone-3-cloudberry bpa:ripenessStage ?stage ;
                                    bpa:zoneSuitability ?suitability .
            }"""
        )
    )
    assert len(rejected) == 1
    assert str(rejected[0].stage) == "https://picky.example/onto#Ripe"
    assert float(rejected[0].suitability) == pytest.approx(0.10)
