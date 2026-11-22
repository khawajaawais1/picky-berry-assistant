"""FastAPI application — backend reasoning service (feature 6.7).

Run locally:
    cd backend
    uvicorn app.main:app --reload --port 8001

Environment variables:
    ONTOLOGY_DIR   path to the ontology/ directory (default: ../ontology relative to this file)
    LOG_LEVEL      log level for the root logger (default: info)
"""
from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.modules.reasoning.lifespan import load_ontology_into
from app.modules.reasoning.router import router

log = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    ontology_dir = os.getenv("ONTOLOGY_DIR") or None
    load_ontology_into(app, ontology_dir)
    log.info("ontology loaded; reasoning service ready")
    yield
    log.info("backend shutting down")


app = FastAPI(
    title="Picky Backend",
    description="ML reasoning and alerts service (feature 6.7).",
    version="0.1.0",
    lifespan=_lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# CORS: picky-server (NestJS) calls this service server-side; allow all for now.
# Tighten allowed origins once deployment URLs are known (ADR-031).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["ops"])
def health(request: Request) -> Response:
    """Liveness + readiness probe.

    Returns 200 {"status": "ok"} once the ontology is loaded.
    Returns 503 {"status": "starting"} before the lifespan has completed —
    this lets the deployment platform know the instance is not yet ready.
    """
    if not hasattr(request.app.state, "ontology_graph"):
        return Response(
            content='{"status":"starting"}',
            status_code=503,
            media_type="application/json",
        )
    return Response(
        content='{"status":"ok"}',
        status_code=200,
        media_type="application/json",
    )
