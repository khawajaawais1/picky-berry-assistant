"""Build the reasoning graph for one run: the committed ontology plus a zone snapshot.

Postgres is the system of record (docs/architecture.md §8). Nothing here writes back: the
caller loads the ontology once, adds one run's rows, runs a rule, and throws the graph away.
Species and ripeness resolve through the ontology's own vocabulary, so a code the database
invents is refused instead of silently becoming a species.

The row shape is the join the reasoning job reads: one row per zone × species from
`zones`, `zone_scores_current` and `zone_species` (ml/API.md §3, docs/data-contract.md).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from decimal import Decimal
from pathlib import Path

from rdflib import RDF, RDFS, Graph, Literal, Namespace, URIRef

BPA = Namespace("https://picky.example/onto#")
# The zone IRI is minted from the stable id the zones table keeps: uuid5(namespace, h3)
# (docs/data-contract.md), so a rebuild never changes what an alert points at.
ZONE = Namespace("https://picky.example/zone/")

# backend/app/modules/reasoning/graph.py → the repository root is four levels up.
DEFAULT_ONTOLOGY_DIR = Path(__file__).resolve().parents[4] / "ontology"


# A row missing any of these describes a zone the pipeline has no reading for: ml/'s grid
# covers 40 x 40 km, so a zone outside it has no score, and ml/API.md says to omit the scores
# rather than fail the run. Such a row is skipped; a *wrong* value (an unknown species or
# ripeness) is still an error.
REQUIRED_ROW_FIELDS = (
    "zone_id",
    "zone_name",
    "species",
    "ripeness",
    "score",
    "confidence",
    "suitability",
)


class OntologyError(Exception):
    """A snapshot value the committed ontology cannot name."""


class UnknownSpecies(OntologyError):
    """The row's species has no `bpa:Species` individual."""


class UnknownRipeness(OntologyError):
    """The row's ripeness has no `bpa:RipenessStage` individual."""


def load_ontology(ontology_dir: Path | str = DEFAULT_ONTOLOGY_DIR) -> Graph:
    """Parse the committed vocabulary. Call once per process, not once per request."""
    graph = Graph()
    for name in ("bpa.ttl", "species.ttl"):
        graph.parse(Path(ontology_dir) / name, format="turtle")
    return graph


def _species_by_code(graph: Graph) -> dict[str, URIRef]:
    return {str(code): species for species, code in graph.subject_objects(BPA.speciesCode)}


def _stages_by_label(graph: Graph) -> dict[str, URIRef]:
    return {
        str(label): stage
        for stage in graph.subjects(RDF.type, BPA.RipenessStage)
        for label in graph.objects(stage, RDFS.label)
    }


def add_zone_rows(graph: Graph, rows: Iterable[Mapping[str, object]]) -> int:
    """Add one run's rows to `graph`; returns the number of assessments written.

    Every row is resolved before anything is written, so a bad species or ripeness leaves
    the graph untouched rather than half-populated.
    """
    species_by_code = _species_by_code(graph)
    stages_by_label = _stages_by_label(graph)

    pending = []
    for row in rows:
        if any(row.get(field) is None for field in REQUIRED_ROW_FIELDS):
            continue

        code = str(row["species"])
        ripeness = str(row["ripeness"])

        species = species_by_code.get(code)
        if species is None:
            raise UnknownSpecies(f"{code!r} has no bpa:Species in species.ttl")

        stage = stages_by_label.get(ripeness)
        if stage is None:
            raise UnknownRipeness(f"{ripeness!r} has no bpa:RipenessStage in bpa.ttl")

        zone = ZONE[str(row["zone_id"])]
        pending.append((zone, URIRef(f"{zone}-{code}"), species, stage, row))

    for zone, assessment, species, stage, row in pending:
        graph.add((zone, RDF.type, BPA.Zone))
        # `zone_name` is what the zone card prints ("Laajavuori 18"); a separate place name
        # is optional and only written when the row has one.
        graph.add((zone, BPA.zoneNumber, Literal(str(row["zone_name"]))))
        place = row.get("place")
        if place:
            graph.add((zone, BPA.placeName, Literal(str(place))))

        graph.add((zone, BPA.hasAssessment, assessment))
        graph.add((assessment, RDF.type, BPA.SpeciesAssessment))
        graph.add((assessment, BPA.species, species))
        graph.add((assessment, BPA.ripenessStage, stage))
        graph.add((assessment, BPA.yieldScore, Literal(int(row["score"]))))
        graph.add((assessment, BPA.confidence, Literal(str(row["confidence"]))))
        graph.add(
            (assessment, BPA.zoneSuitability, Literal(Decimal(str(row["suitability"]))))
        )

    return len(pending)
