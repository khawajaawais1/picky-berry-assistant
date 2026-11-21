"""Reference ML service: the endpoints the backend needs, runnable on its own.

This is a **reference implementation** for the backend team (Hassan): copy the router into
``backend/app/modules/prediction/router.py`` (or mount it) and replace the file-based zones with
the database. It is also a stand-alone service the app team can point at for the demo:

    cd ml
    pip install -r requirements.txt -r requirements-service.txt
    uvicorn service.app:app --reload --port 8100
    open http://localhost:8100/docs

Not production-ready on its own: there is **no authentication** here (the backend adds the
Bearer-token dependency from api-contract.md §3) and no rate limiting.
"""
from __future__ import annotations

import datetime as dt
import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

import os
import secrets

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Query, Request, Security, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from berry_ml import (
    DETECTOR_VERSION,
    SCORE_RULES_VERSION,
    YIELD_VERSION,
    ZONE_GRID_VERSION,
    BerryDetector,
    InvalidImageError,
    Report,
    YieldModel,
    ZoneGrid,
    update_zone_score,
)

REPO = Path(__file__).resolve().parents[2]
PILOT_ZONES = REPO / "data" / "test_zones.geojson"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
Species = Literal["bilberry", "lingonberry", "cloudberry", "crowberry"]
Confidence = Literal["low", "medium", "high"]

_API_KEY = os.environ.get("ML_API_KEY", "")
_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_key(key: str | None = Security(_key_header)):
    if not _API_KEY:
        return  # key not configured — allow all (local dev without env var)
    if not key or not secrets.compare_digest(key, _API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header.")


# ---------- models loaded once ----------
@lru_cache
def detector() -> BerryDetector:
    return BerryDetector()


@lru_cache
def grid() -> ZoneGrid:
    return ZoneGrid()


@lru_cache
def yield_model() -> YieldModel:
    return YieldModel()


# ---------- RFC 9457 problem+json ----------
def problem(status: int, title: str, detail: str = "", type_: str = "about:blank") -> JSONResponse:
    body = {"type": type_, "title": title, "status": status}
    if detail:
        body["detail"] = detail
    return JSONResponse(body, status_code=status, media_type="application/problem+json")


# ---------- schemas (camelCase on the wire) ----------
class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ReportIn(Camel):
    created_at: dt.datetime
    rating: int | None = Field(None, ge=1, le=5)
    photo_count: int | None = Field(None, ge=0)
    reporter_trust: float = Field(0.5, ge=0, le=1)


class ScoreUpdateIn(Camel):
    map_score: int = Field(ge=0, le=100)
    map_confidence: Confidence = "medium"
    reports: list[ReportIn] = []
    now: dt.datetime | None = None


router = APIRouter(prefix="/api/v1/ml", tags=["ml"], dependencies=[Depends(require_key)])


@router.get("/health")
def health():
    return {"status": "ok", "models": {"detector": DETECTOR_VERSION, "zoneGrid": ZONE_GRID_VERSION,
                                       "yield": YIELD_VERSION, "scoreRules": SCORE_RULES_VERSION}}


@router.post("/detections")
async def detect(photo: UploadFile = File(..., description="JPEG/PNG photo of berries"),  # noqa: B008
                 boxes: bool = Query(True, description="include every detection's box"),
                 confidence: float = Query(0.25, ge=0.05, le=0.95)):
    """Photo -> berries per species. In the backend this runs on the stored photo of a feedback report."""
    data = await photo.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        return problem(413, "Photo too large", f"Maximum is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.")
    try:
        result = detector().detect(data, conf=confidence)
    except InvalidImageError:
        # Fixed text only: never echo exception messages to the client (CodeQL py/stack-trace-exposure).
        return problem(400, "Unreadable photo", "Send a JPEG or PNG photo, at most 12,000 pixels on a side.")
    return result.to_dict(include_boxes=boxes)


@router.get("/zones")
def zones(species: Species = "bilberry", date: dt.date | None = None):
    """The pilot zones with model scores, in the exact payload shape the app's ZoneSource reads
    (data/test_zones.geojson). The backend's GET /api/v1/zones should return the same shape from
    the zone_scores table instead of computing it per request."""
    fc = json.loads(PILOT_ZONES.read_text(encoding="utf-8"))
    for f in fc["features"]:
        f["properties"]["species"] = species
    yi = yield_model().year_index("Lansi-Suomi", species)
    return JSONResponse(grid().score_zones(fc, date=date or dt.date.today(), year_index=yi),
                        media_type="application/geo+json")


@router.post("/score-updates")
def score_update(body: ScoreUpdateIn):
    """Internal: map score + recent reports for ONE zone and species -> new score.
    The backend calls berry_ml.update_zone_score directly after storing a report; this endpoint
    only exists so the rule can be tried from /docs."""
    reports = [Report(r.created_at, r.rating, r.photo_count, r.reporter_trust) for r in body.reports]
    now = body.now or dt.datetime.now(dt.UTC)
    return update_zone_score(body.map_score, body.map_confidence, reports, now)


app = FastAPI(title="Berry Picker Assistant - ML reference service", version="1.0.0")


@app.exception_handler(RequestValidationError)
async def validation_problem(_: Request, exc: RequestValidationError):
    # Name the fields only; the validator's own messages stay in the server log.
    fields = sorted({str(e["loc"][-1]) for e in exc.errors() if e.get("loc")})
    return problem(422, "Invalid request", "Check these fields: " + ", ".join(fields) if fields else "Check the request.")


app.include_router(router)
