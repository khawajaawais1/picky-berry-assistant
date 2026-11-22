"""FCM push delivery for reasoning alerts (feature 6.7, layer 5).

firebase-admin is an optional dependency (backend[job] extra). All imports
are lazy so the service boots normally when the package is absent.

Call sequence (scheduler._daily_job):
    fcm_app = getattr(app.state, "fcm_app", None)
    if fcm_app:
        from app.modules.push.fcm import push_alerts
        push_alerts(db_url, all_alerts, fcm_app)
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.reasoning.service import Alert

log = logging.getLogger(__name__)


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
    """Send one FCM MulticastMessage per species to every interested device.

    Returns {"sent": N, "failed": N, "skipped": N}.
    "skipped" counts alerts for species that have no registered devices.
    """
    if not alerts:
        return {"sent": 0, "failed": 0, "skipped": 0}

    from firebase_admin import messaging

    # Group by species so we query the devices table once per species.
    by_species: dict[str, list[Alert]] = {}
    for a in alerts:
        by_species.setdefault(a.species, []).append(a)

    sent = failed = skipped = 0

    for species, species_alerts in by_species.items():
        devices = _fetch_devices_for_species(db_url, species)
        if not devices:
            skipped += len(species_alerts)
            log.debug("no devices for species %s, skipping %d alerts", species, len(species_alerts))
            continue

        tokens = [d["fcm_token"] for d in devices]
        # Pick the best alert (highest score) as the notification headline.
        best = max(species_alerts, key=lambda a: a.score)

        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(
                title=f"Berry alert: {best.name_en}",
                body=best.sentence,
            ),
            data={
                "ruleId": best.rule_id,
                "species": best.species,
                "zoneId": best.zone_id,
                "score": str(best.score),
                "confidence": best.confidence,
            },
            android=messaging.AndroidConfig(priority="normal"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(aps=messaging.Aps(content_available=True))
            ),
        )

        try:
            response = messaging.send_multicast(message, app=fcm_app)
            sent += response.success_count
            failed += response.failure_count
            if response.failure_count:
                log.warning("FCM: %d/%d failures for species %s", response.failure_count, len(tokens), species)
        except Exception:
            log.exception("FCM send_multicast failed for species %s", species)
            failed += len(tokens)

    log.info("FCM push done: %d sent, %d failed, %d skipped", sent, failed, skipped)
    return {"sent": sent, "failed": failed, "skipped": skipped}
