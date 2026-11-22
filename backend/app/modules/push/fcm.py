"""FCM push delivery for reasoning alerts (feature 6.7, layers 5+6).

firebase-admin is an optional dependency (backend[job] extra). All imports
are lazy so the service boots normally when the package is absent.

Call sequence (scheduler._daily_job):
    fcm_app = getattr(app.state, "fcm_app", None)
    if fcm_app:
        from app.modules.push.fcm import push_alerts
        push_alerts(db_url, all_alerts, fcm_app)

Layer-6 guards applied before every send:
  - Score ≥ MIN_SCORE and confidence ≠ "low"
  - Quiet hours (21:00–07:00 Helsinki) → no sends
  - Per-user rate limit: max MAX_ALERTS_PER_DAY pushes per UTC day
  - Per-user zone × species cooldown: ZONE_COOLDOWN_DAYS days
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.reasoning.service import Alert

log = logging.getLogger(__name__)

MIN_SCORE = 70
MAX_ALERTS_PER_DAY = 2
ZONE_COOLDOWN_DAYS = 3


def init_fcm_app(credential_json: str | None = None, credential_path: str | None = None):
    """Initialise firebase_admin once; return the App. Called from lifespan.

    Provide exactly one of:
      FIREBASE_CREDENTIAL_JSON — the service-account JSON as a string
      FIREBASE_CREDENTIAL_PATH — filesystem path to the service-account file
    """
    import json

    import firebase_admin
    from firebase_admin import credentials

    if credential_json:
        cred = credentials.Certificate(json.loads(credential_json))
    elif credential_path:
        cred = credentials.Certificate(credential_path)
    else:
        raise ValueError("set FIREBASE_CREDENTIAL_JSON or FIREBASE_CREDENTIAL_PATH")

    return firebase_admin.initialize_app(cred)


def _fetch_devices_for_species(db_url: str, species: str) -> list[dict]:
    """Return {user_id, fcm_token} for every active device whose owner wants this species.

    An empty species_interest array means the user has not filtered — treat as "all species".
    """
    from sqlalchemy import create_engine, text

    sql = text("""
        SELECT d.user_id::text AS user_id, d.fcm_token
        FROM devices d
        JOIN users u ON u.id = d.user_id
        WHERE u.deleted_at IS NULL
          AND (
            array_length(u.species_interest, 1) IS NULL
            OR :species = ANY(u.species_interest)
          )
        ORDER BY d.user_id
    """)
    eng = create_engine(db_url, future=True)
    with eng.connect() as conn:
        return [dict(r) for r in conn.execute(sql, {"species": species}).mappings()]


def push_alerts(db_url: str, alerts: list[Alert], fcm_app=None) -> dict[str, int]:
    """Deliver reasoning alerts via FCM with Layer-6 throttle guards.

    Returns {"sent": N, "failed": N, "skipped": N}.
    "skipped" covers alerts below the score/confidence threshold, quiet-hours
    suppression, rate-limited users, and zone-cooldown blocks.
    """
    if not alerts:
        return {"sent": 0, "failed": 0, "skipped": 0}

    # --- Layer 6: score + confidence threshold --------------------------------
    eligible = [a for a in alerts if a.score >= MIN_SCORE and a.confidence != "low"]
    skipped = len(alerts) - len(eligible)
    if not eligible:
        log.info("push skipped: no alerts meet score/confidence threshold")
        return {"sent": 0, "failed": 0, "skipped": skipped}

    # --- Layer 6: quiet hours -------------------------------------------------
    from app.modules.push.throttle import (
        is_quiet_hours,
        log_push,
        user_alert_count_today,
        zone_cooldown_active,
    )

    if is_quiet_hours():
        log.info("push deferred: quiet hours (21:00–07:00 Helsinki)")
        return {"sent": 0, "failed": 0, "skipped": skipped + len(eligible)}

    # Cache device lists per species to avoid repeated DB round-trips.
    devices_cache: dict[str, list[dict]] = {}

    sent = failed = 0

    # Process alerts best-score first so a user gets the highest-scoring alert
    # that clears their throttle windows.
    for alert in sorted(eligible, key=lambda a: a.score, reverse=True):
        if alert.species not in devices_cache:
            devices_cache[alert.species] = _fetch_devices_for_species(db_url, alert.species)
        devices = devices_cache[alert.species]

        if not devices:
            skipped += 1
            continue

        # --- Layer 6: per-user rate limit + zone cooldown ---------------------
        eligible_devices = []
        for d in devices:
            uid = d["user_id"]
            if user_alert_count_today(db_url, uid) >= MAX_ALERTS_PER_DAY:
                skipped += 1
                continue
            if zone_cooldown_active(db_url, uid, alert.zone_id, alert.species):
                skipped += 1
                continue
            eligible_devices.append(d)

        if not eligible_devices:
            continue

        # Only import firebase when there are tokens to actually send.
        from firebase_admin import messaging

        tokens = [d["fcm_token"] for d in eligible_devices]
        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(
                title=f"Berry alert: {alert.name_en}",
                body=alert.sentence,
            ),
            data={
                "ruleId": alert.rule_id,
                "species": alert.species,
                "zoneId": alert.zone_id,
                "score": str(alert.score),
                "confidence": alert.confidence,
            },
            android=messaging.AndroidConfig(priority="normal"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(aps=messaging.Aps(content_available=True))
            ),
        )

        try:
            response = messaging.send_multicast(message, app=fcm_app)
            # Log per-token outcome and tally.
            for d, resp in zip(eligible_devices, response.responses):
                status = "sent" if resp.success else "failed"
                log_push(db_url, d["user_id"], None, alert.zone_id, alert.species,
                         d["fcm_token"], status)
            sent += response.success_count
            failed += response.failure_count
            if response.failure_count:
                log.warning("FCM: %d/%d failures for %s zone %s",
                            response.failure_count, len(tokens), alert.species, alert.zone_id)
        except Exception:
            log.exception("FCM send_multicast failed for %s zone %s", alert.species, alert.zone_id)
            for d in eligible_devices:
                log_push(db_url, d["user_id"], None, alert.zone_id, alert.species,
                         d["fcm_token"], "failed")
            failed += len(eligible_devices)

    log.info("FCM push done: %d sent, %d failed, %d skipped", sent, failed, skipped)
    return {"sent": sent, "failed": failed, "skipped": skipped}
