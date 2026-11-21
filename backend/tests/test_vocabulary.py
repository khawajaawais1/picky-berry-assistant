"""The ontology's vocabulary, served.

Alert rows carry species IRIs; these two endpoints are where the rest of the ontology is
reachable — the species table the app can read names and IRIs from instead of its own
catalogue, and the JSON-LD context the API points its payloads at. Both read the graph loaded
at startup; neither touches Postgres.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.reasoning.lifespan import ontology_lifespan
from app.modules.reasoning.router import router


def test_species_endpoint_serves_the_committed_vocabulary() -> None:
    app = FastAPI(lifespan=ontology_lifespan)
    app.include_router(router)

    with TestClient(app) as client:
        response = client.get("/api/v1/species")

    assert response.status_code == 200
    body = response.json()
    assert [item["species"] for item in body] == [
        "bilberry",
        "cloudberry",
        "crowberry",
        "lingonberry",
    ]
    assert body[0] == {
        "species": "bilberry",
        "speciesIri": "https://picky.example/onto#Bilberry",
        "nameEn": "bilberry",
        "nameFi": "mustikka",
        "latinName": "Vaccinium myrtillus",
        "minSuitability": 0.30,
        "verified": False,
    }


def test_context_endpoint_serves_the_committed_jsonld() -> None:
    app = FastAPI(lifespan=ontology_lifespan)
    app.include_router(router)

    with TestClient(app) as client:
        response = client.get("/api/v1/context.jsonld")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/ld+json")
    assert response.json()["@context"]["nameFi"] == "bpa:nameFi"


def test_the_vocabulary_is_unavailable_without_a_startup_graph() -> None:
    app = FastAPI()
    app.include_router(router)

    with TestClient(app) as client:
        assert client.get("/api/v1/species").status_code == 503
        assert client.get("/api/v1/context.jsonld").status_code == 503
