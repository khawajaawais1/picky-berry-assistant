"""Parse the committed ontology once, at app startup.

The graph is immutable after parsing; every reasoning run copies it and adds its own rows
(`service.alerts_from_rows`), so the parse is paid once per process rather than once per run
or per request. Keeping it on `app.state` — not in a module global — is what lets a test mount
two apps with two graphs, and lets a deployment point at its own ontology directory.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from rdflib import Graph

from app.modules.reasoning.graph import DEFAULT_ONTOLOGY_DIR, load_ontology
from app.modules.reasoning.rules import load_rules


def load_ontology_into(app: FastAPI, ontology_dir: Path | str | None = None) -> Graph:
    """Parse the ontology, validate the rulebook, keep both on the app. Called once."""
    directory = DEFAULT_ONTOLOGY_DIR if ontology_dir is None else Path(ontology_dir)
    graph = load_ontology(directory)
    rules = load_rules(graph, directory / "rules")

    app.state.ontology_graph = graph
    app.state.reasoning_rules = rules
    return graph


@asynccontextmanager
async def ontology_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Mount as `FastAPI(lifespan=ontology_lifespan)`, or compose into the app's own lifespan."""
    load_ontology_into(app)
    yield
