"""The alerts endpoint: what the reasoning job stored, not a rule run per request.

The request path never touches the graph. In production `alerts_source` reads the `alerts`
table the job writes (docs/architecture.md §8); today the job does not run and that table
does not exist, so an app with no source answers 503 rather than an empty list — "no alert
today" and "not wired yet" are different facts, and a client should not confuse them.
"""

from __future__ import annotations

import os
from collections.abc import Callable
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response

from app.modules.reasoning.service import Alert

router = APIRouter(prefix="/api/v1", tags=["reasoning"])

# The vocabulary the app can read instead of carrying its own copy of the four names.
_SPECIES = """\
PREFIX bpa: <https://picky.example/onto#>
SELECT ?species ?code ?nameEn ?nameFi ?latin ?min ?verified
WHERE {
  ?species a bpa:Species ;
           bpa:speciesCode ?code ;
           bpa:nameEn ?nameEn ;
           bpa:nameFi ?nameFi ;
           bpa:latinName ?latin ;
           bpa:minHabitatSuitability ?min ;
           bpa:verified ?verified .
}
ORDER BY ?code
"""


@router.get("/alerts")
def list_alerts(request: Request) -> list[dict[str, Any]]:
    """The alerts most recently computed for this picker's radius, best score first."""
    source: Callable[[], list[Alert]] | None = getattr(
        request.app.state, "alerts_source", None
    )
    if source is None:
        raise HTTPException(status_code=503, detail="alerts are not available yet")
    return [alert.as_api() for alert in source()]


@router.get("/species")
def list_species(request: Request) -> list[dict[str, Any]]:
    """The four pilot species, with the IRIs the alert and zone payloads point at."""
    graph = getattr(request.app.state, "ontology_graph", None)
    if graph is None:
        raise HTTPException(status_code=503, detail="the ontology is not loaded")

    return [
        {
            "species": str(row.code),
            "speciesIri": str(row.species),
            "nameEn": str(row.nameEn),
            "nameFi": str(row.nameFi),
            "latinName": str(row.latin),
            "minSuitability": float(row.min),
            "verified": bool(row.verified.toPython()),
        }
        for row in graph.query(_SPECIES)
    ]


@router.post("/reasoning/run", status_code=202, tags=["ops"])
def trigger_reasoning_run(request: Request, background_tasks: BackgroundTasks) -> dict[str, str]:
    """Kick off a reasoning run now (ops/testing). Production runs via APScheduler."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL not set")
    ontology_graph = getattr(request.app.state, "ontology_graph", None)
    rules = getattr(request.app.state, "reasoning_rules", None)
    zone_grid = getattr(request.app.state, "zone_grid", None)
    if zone_grid is None:
        raise HTTPException(status_code=503, detail="ZoneGrid not loaded")
    if ontology_graph is None or rules is None:
        raise HTTPException(status_code=503, detail="ontology not loaded")
    background_tasks.add_task(_run_job_background, db_url, ontology_graph, rules, zone_grid)
    return {"status": "accepted"}


def _run_job_background(db_url: str, ontology_graph, rules: list, zone_grid) -> None:
    from app.modules.reasoning.job import run_reasoning

    run_reasoning(db_url, ontology_graph, rules, zone_grid)


@router.get("/context.jsonld")
def jsonld_context(request: Request) -> Response:
    """The committed JSON-LD context, served so a payload's IRIs resolve (F3)."""
    directory = getattr(request.app.state, "ontology_dir", None)
    if directory is None:
        raise HTTPException(status_code=503, detail="the ontology is not loaded")

    context = Path(directory) / "context.jsonld"
    if not context.is_file():
        raise HTTPException(status_code=503, detail="the JSON-LD context is missing")

    return Response(
        content=context.read_text(encoding="utf-8"),
        media_type="application/ld+json",
    )
