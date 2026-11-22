"""Unit tests for FCM push delivery (Layer 5).

firebase_admin and SQLAlchemy are not installed in the CI dev environment.
Tests inject a mock firebase_admin into sys.modules before each call that
exercises push_alerts — the lazy `from firebase_admin import messaging`
inside the function resolves against sys.modules at call time, so no reload
is needed.
"""
from __future__ import annotations

from dataclasses import dataclass
from unittest.mock import MagicMock, patch

from app.modules.push.fcm import push_alerts

# ---------------------------------------------------------------------------
# Minimal Alert stand-in (avoids importing rdflib in push tests)
# ---------------------------------------------------------------------------

@dataclass
class _Alert:
    species: str
    score: int
    confidence: str
    ripeness: str
    zone_id: str
    zone_iri: str
    zone_number: str
    place: str | None
    rule_id: str
    rule_version: str
    name_en: str
    name_fi: str
    suitability: float
    ecology_verified: bool
    sentence: str


def _alert(species: str = "bilberry", score: int = 75) -> _Alert:
    return _Alert(
        species=species, score=score, confidence="medium", ripeness="ripe",
        zone_id="zone-uuid-1", zone_iri="https://picky.example/zone/zone-uuid-1",
        zone_number="18", place="Laajavuori", rule_id="ripe_nearby",
        rule_version="1.0.0", name_en="Bilberry", name_fi="Mustikka",
        suitability=0.8, ecology_verified=False,
        sentence=f"Ripe Bilberry in zone 18 near Laajavuori — yield score {score}, medium confidence.",
    )


def _messaging_mock(success: int = 1, failure: int = 0, exc: Exception | None = None) -> MagicMock:
    mod = MagicMock()
    for cls in ("MulticastMessage", "Notification", "AndroidConfig", "APNSConfig", "APNSPayload", "Aps"):
        setattr(mod, cls, MagicMock(return_value=MagicMock()))
    if exc:
        mod.send_multicast.side_effect = exc
    else:
        mod.send_multicast.return_value = MagicMock(success_count=success, failure_count=failure)
    return mod


def _firebase_mocks(messaging: MagicMock | None = None) -> dict:
    messaging = messaging or _messaging_mock()
    firebase_mod = MagicMock()
    firebase_mod.messaging = messaging  # `from firebase_admin import messaging` reads this attribute
    return {
        "firebase_admin": firebase_mod,
        "firebase_admin.messaging": messaging,
    }


class TestPushAlerts:
    def test_empty_alerts_returns_zeros(self):
        result = push_alerts("postgresql://test", [], fcm_app=None)
        assert result == {"sent": 0, "failed": 0, "skipped": 0}

    @patch("app.modules.push.fcm._fetch_devices_for_species", return_value=[])
    def test_no_devices_counts_as_skipped(self, _mock):
        with patch.dict("sys.modules", _firebase_mocks()):
            result = push_alerts("postgresql://test", [_alert()], fcm_app=None)
        assert result == {"sent": 0, "failed": 0, "skipped": 1}

    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}])
    def test_success_counted(self, _mock):
        with patch.dict("sys.modules", _firebase_mocks(_messaging_mock(success=1, failure=0))):
            result = push_alerts("postgresql://test", [_alert()], fcm_app=None)
        assert result["sent"] == 1
        assert result["failed"] == 0

    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}])
    def test_fcm_partial_failure_counted(self, _mock):
        with patch.dict("sys.modules", _firebase_mocks(_messaging_mock(success=0, failure=1))):
            result = push_alerts("postgresql://test", [_alert()], fcm_app=None)
        assert result["failed"] == 1
        assert result["sent"] == 0

    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}])
    def test_send_exception_counts_all_tokens_as_failed(self, _mock):
        exc_msg = _messaging_mock(exc=RuntimeError("network error"))
        with patch.dict("sys.modules", _firebase_mocks(exc_msg)):
            result = push_alerts("postgresql://test", [_alert()], fcm_app=None)
        assert result["failed"] == 1

    @patch("app.modules.push.fcm._fetch_devices_for_species", return_value=[])
    def test_one_db_query_per_species(self, mock_fetch):
        with patch.dict("sys.modules", _firebase_mocks()):
            alerts = [_alert("bilberry"), _alert("bilberry"), _alert("lingonberry")]
            push_alerts("postgresql://test", alerts, fcm_app=None)
        assert mock_fetch.call_count == 2  # bilberry once, lingonberry once

    @patch("app.modules.push.fcm._fetch_devices_for_species",
           return_value=[{"user_id": "u1", "fcm_token": "tok1"}, {"user_id": "u2", "fcm_token": "tok2"}])
    def test_all_tokens_in_one_multicast(self, _mock):
        messaging = _messaging_mock(success=2, failure=0)
        with patch.dict("sys.modules", _firebase_mocks(messaging)):
            result = push_alerts("postgresql://test", [_alert()], fcm_app=None)
        messaging.send_multicast.assert_called_once()
        assert result["sent"] == 2
