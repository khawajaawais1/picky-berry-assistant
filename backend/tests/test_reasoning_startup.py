"""The ontology is parsed at startup, once, and every run reuses it.

A run copies the parsed graph and adds only its own rows (`service.alerts_from_rows`), so the
parse is paid once per process rather than once per run or per request. This is the wiring a
job needs: `app.state.ontology_graph` is the same object for the life of the app.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from rdflib import Namespace

from app.modules.reasoning import lifespan as lifespan_module
from app.modules.reasoning.lifespan import ontology_lifespan
from app.modules.reasoning.router import router
from app.modules.reasoning.service import alerts_from_rows

BPA = Namespace("https://picky.example/onto#")


def test_startup_parses_the_ontology_once_and_the_app_reuses_it(monkeypatch) -> None:
    calls: list[object] = []
    real_load = lifespan_module.load_ontology

    def counting_load(ontology_dir=None):
        calls.append(ontology_dir)
        return real_load() if ontology_dir is None else real_load(ontology_dir)

    monkeypatch.setattr(lifespan_module, "load_ontology", counting_load)

    app = FastAPI(lifespan=ontology_lifespan)
    app.state.alerts_source = lambda: []
    app.include_router(router)

    with TestClient(app) as client:
        graph = app.state.ontology_graph
        codes = {str(code) for code in graph.objects(None, BPA.speciesCode)}
        assert codes == {"bilberry", "lingonberry", "cloudberry", "crowberry"}

        # Two requests later the app still holds the graph startup parsed.
        client.get("/api/v1/alerts")
        client.get("/api/v1/alerts")
        assert app.state.ontology_graph is graph

    assert len(calls) == 1


def test_the_startup_graph_runs_the_rule_and_returns_its_sentences(
    rule_path, snapshot_rows: list[dict]
) -> None:
    app = FastAPI(lifespan=ontology_lifespan)

    with TestClient(app):
        alerts = alerts_from_rows(app.state.ontology_graph, snapshot_rows, rule_path)

    assert [alert.zone_number for alert in alerts] == ["Laajavuori 18", "07"]
    assert alerts[0].sentence == (
        "Ripe bilberry in zone Laajavuori 18 — yield score 82, high confidence."
    )
    assert alerts[1].sentence == (
        "Ripe lingonberry in zone 07 near Killerjärvi — yield score 55, medium confidence."
    )
