import datetime as dt

import pytest

from berry_ml import Report, update_trust, update_zone_score

NOW = dt.datetime(2026, 7, 25, 12, tzinfo=dt.UTC)


def test_the_slide_example_map_55_photo_32_gives_82():
    r = update_zone_score(55, "medium", [Report(NOW, rating=5, photo_count=32, reporter_trust=1.0)], NOW)
    assert r["score"] == 82 and r["sFeedback"] == 100.0


def test_no_reports_keeps_the_map_score():
    r = update_zone_score(40, "low", [], NOW)
    assert r == {"score": 40, "confidence": "low", "sModel": 40, "sFeedback": None, "evidenceWeight": 0.0, "reportsUsed": 0}


def test_old_reports_are_ignored_and_fresh_ones_count_more():
    old = Report(NOW - dt.timedelta(days=40), rating=5, reporter_trust=1.0)
    assert update_zone_score(20, "medium", [old], NOW)["score"] == 20
    fresh = update_zone_score(20, "medium", [Report(NOW, rating=5, reporter_trust=1.0)], NOW)["score"]
    week = update_zone_score(20, "medium", [Report(NOW - dt.timedelta(days=7), rating=5, reporter_trust=1.0)], NOW)["score"]
    assert fresh > week > 20


def test_many_trusted_photo_reports_give_high_confidence():
    reports = [Report(NOW - dt.timedelta(days=i), rating=4, photo_count=20, reporter_trust=0.9) for i in range(3)]
    assert update_zone_score(50, "medium", reports, NOW)["confidence"] == "high"


def test_low_trust_moves_the_score_less():
    hi = update_zone_score(20, "medium", [Report(NOW, rating=5, reporter_trust=1.0)], NOW)["score"]
    lo = update_zone_score(20, "medium", [Report(NOW, rating=5, reporter_trust=0.1)], NOW)["score"]
    assert hi > lo > 20


def test_trust_moves_with_agreement_and_stays_in_bounds():
    assert update_trust(0.5, 5, 30) == 0.55          # photo agrees with rating
    assert update_trust(0.5, 5, 0) == 0.4            # photo shows nothing, rating says excellent
    assert update_trust(0.5, 3, None) == 0.5         # no photo: no change
    assert update_trust(0.06, 1, 30) == 0.05 and update_trust(0.99, 5, 30) == 1.0


def test_bad_rating_is_refused():
    with pytest.raises(ValueError):
        update_zone_score(50, "medium", [Report(NOW, rating=9)], NOW)
