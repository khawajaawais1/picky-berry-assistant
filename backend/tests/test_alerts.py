"""The rule runner: one rule file plus one snapshot, the alerts it produces and their words.

The sentence comes from the rule's own header, so the explanation a picker reads and the
query that fired cannot drift apart.
"""

from pathlib import Path

from app.modules.reasoning.service import alerts_from_rows

from app.modules.reasoning.graph import load_ontology


def test_only_ripe_zones_the_species_can_live_in_produce_an_alert(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)

    alerts = alerts_from_rows(graph, snapshot_rows, rule_path)

    # Cloudberry at 0.10 suitability and bilberry that is only ripening are both excluded.
    assert [alert.zone_number for alert in alerts] == ["Laajavuori 18", "07"]
    assert [alert.species for alert in alerts] == ["bilberry", "lingonberry"]
    assert [alert.score for alert in alerts] == [82, 55]


def test_alert_records_the_rule_that_fired(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]
) -> None:
    alerts = alerts_from_rows(load_ontology(ontology_dir), snapshot_rows, rule_path)

    first = alerts[0]
    assert (first.rule_id, first.rule_version) == ("ripe_nearby", "1.0.0")


def test_sentence_is_the_rules_own_template(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]
) -> None:
    alerts = alerts_from_rows(load_ontology(ontology_dir), snapshot_rows, rule_path)

    assert alerts[0].sentence == (
        "Ripe bilberry in zone Laajavuori 18 — yield score 82, high confidence."
    )
    # The second zone has a place, so the rule's other template form is used.
    assert alerts[1].sentence == (
        "Ripe lingonberry in zone 07 near Killerjärvi — yield score 55, medium confidence."
    )


def test_alert_as_api_speaks_the_apis_vocabulary(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict], zone_a: str
) -> None:
    alerts = alerts_from_rows(load_ontology(ontology_dir), snapshot_rows[:1], rule_path)

    assert alerts[0].as_api() == {
        "ruleId": "ripe_nearby",
        "ruleVersion": "1.0.0",
        "zoneId": zone_a,
        "zoneIri": f"https://picky.example/zone/{zone_a}",
        "zoneNumber": "Laajavuori 18",
        "place": None,
        "species": "bilberry",
        "speciesIri": "https://picky.example/onto#Bilberry",
        "nameEn": "bilberry",
        "nameFi": "mustikka",
        "score": 82,
        "confidence": "high",
        "suitability": 0.70,
        "ripeness": "ripe",
        "sentence": "Ripe bilberry in zone Laajavuori 18 — yield score 82, high confidence.",
    }


def test_the_committed_ontology_is_not_mutated_by_a_run(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)
    before = len(graph)

    alerts_from_rows(graph, snapshot_rows, rule_path)

    assert len(graph) == before


def test_a_run_with_no_candidates_returns_no_alerts(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]
) -> None:
    alerts = alerts_from_rows(load_ontology(ontology_dir), snapshot_rows[2:], rule_path)

    assert alerts == []
