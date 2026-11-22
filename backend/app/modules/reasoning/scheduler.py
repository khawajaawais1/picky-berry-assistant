"""APScheduler wiring for the daily reasoning job.

Imported lazily by main._lifespan so the backend still boots when
apscheduler is not installed (the job extra is optional).
"""
from __future__ import annotations

import logging
import os
from zoneinfo import ZoneInfo

log = logging.getLogger(__name__)
_HELSINKI = ZoneInfo("Europe/Helsinki")


def make_scheduler(app_state):
    """Return a configured BackgroundScheduler (not yet started)."""
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    sched = BackgroundScheduler(timezone=_HELSINKI)
    sched.add_job(
        _daily_job,
        trigger=CronTrigger(hour=6, minute=0, timezone=_HELSINKI),
        args=[app_state],
        id="run_reasoning",
        replace_existing=True,
    )
    return sched


def _daily_job(app_state) -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        log.error("run_reasoning: DATABASE_URL not set, skipping daily job")
        return

    ontology_graph = getattr(app_state, "ontology_graph", None)
    rules = getattr(app_state, "reasoning_rules", None)
    zone_grid = getattr(app_state, "zone_grid", None)

    if ontology_graph is None or rules is None:
        log.error("run_reasoning: ontology not loaded, skipping daily job")
        return
    if zone_grid is None:
        log.warning("run_reasoning: ZoneGrid not on app.state, skipping daily job")
        return

    from app.modules.reasoning.job import run_reasoning

    results = run_reasoning(db_url, ontology_graph, rules, zone_grid)
    ok = sum(1 for r in results if r.status == "ok")
    log.info("daily reasoning job done: %d/%d rules ok", ok, len(results))

    fcm_app = getattr(app_state, "fcm_app", None)
    if fcm_app is not None:
        try:
            from app.modules.push.fcm import push_alerts
            all_alerts = [a for r in results for a in r.alerts]
            push_alerts(db_url, all_alerts, fcm_app)
        except Exception:
            log.exception("FCM push step failed")
