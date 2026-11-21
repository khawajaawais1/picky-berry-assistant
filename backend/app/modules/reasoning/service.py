"""Run one alert rule over a snapshot and return its alerts with their explanation.

The sentence is the rule's own, read from the `# sentence:` lines at the top of the `.rq`, so
the words a picker reads cannot drift from the query that produced them. Two forms are kept:
one for a zone with a place name, one for a zone without.

The committed ontology is never mutated: each run copies it and adds that run's rows, which is
what lets the same parsed graph serve every run in a process.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

from rdflib import RDFS, Graph

from app.modules.reasoning.graph import ZONE, add_zone_rows
from app.modules.reasoning.rules import Rule, placeholders


@dataclass(frozen=True)
class Alert:
    """One candidate for delivery, with everything the sentence and the API need."""

    rule_id: str
    rule_version: str
    zone_id: str
    zone_iri: str
    zone_number: str
    place: str | None
    species: str
    species_iri: str
    name_en: str
    name_fi: str
    score: int
    confidence: str
    suitability: float
    ripeness: str
    sentence: str

    def as_api(self) -> dict[str, object]:
        """The wire shape: camelCase, the app's own species code, and the IRIs alongside it."""
        return {
            "ruleId": self.rule_id,
            "ruleVersion": self.rule_version,
            "zoneId": self.zone_id,
            "zoneIri": self.zone_iri,
            "zoneNumber": self.zone_number,
            "place": self.place,
            "species": self.species,
            "speciesIri": self.species_iri,
            "nameEn": self.name_en,
            "nameFi": self.name_fi,
            "score": self.score,
            "confidence": self.confidence,
            "suitability": self.suitability,
            "ripeness": self.ripeness,
            "sentence": self.sentence,
        }


def alerts_from_rows(
    base: Graph,
    rows: Iterable[Mapping[str, object]],
    rule_path: Path | str,
) -> list[Alert]:
    """One reasoning run for one rule file: `alerts_from_rule` with the file parsed first."""
    return alerts_from_rule(base, rows, Rule.from_path(rule_path))


def alerts_from_rule(
    base: Graph,
    rows: Iterable[Mapping[str, object]],
    rule: Rule,
) -> list[Alert]:
    """One reasoning run: a copy of the ontology, this run's rows, the rule's own query."""
    text = rule.query

    graph = Graph()
    for triple in base:
        graph.add(triple)
    add_zone_rows(graph, rows)

    alerts: list[Alert] = []
    for result in graph.query(text):
        place = None if result.placeName is None else str(result.placeName)
        template = rule.sentence_without_place if place is None else rule.sentence
        # Every `{placeholder}` is filled from the row's own variables, so a rule that selects
        # more than the alert needs still renders whichever names its template uses.
        values = {
            field: _render(getattr(result, field, None)) for field in placeholders(template)
        }
        zone_iri = str(result.zone)
        alerts.append(
            Alert(
                rule_id=rule.rule_id,
                rule_version=rule.version,
                # An alert points at the zone's stable id, the one the app already has.
                zone_id=zone_iri.removeprefix(str(ZONE)),
                zone_iri=zone_iri,
                zone_number=str(result.zoneNumber),
                place=place,
                species=str(result.speciesCode),
                species_iri=str(result.species),
                name_en=str(result.nameEn),
                name_fi=str(result.nameFi),
                score=int(result.yieldScore),
                confidence=str(result.confidence),
                suitability=float(result.zoneSuitability),
                # The app's own word comes from the stage's label, not the IRI's local name.
                ripeness=str(graph.value(result.ripenessStage, RDFS.label)),
                sentence=template.format_map(values),
            )
        )

    return alerts


def _render(value: object) -> str:
    """A row's value as template text: unbound is empty, an integer score loses its decimal."""
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return str(int(value))
    return str(value)
