"""Rules are data, so they are checked before a run needs them.

A rule that is missing a sentence form, names a placeholder its query does not select, or does
not parse would otherwise fail during a run — or silently produce a sentence with a hole in
it. `load_rules` is what startup calls, so these failures belong at boot.
"""

from pathlib import Path

import pytest

from app.modules.reasoning.graph import load_ontology
from app.modules.reasoning.rules import RuleError, load_rules


@pytest.fixture
def rule_text(rule_path: Path) -> str:
    return rule_path.read_text(encoding="utf-8")


def write_rule(directory: Path, name: str, text: str) -> Path:
    path = directory / name
    path.write_text(text, encoding="utf-8")
    return path


def test_every_committed_rule_loads_with_its_header(ontology_dir: Path) -> None:
    rules = load_rules(load_ontology(ontology_dir), ontology_dir / "rules")

    assert rules, "the ontology ships at least one rule"
    assert {rule.path.name for rule in rules} == {
        path.name for path in (ontology_dir / "rules").glob("*.rq")
    }
    for rule in rules:
        assert rule.rule_id
        assert rule.version
        assert rule.sentence
        assert rule.sentence_without_place


def test_a_rule_missing_a_sentence_form_is_refused(
    tmp_path: Path, ontology_dir: Path, rule_text: str
) -> None:
    broken = rule_text.replace(
        "# sentenceWithoutPlace:", "# sentenceWithoutPlacement:"  # a typo in the header key
    )
    write_rule(tmp_path, "broken.rq", broken)

    with pytest.raises(RuleError, match="sentenceWithoutPlace"):
        load_rules(load_ontology(ontology_dir), tmp_path)


def test_a_placeholder_the_query_does_not_select_is_refused(
    tmp_path: Path, ontology_dir: Path, rule_text: str
) -> None:
    broken = rule_text.replace("in zone {zoneNumber} near", "in zone {zoneNumbr} near")
    write_rule(tmp_path, "broken.rq", broken)

    with pytest.raises(RuleError, match="zoneNumbr"):
        load_rules(load_ontology(ontology_dir), tmp_path)


def test_a_query_that_does_not_parse_is_refused(
    tmp_path: Path, ontology_dir: Path, rule_text: str
) -> None:
    broken = rule_text.replace("FILTER(?ripenessStage = bpa:Ripe)", "FILTER ?ripenessStage")
    write_rule(tmp_path, "broken.rq", broken)

    with pytest.raises(RuleError, match="does not parse"):
        load_rules(load_ontology(ontology_dir), tmp_path)


def test_two_rules_cannot_share_an_id(
    tmp_path: Path, ontology_dir: Path, rule_text: str
) -> None:
    write_rule(tmp_path, "one.rq", rule_text)
    write_rule(tmp_path, "two.rq", rule_text)

    with pytest.raises(RuleError, match="ripe_nearby"):
        load_rules(load_ontology(ontology_dir), tmp_path)


def test_an_empty_rules_directory_is_refused(tmp_path: Path, ontology_dir: Path) -> None:
    with pytest.raises(RuleError, match="no .rq"):
        load_rules(load_ontology(ontology_dir), tmp_path)
