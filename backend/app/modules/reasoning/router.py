"""The alerts endpoint: what the reasoning job stored, not a rule run per request.

The request path never touches the graph. In production `alerts_source` reads the `alerts`
table the job writes (docs/architecture.md §8); today the job does not run and that table
does not exist, so an app with no source answers 503 rather than an empty list — "no alert
today" and "not wired yet" are different facts, and a client should not confuse them.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.modules.reasoning.service import Alert

router = APIRouter(prefix="/api/v1", tags=["reasoning"])


@router.get("/alerts")
def list_alerts(request: Request) -> list[dict[str, Any]]:
    """The alerts most recently computed for this picker's radius, best score first."""
    source: Callable[[], list[Alert]] | None = getattr(
        request.app.state, "alerts_source", None
    )
    if source is None:
        raise HTTPException(status_code=503, detail="alerts are not available yet")
    return [alert.as_api() for alert in source()]
