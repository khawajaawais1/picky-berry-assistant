"""The rulebook: one `.rq` per alert rule, validated before a run needs it.

A rule that is missing a sentence form, names a placeholder its query does not select, or does
not parse would otherwise fail during a run. `load_rules` is what startup calls, so those
failures happen at boot, in the log, naming the file.

Every rule returns the same columns (`REQUIRED_OUTPUT_VARS`): the alert row and its sentence are
built from them, so a rule cannot invent a shape the API has no room for.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from string import Formatter

from rdflib import Graph

# The alert row's columns, as SPARQL variable names. `placeName` may be unbound by a run's
# data, but the query must still select it.
REQUIRED_OUTPUT_VARS = frozenset(
    {
        "zone",
        "zoneNumber",
        "placeName",
        "species",
        "speciesCode",
        "nameEn",
        "nameFi",
        "yieldScore",
        "confidence",
        "zoneSuitability",
        "ripenessStage",
    }
)

REQUIRED_HEADER = ("id", "version", "sentence", "sentenceWithoutPlace")

# A rule's header is its leading `# key: value` comment block (../README.md, "Adding a rule").
_HEADER = re.compile(r"^#\s*(?P<key>[A-Za-z]+):\s*(?P<value>.+?)\s*$")


class RuleError(Exception):
    """A rule file the runner cannot use; the message names the file and the reason."""


def rule_header(rule_text: str) -> dict[str, str]:
    """The rule's `# key: value` header, first occurrence of each key winning."""
    header: dict[str, str] = {}
    for line in rule_text.splitlines():
        if not line.startswith("#"):
            continue
        match = _HEADER.match(line)
        if match:
            header.setdefault(match["key"], match["value"])
    return header


def placeholders(template: str) -> set[str]:
    """The `{names}` a sentence template uses."""
    return {field for _, field, _, _ in Formatter().parse(template) if field}


@dataclass(frozen=True)
class Rule:
    """One rule file, parsed but not yet checked against the ontology."""

    path: Path
    rule_id: str
    version: str
    sentence: str
    sentence_without_place: str
    query: str

    @classmethod
    def from_path(cls, path: Path | str) -> Rule:
        path = Path(path)
        text = path.read_text(encoding="utf-8")
        header = rule_header(text)

        missing = [key for key in REQUIRED_HEADER if key not in header]
        if missing:
            raise RuleError(f"{path.name}: header is missing {', '.join(missing)}")

        return cls(
            path=path,
            rule_id=header["id"],
            version=header["version"],
            sentence=header["sentence"],
            sentence_without_place=header["sentenceWithoutPlace"],
            query=text,
        )


def load_rules(graph: Graph, rules_dir: Path | str) -> list[Rule]:
    """Parse and validate every `.rq` in the directory, in file-name order.

    Validation runs the query against the ontology with no snapshot: that parses it and
    reports the variables it selects, which is all the check needs.
    """
    directory = Path(rules_dir)
    paths = sorted(directory.glob("*.rq"))
    if not paths:
        raise RuleError(f"no .rq rules in {directory}")

    rules: list[Rule] = []
    seen: dict[str, Path] = {}
    for path in paths:
        rule = Rule.from_path(path)
        if rule.rule_id in seen:
            raise RuleError(
                f"{path.name}: rule id {rule.rule_id!r} is already used by {seen[rule.rule_id].name}"
            )

        try:
            selected = {str(variable) for variable in graph.query(rule.query).vars}
        except Exception as exc:  # pyparsing and rdflib both raise their own types
            raise RuleError(f"{path.name}: the query does not parse: {exc}") from exc

        missing_vars = REQUIRED_OUTPUT_VARS - selected
        if missing_vars:
            raise RuleError(
                f"{path.name}: the query does not select {', '.join(sorted(missing_vars))}"
            )

        used = placeholders(rule.sentence) | placeholders(rule.sentence_without_place)
        unselected = used - selected
        if unselected:
            raise RuleError(
                f"{path.name}: the sentence uses {', '.join(sorted(unselected))}, "
                "which the query does not select"
            )

        seen[rule.rule_id] = path
        rules.append(rule)

    return rules
