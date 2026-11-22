"""Unit tests for push throttle logic (Layer 6)."""
from __future__ import annotations

import datetime as dt
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from app.modules.push.throttle import (
    MAX_ALERTS_PER_DAY,
    QUIET_END_HOUR,
    QUIET_START_HOUR,
    ZONE_COOLDOWN_DAYS,
    is_quiet_hours,
)

HELSINKI = ZoneInfo("Europe/Helsinki")


class TestIsQuietHours:
    def _t(self, hour: int) -> dt.datetime:
        return dt.datetime(2026, 8, 1, hour, 0, tzinfo=HELSINKI)

    def test_midnight_is_quiet(self):
        assert is_quiet_hours(self._t(0)) is True

    def test_3am_is_quiet(self):
        assert is_quiet_hours(self._t(3)) is True

    def test_6am_is_quiet(self):
        assert is_quiet_hours(self._t(6)) is True

    def test_7am_is_not_quiet(self):
        assert is_quiet_hours(self._t(7)) is False

    def test_noon_is_not_quiet(self):
        assert is_quiet_hours(self._t(12)) is False

    def test_20_59_is_not_quiet(self):
        t = dt.datetime(2026, 8, 1, 20, 59, tzinfo=HELSINKI)
        assert is_quiet_hours(t) is False

    def test_21_00_is_quiet(self):
        assert is_quiet_hours(self._t(21)) is True

    def test_23_is_quiet(self):
        assert is_quiet_hours(self._t(23)) is True

    def test_constants_are_sensible(self):
        assert QUIET_START_HOUR == 21
        assert QUIET_END_HOUR == 7
        assert MAX_ALERTS_PER_DAY == 2
        assert ZONE_COOLDOWN_DAYS == 3


class TestPushAlertsLayer6Guards:
    """Verify the Layer-6 throttle guards inside push_alerts."""

    def _alert(self, score: int = 75, confidence: str = "medium", species: str = "bilberry"):
        a = MagicMock()
        a.score = score
        a.confidence = confidence
        a.species = species
        a.zone_id = "zone-uuid-1"
        a.rule_id = "ripe_nearby"
        a.name_en = "Bilberry"
        a.name_fi = "Mustikka"
        a.sentence = f"Ripe Bilberry — score {score}."
        return a

    def test_score_below_threshold_is_skipped(self):
        from app.modules.push.fcm import MIN_SCORE, push_alerts

        result = push_alerts("postgresql://test", [self._alert(score=MIN_SCORE - 1)], fcm_app=None)
        assert result == {"sent": 0, "failed": 0, "skipped": 1}

    def test_low_confidence_is_skipped(self):
        from app.modules.push.fcm import push_alerts

        result = push_alerts("postgresql://test", [self._alert(confidence="low")], fcm_app=None)
        assert result == {"sent": 0, "failed": 0, "skipped": 1}

    @patch("app.modules.push.throttle.is_quiet_hours", return_value=True)
    def test_quiet_hours_suppresses_all(self, _mock):
        from app.modules.push.fcm import push_alerts

        result = push_alerts("postgresql://test", [self._alert(score=80)], fcm_app=None)
        assert result["sent"] == 0
        assert result["skipped"] == 1

    @patch("app.modules.push.throttle.is_quiet_hours", return_value=False)
    @patch("app.modules.push.fcm._fetch_devices_for_species", return_value=[])
    def test_no_matching_devices_skips(self, _dev, _quiet):
        from app.modules.push.fcm import push_alerts

        result = push_alerts("postgresql://test", [self._alert(score=80)], fcm_app=None)
        assert result["sent"] == 0
        assert result["skipped"] == 1

    @patch("app.modules.push.throttle.is_quiet_hours", return_value=False)
    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}])
    @patch("app.modules.push.throttle.user_alert_count_today", return_value=MAX_ALERTS_PER_DAY)
    def test_rate_limited_user_skipped(self, _rate, _dev, _quiet):
        from app.modules.push.fcm import push_alerts

        result = push_alerts("postgresql://test", [self._alert(score=80)], fcm_app=None)
        assert result["sent"] == 0
        assert result["skipped"] > 0

    @patch("app.modules.push.throttle.is_quiet_hours", return_value=False)
    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}])
    @patch("app.modules.push.throttle.user_alert_count_today", return_value=0)
    @patch("app.modules.push.throttle.zone_cooldown_active", return_value=True)
    def test_zone_cooldown_user_skipped(self, _cd, _rate, _dev, _quiet):
        from app.modules.push.fcm import push_alerts

        result = push_alerts("postgresql://test", [self._alert(score=80)], fcm_app=None)
        assert result["sent"] == 0
        assert result["skipped"] > 0

    @patch("app.modules.push.throttle.is_quiet_hours", return_value=False)
    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}])
    @patch("app.modules.push.throttle.user_alert_count_today", return_value=0)
    @patch("app.modules.push.throttle.zone_cooldown_active", return_value=False)
    @patch("app.modules.push.throttle.log_push")
    def test_send_path_logs_result(self, mock_log, _cd, _rate, _dev, _quiet):
        def _messaging_mock():
            m = MagicMock()
            m.MulticastMessage = MagicMock(return_value=MagicMock())
            m.Notification = MagicMock(return_value=MagicMock())
            m.AndroidConfig = MagicMock(return_value=MagicMock())
            m.APNSConfig = MagicMock(return_value=MagicMock())
            m.APNSPayload = MagicMock(return_value=MagicMock())
            m.Aps = MagicMock(return_value=MagicMock())
            resp = MagicMock(success=True)
            m.send_multicast.return_value = MagicMock(
                success_count=1, failure_count=0, responses=[resp]
            )
            return m

        messaging = _messaging_mock()
        fb = MagicMock()
        fb.messaging = messaging
        with patch.dict("sys.modules", {"firebase_admin": fb, "firebase_admin.messaging": messaging}):
            from app.modules.push.fcm import push_alerts

            result = push_alerts("postgresql://test", [self._alert(score=80)], fcm_app=None)

        assert result["sent"] == 1
        mock_log.assert_called_once()
        _, _, _, _, _, _, status = mock_log.call_args[0]
        assert status == "sent"
