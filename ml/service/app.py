"""Reference ML service: the endpoints the backend needs, runnable on its own.

This is a **reference implementation** for the backend team (Hassan): copy the router into
``backend/app/modules/prediction/router.py`` (or mount it) and replace the file-based zones with
the database. It is also a stand-alone service the app team can point at for the demo:

    cd ml
    pip install -r requirements.txt -r requirements-service.txt
    uvicorn service.app:app --reload --port 8100
    open http://localhost:8100/docs

Every route needs the ``X-API-Key`` header when ``ML_API_KEY`` is set (it is on Render).
JSON is snake_case everywhere; ``date`` values are Europe/Helsinki calendar dates (default: today
in Finland); timestamps are UTC ISO-8601. The exact contract is ml/API.md.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Query, Request, Security, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field

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
    today_helsinki,
    update_trust,
    update_zone_score,
)

REPO = Path(__file__).resolve().parents[2]
PILOT_ZONES = REPO / "data" / "test_zones.geojson"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
Species = Literal["bilberry", "lingonberry", "cloudberry", "crowberry"]
Confidence = Literal["low", "medium", "high"]
SPECIES_LIST = ("bilberry", "lingonberry", "cloudberry", "crowberry")
MAX_POINTS = 5000

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


# ---------- schemas (snake_case on the wire, like picky-server) ----------
class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReportIn(Strict):
    created_at: dt.datetime
    rating: int | None = Field(None, ge=1, le=5)
    photo_count: int | None = Field(None, ge=0)
    reporter_trust: float = Field(0.5, ge=0, le=1)
    visit_backed: bool = False


class ScoreUpdateIn(Strict):
    map_score: int = Field(ge=0, le=100)
    map_confidence: Confidence = "medium"
    map_explanation: dict | None = None
    reports: list[ReportIn] = []
    now: dt.datetime | None = None


class PointIn(Strict):
    id: str
    h3: str | None = None
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class ZoneScoresIn(Strict):
    date: dt.date | None = None
    points: list[PointIn] = Field(min_length=1, max_length=MAX_POINTS)


class TrustUpdateIn(Strict):
    trust: float = Field(ge=0, le=1)
    rating: int | None = Field(None, ge=1, le=5)
    photo_count: int | None = Field(None, ge=0)
    species: Species
    zone_consensus: float | None = Field(None, ge=1, le=5)


def year_indexes() -> dict[str, float]:
    return {sp: yield_model().year_index("Lansi-Suomi", sp) for sp in SPECIES_LIST}


router = APIRouter(prefix="/api/v1/ml", tags=["ml"], dependencies=[Depends(require_key)])


@router.get("/health")
def health():
    return {"status": "ok", "models": {"detector": DETECTOR_VERSION, "zone_grid": ZONE_GRID_VERSION,
                                       "yield": YIELD_VERSION, "score_rules": SCORE_RULES_VERSION}}


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
    return JSONResponse(grid().score_zones(fc, date=date or today_helsinki(), year_index=yi),
                        media_type="application/geo+json")


@router.get("/score")
def point_score(lat: float = Query(..., ge=-90, le=90, description="Latitude, WGS84 decimal degrees"),
                lon: float = Query(..., ge=-180, le=180, description="Longitude, WGS84 decimal degrees"),
                date: dt.date | None = None):
    """One spot -> berry score for all 4 species, each with its explanation."""
    day = date or today_helsinki()
    res = grid().score_point(lat, lon, date=day, year_index=year_indexes())
    if res is None:
        return problem(404, "Outside the model area", "This point is outside the forest grid around Jyvaskyla.")
    first = next(iter(res.values()))
    return {"lat": lat, "lon": lon, "date": day.isoformat(), "coverage": "grid",
            "forest_share": first.forest_share,
            "scores": {sp: z.to_payload(explanation=True) for sp, z in res.items()},
            "model_version": ZONE_GRID_VERSION}


@router.post("/zone-scores")
def zone_scores(body: ZoneScoresIn):
    """Batch: the backend's own zones (one centroid each) -> scores for all species + explanation.
    Points outside the grid come back with coverage "none" and scores null."""
    day = body.date or today_helsinki()
    pts = [p.model_dump() for p in body.points]
    return {"date": day.isoformat(), "model_version": ZONE_GRID_VERSION, "rules_version": SCORE_RULES_VERSION,
            "results": grid().score_points(pts, date=day, year_index=year_indexes())}


@router.post("/score-updates")
def score_update(body: ScoreUpdateIn):
    """Map score + recent reports for ONE zone and species -> new score with its explanation."""
    reports = [Report(r.created_at, r.rating, r.photo_count, r.reporter_trust, r.visit_backed) for r in body.reports]
    now = body.now or dt.datetime.now(dt.UTC)
    return update_zone_score(body.map_score, body.map_confidence, reports, now, body.map_explanation)


@router.post("/trust-updates")
def trust_update(body: TrustUpdateIn):
    """One report -> the reporter's new trust (rule in ml/API.md)."""
    return {"trust": update_trust(body.trust, body.rating, body.photo_count, body.species, body.zone_consensus),
            "rules_version": SCORE_RULES_VERSION}


app = FastAPI(title="Berry Picker Assistant - ML reference service", version="2.0.0")


@app.exception_handler(RequestValidationError)
async def validation_problem(_: Request, exc: RequestValidationError):
    # Name the fields only; the validator's own messages stay in the server log.
    fields = sorted({str(e["loc"][-1]) for e in exc.errors() if e.get("loc")})
    return problem(422, "Invalid request", "Check these fields: " + ", ".join(fields) if fields else "Check the request.")


app.include_router(router)
