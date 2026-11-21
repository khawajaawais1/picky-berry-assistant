"""The loader that turns a reasoning run's rows into triples.

Postgres is the system of record, so nothing here writes back: the graph is built per run
and thrown away. The species and ripeness vocabulary comes from the committed ontology, not
from a dict in this file, so a code the DB invents cannot quietly become a species.
"""

from pathlib import Path

import pytest
from rdflib import RDF, RDFS, Namespace

from app.modules.reasoning.graph import (
    UnknownRipeness,
    UnknownSpecies,
    add_zone_rows,
    load_ontology,
)

BPA = Namespace("https://picky.example/onto#")
ZONE = Namespace("https://picky.example/zone/")


def test_load_ontology_reads_the_committed_vocabulary(ontology_dir: Path) -> None:
    graph = load_ontology(ontology_dir)

    codes = {str(code) for code in graph.objects(None, BPA.speciesCode)}
    assert codes == {"bilberry", "lingonberry", "cloudberry", "crowberry"}
    assert float(graph.value(BPA.Bilberry, BPA.minHabitatSuitability)) == pytest.approx(0.30)
    # The stages the API maps ripeness to, with the labels the database writes.
    labels = {
        str(graph.value(stage, RDFS.label))
        for stage in graph.subjects(RDF.type, BPA.RipenessStage)
    }
    assert labels == {"unripe", "ripening", "ripe", "past"}


def test_add_zone_rows_writes_the_zone_and_its_assessment(
    ontology_dir: Path, snapshot_rows: list[dict], zone_a: str
) -> None:
    graph = load_ontology(ontology_dir)

    added = add_zone_rows(graph, snapshot_rows[:1])

    assert added == 1
    zone = ZONE[zone_a]
    assert (zone, RDF.type, BPA.Zone) in graph
    assert str(graph.value(zone, BPA.zoneNumber)) == "Laajavuori 18"
    # An absent place leaves the predicate out rather than writing an empty name.
    assert graph.value(zone, BPA.placeName) is None

    assessment = graph.value(zone, BPA.hasAssessment)
    assert graph.value(assessment, BPA.species) == BPA.Bilberry
    assert graph.value(assessment, BPA.ripenessStage) == BPA.Ripe
    assert int(graph.value(assessment, BPA.yieldScore)) == 82
    assert str(graph.value(assessment, BPA.confidence)) == "high"
    assert float(graph.value(assessment, BPA.zoneSuitability)) == pytest.approx(0.70)


def test_add_zone_rows_keeps_an_optional_place(
    ontology_dir: Path, snapshot_rows: list[dict], zone_b: str
) -> None:
    graph = load_ontology(ontology_dir)

    add_zone_rows(graph, snapshot_rows[1:2])

    assert str(graph.value(ZONE[zone_b], BPA.placeName)) == "Killerjärvi"


def test_a_row_with_a_missing_score_is_skipped_not_fatal(
    ontology_dir: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)

    # ml/'s grid covers 40 x 40 km, so a zone outside it has no score; ml/API.md says to omit
    # the scores, not to fail the run.
    rows = [dict(snapshot_rows[0], score=None), snapshot_rows[1]]

    assert add_zone_rows(graph, rows) == 1
    assert len(set(graph.subjects(RDF.type, BPA.SpeciesAssessment))) == 1


def test_a_row_with_no_ripeness_is_skipped(
    ontology_dir: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)

    rows = [dict(snapshot_rows[0], ripeness=None), dict(snapshot_rows[1], confidence=None)]

    assert add_zone_rows(graph, rows) == 0


def test_unknown_species_is_refused_and_nothing_is_written(
    ontology_dir: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)
    before = len(graph)

    rows = [dict(snapshot_rows[0], species="strawberry")]
    with pytest.raises(UnknownSpecies):
        add_zone_rows(graph, rows)

    assert len(graph) == before


def test_unknown_ripeness_is_refused_and_nothing_is_written(
    ontology_dir: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)
    before = len(graph)

    rows = [dict(snapshot_rows[0], ripeness="overripe")]
    with pytest.raises(UnknownRipeness):
        add_zone_rows(graph, rows)

    assert len(graph) == before
