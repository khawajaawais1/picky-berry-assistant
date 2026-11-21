import datetime as dt

import pytest

from berry_ml import Report, update_trust, update_zone_score

NOW = dt.datetime(2026, 7, 25, 12, tzinfo=dt.UTC)
MAP_EXPL = {"model_version": "zone-grid-test", "rules_version": "zone-score-rules-v2",
            "reasons": ["in_ripe_window", "good_site", "no_reports_baseline"],
            "inputs": {"site_class": "good", "reports_used": 0, "evidence_weight": 0.0}}


def test_visit_backed_trusted_photo_report_map_55_gives_78():
    r = update_zone_score(55, "medium", [Report(NOW, 5, 32, 1.0, visit_backed=True)], NOW)
    assert r["score"] == 78 and r["s_feedback"] == 100.0 and r["evidence_weight"] == 1.0


def test_a_report_without_a_visit_counts_half():
    with_visit = update_zone_score(20, "medium", [Report(NOW, 5, None, 1.0, True)], NOW)
    without = update_zone_score(20, "medium", [Report(NOW, 5, None, 1.0, False)], NOW)
    assert with_visit["evidence_weight"] == 1.0 and without["evidence_weight"] == 0.5
    assert with_visit["score"] > without["score"] > 20


def test_no_reports_keeps_the_map_score():
    r = update_zone_score(40, "low", [], NOW)
    assert r == {"score": 40, "confidence": "low", "s_model": 40, "s_feedback": None,
                 "evidence_weight": 0.0, "reports_used": 0, "explanation": None}


def test_a_zero_count_photo_never_lowers_a_report():
    rating_only = update_zone_score(50, "medium", [Report(NOW, 5, None, 1.0, True)], NOW)
    leaf_photo = update_zone_score(50, "medium", [Report(NOW, 5, 0, 1.0, True)], NOW)
    assert rating_only["score"] == leaf_photo["score"]
    assert update_zone_score(50, "medium", [Report(NOW, None, 0, 1.0, True)], NOW)["reports_used"] == 0


def test_old_reports_are_ignored_and_fresh_ones_count_more():
    old = Report(NOW - dt.timedelta(days=40), rating=5, reporter_trust=1.0)
    assert update_zone_score(20, "medium", [old], NOW)["score"] == 20
    fresh = update_zone_score(20, "medium", [Report(NOW, rating=5, reporter_trust=1.0)], NOW)["score"]
    week = update_zone_score(20, "medium", [Report(NOW - dt.timedelta(days=7), rating=5, reporter_trust=1.0)], NOW)["score"]
    assert fresh > week > 20


def test_many_trusted_visit_reports_give_high_confidence():
    reports = [Report(NOW - dt.timedelta(days=i), 4, 20, 0.9, True) for i in range(3)]
    assert update_zone_score(50, "medium", reports, NOW)["confidence"] == "high"


def test_low_trust_moves_the_score_less():
    hi = update_zone_score(20, "medium", [Report(NOW, rating=5, reporter_trust=1.0)], NOW)["score"]
    lo = update_zone_score(20, "medium", [Report(NOW, rating=5, reporter_trust=0.1)], NOW)["score"]
    assert hi > lo > 20


def test_explanation_swaps_the_report_reason():
    up = update_zone_score(40, "medium", [Report(NOW, 5, 30, 1.0, True)], NOW, MAP_EXPL)["explanation"]
    assert up["reasons"] == ["in_ripe_window", "good_site", "recent_reports_high", "photo_confirms_species"]
    assert up["inputs"]["reports_used"] == 1 and up["inputs"]["evidence_weight"] == 1.0
    down = update_zone_score(80, "medium", [Report(NOW, 1, None, 1.0, True)], NOW, MAP_EXPL)["explanation"]
    assert down["reasons"] == ["in_ripe_window", "good_site", "recent_reports_low"]
    none = update_zone_score(80, "medium", [], NOW, MAP_EXPL)["explanation"]
    assert none["reasons"] == MAP_EXPL["reasons"] and len(none["reasons"]) >= 2


def test_trust_rule():
    assert update_trust(0.5, 4, None, "bilberry", 3.2) == 0.55      # within 1 star of the consensus
    assert update_trust(0.5, 5, None, "bilberry", 2.0) == 0.4       # 3 stars away, no photo
    assert update_trust(0.5, 5, 12, "bilberry", 2.0) == 0.55        # far from consensus, but photo confirms
    assert update_trust(0.5, 5, 0, "lingonberry", None) == 0.5      # zero-count photo never lowers
    assert update_trust(0.5, 1, 0, "bilberry", 4.5) == 0.4          # zero photo: crowd decides
    assert update_trust(0.5, 3, None, "bilberry", None) == 0.5      # nothing to compare with
    assert update_trust(0.5, None, 7, "cloudberry", None) == 0.55   # photo alone can raise
    assert update_trust(0.06, 5, None, "bilberry", 1.0) == 0.05 and update_trust(0.99, 5, 30, "bilberry") == 1.0


def test_bad_inputs_are_refused():
    with pytest.raises(ValueError):
        update_zone_score(50, "medium", [Report(NOW, rating=9)], NOW)
    with pytest.raises(ValueError):
        update_trust(0.5, 3, None, "strawberry", None)
