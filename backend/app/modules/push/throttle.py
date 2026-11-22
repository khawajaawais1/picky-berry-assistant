"""Per-user push throttle (feature 6.7, layer 6).

Three guards run before each FCM send:
  1. Quiet hours: 21:00 – 07:00 Helsinki — no sends at all.
  2. Daily rate limit: max MAX_ALERTS_PER_DAY pushes per user per UTC day.
  3. Zone cooldown: same zone × species to the same user within ZONE_COOLDOWN_DAYS.

All DB calls are lazy-imported so the module is importable without SQLAlchemy.
"""
from __future__ import annotations

import datetime as dt
import logging
from zoneinfo import ZoneInfo

log = logging.getLogger(__name__)

HELSINKI = ZoneInfo("Europe/Helsinki")
MAX_ALERTS_PER_DAY = 2
ZONE_COOLDOWN_DAYS = 3
QUIET_START_HOUR = 21   # 21:00 Helsinki
QUIET_END_HOUR = 7      # 07:00 Helsinki


def is_quiet_hours(now: dt.datetime | None = None) -> bool:
    """True when local Helsinki time is between 21:00 and 07:00."""
    t = (now or dt.datetime.now(HELSINKI)).astimezone(HELSINKI).time()
    return t.hour >= QUIET_START_HOUR or t.hour < QUIET_END_HOUR


def user_alert_count_today(db_url: str, user_id: str) -> int:
    """How many 'sent' push_log rows does this user have since midnight Helsinki?"""
    from sqlalchemy import create_engine, text

    midnight = dt.datetime.now(HELSINKI).replace(hour=0, minute=0, second=0, microsecond=0)
    eng = create_engine(db_url, future=True)
    with eng.connect() as conn:
        return conn.execute(text("""
            SELECT COUNT(*) FROM push_log
            WHERE user_id = :uid AND status = 'sent' AND sent_at >= :since
        """), {"uid": user_id, "since": midnight}).scalar_one()


def zone_cooldown_active(db_url: str, user_id: str, zone_id: str, species: str) -> bool:
    """True when this user already received a push for zone × species in the last N days."""
    from sqlalchemy import create_engine, text

    since = dt.datetime.now(dt.UTC) - dt.timedelta(days=ZONE_COOLDOWN_DAYS)
    eng = create_engine(db_url, future=True)
    with eng.connect() as conn:
        count = conn.execute(text("""
            SELECT COUNT(*) FROM push_log
            WHERE user_id = :uid AND zone_id = :zid::uuid AND species = :sp
              AND status = 'sent' AND sent_at >= :since
        """), {"uid": user_id, "zid": zone_id, "sp": species, "since": since}).scalar_one()
    return count > 0


def log_push(
    db_url: str,
    user_id: str,
    alert_id: str | None,
    zone_id: str,
    species: str,
    fcm_token: str,
    status: str,
) -> None:
    """Write one push_log row."""
    from sqlalchemy import create_engine, text

    eng = create_engine(db_url, future=True)
    with eng.begin() as conn:
        conn.execute(text("""
            INSERT INTO push_log (user_id, alert_id, zone_id, species, fcm_token, status)
            VALUES (:uid, :aid::uuid, :zid::uuid, :sp, :tok, :st)
        """), {
            "uid": user_id, "aid": alert_id, "zid": zone_id,
            "sp": species, "tok": fcm_token, "st": status,
        })
