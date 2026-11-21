"""The alerts endpoint.

The request path never touches the graph: the reasoning job stores its alerts and the route
returns what is on `app.state.alerts_source`, which is an in-memory list today and the
`alerts` table once Hassan's migration lands. One rule per request is not a thing.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.reasoning.graph import load_ontology
from app.modules.reasoning.router import router
from app.modules.reasoning.service import Alert, alerts_from_rows


def client_for(alerts: list[Alert] | None) -> TestClient:
    app = FastAPI()
    if alerts is not None:
        app.state.alerts_source = lambda: alerts
    app.include_router(router)
    return TestClient(app)


def alerts_for(ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]) -> list[Alert]:
    return alerts_from_rows(load_ontology(ontology_dir), snapshot_rows, rule_path)


def test_alerts_endpoint_returns_the_stored_alerts(
    ontology_dir: Path, rule_path: Path, snapshot_rows: list[dict]
) -> None:
    client = client_for(alerts_for(ontology_dir, rule_path, snapshot_rows))

    response = client.get("/api/v1/alerts")

    assert response.status_code == 200
    body = response.json()
    assert [item["zoneNumber"] for item in body] == ["Laajavuori 18", "07"]
    assert body[0]["sentence"].startswith("Ripe bilberry")
    assert body[0]["speciesIri"] == "https://picky.example/onto#Bilberry"


def test_alerts_endpoint_says_it_is_unavailable_without_a_source() -> None:
    client = client_for(None)

    response = client.get("/api/v1/alerts")

    assert response.status_code == 503
