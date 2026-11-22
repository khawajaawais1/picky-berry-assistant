"""Smoke tests for app.main: lifespan, health probe and routing.

TestClient runs the lifespan (ontology parse + rulebook validation) automatically,
so these tests also cover that the default ontology path resolves from the CI working
directory (backend/).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok_after_lifespan() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ontology_graph_on_app_state_after_lifespan() -> None:
    with TestClient(app) as client:
        client.get("/health")  # trigger lifespan if not already running
    assert hasattr(app.state, "ontology_graph")


def test_species_endpoint_returns_four_pilot_species() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/species")
    assert response.status_code == 200
    codes = {s["species"] for s in response.json()}
    assert codes == {"bilberry", "lingonberry", "cloudberry", "crowberry"}


def test_alerts_returns_503_without_a_source() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/alerts")
    assert response.status_code == 503


def test_docs_reachable() -> None:
    with TestClient(app) as client:
        response = client.get("/docs")
    assert response.status_code == 200
