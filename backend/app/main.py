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

    # Optional ML scorer (requires berry-ml extra and the zone grid CSV).
    try:
        from berry_ml import ZoneGrid
        app.state.zone_grid = ZoneGrid()
        log.info("ZoneGrid loaded (%d cells)", len(app.state.zone_grid.lat))
    except ImportError:
        log.info("berry_ml not installed; ZoneGrid not loaded")
    except Exception as exc:
        log.warning("ZoneGrid init failed: %s", exc)

    # Optional: wire the DB-backed alerts source when DATABASE_URL is set.
    db_url = os.getenv("DATABASE_URL") or None
    if db_url:
        from app.modules.reasoning.job import make_alerts_source
        app.state.alerts_source = make_alerts_source(db_url)
        log.info("alerts_source wired to DATABASE_URL")

    # Optional Firebase Admin SDK for FCM push (requires firebase-admin in [job] extra).
    _cred_json = os.getenv("FIREBASE_CREDENTIAL_JSON")
    _cred_path = os.getenv("FIREBASE_CREDENTIAL_PATH")
    if _cred_json or _cred_path:
        try:
            from app.modules.push.fcm import init_fcm_app
            app.state.fcm_app = init_fcm_app(_cred_json, _cred_path)
            log.info("Firebase Admin SDK initialised; push notifications enabled")
        except ImportError:
            log.info("firebase-admin not installed; push notifications disabled")
        except Exception as exc:
            log.warning("Firebase Admin SDK init failed: %s", exc)

    # Optional APScheduler daily job (requires apscheduler extra).
    _scheduler = None
    try:
        from app.modules.reasoning.scheduler import make_scheduler
        _scheduler = make_scheduler(app.state)
        _scheduler.start()
        log.info("APScheduler started; daily reasoning job at 06:00 Helsinki")
    except ImportError:
        log.info("apscheduler not installed; daily reasoning job disabled")
    except Exception as exc:
        log.warning("scheduler start failed: %s", exc)

    log.info("ontology loaded; reasoning service ready")
    yield

    if _scheduler is not None:
        _scheduler.shutdown()
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
