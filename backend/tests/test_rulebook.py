"""The committed rulebook runs: every rule, the same snapshot, its own alerts and words.

The runner must not know which rule it is running — only the rule's own header names it and
only the rule's own query decides what fires.
"""

from pathlib import Path

from app.modules.reasoning.graph import load_ontology
from app.modules.reasoning.rules import load_rules
from app.modules.reasoning.service import alerts_from_rule


def test_every_rule_runs_and_returns_its_own_sentences(
    ontology_dir: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)
    rules = {rule.rule_id: rule for rule in load_rules(graph, ontology_dir / "rules")}

    alerts = {
        rule_id: alerts_from_rule(graph, snapshot_rows, rule)
        for rule_id, rule in rules.items()
    }

    assert [alert.zone_number for alert in alerts["ripe_nearby"]] == ["Laajavuori 18", "07"]
    ripening = alerts["ripe_soon"]
    assert [alert.zone_number for alert in ripening] == ["Laajavuori 42"]
    assert ripening[0].rule_id == "ripe_soon"
    assert ripening[0].sentence == (
        "Ripening bilberry in zone Laajavuori 42 — yield score 70, low confidence."
    )


def test_the_ripe_soon_rule_ignores_zones_it_cannot_support(
    ontology_dir: Path, snapshot_rows: list[dict]
) -> None:
    graph = load_ontology(ontology_dir)
    rule = next(
        rule for rule in load_rules(graph, ontology_dir / "rules") if rule.rule_id == "ripe_soon"
    )

    # A ripening cloudberry in a spruce zone is still a species that cannot live there.
    rows = [dict(snapshot_rows[2], ripeness="ripening")]
    assert alerts_from_rule(graph, rows, rule) == []
