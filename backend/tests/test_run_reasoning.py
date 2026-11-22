"""Unit tests for the run_reasoning job (Layer 4).

All Postgres and berry_ml calls are mocked: the CI backend job runs with no
DATABASE_URL and no berry_ml installed, so every test must work offline.
"""
from __future__ import annotations

import datetime as dt
from unittest.mock import MagicMock, patch

from app.modules.reasoning.job import _apply_scores


class TestApplyScores:
    def _mock_grid(self, zone_id: str, scores: dict) -> MagicMock:
        grid = MagicMock()
        grid.score_points.return_value = [{"id": zone_id, "coverage": "grid", "scores": scores}]
        return grid

    def test_merges_grid_score_into_row(self):
        rows = [{"zone_id": "z1", "zone_name": "Z", "lat": 62.0, "lon": 25.0,
                 "species": "bilberry", "suitability": 0.8}]
        grid = self._mock_grid("z1", {"bilberry": {"score": 75, "confidence": "medium", "ripeness": "ripe"}})
        result = _apply_scores(rows, grid, dt.date(2026, 8, 1))
        assert len(result) == 1
        assert result[0]["score"] == 75
        assert result[0]["ripeness"] == "ripe"
        assert result[0]["confidence"] == "medium"

    def test_zone_outside_grid_is_dropped(self):
        rows = [{"zone_id": "z1", "zone_name": "Z", "lat": 60.0, "lon": 20.0,
                 "species": "bilberry", "suitability": 0.5}]
        grid = MagicMock()
        grid.score_points.return_value = [{"id": "z1", "coverage": "none", "scores": None}]
        assert _apply_scores(rows, grid, dt.date(2026, 8, 1)) == []

    def test_one_centroid_per_zone_sent_to_grid(self):
        """Two species in one zone → one point call, two output rows."""
        rows = [
            {"zone_id": "z1", "zone_name": "Z", "lat": 62.0, "lon": 25.0,
             "species": "bilberry", "suitability": 0.8},
            {"zone_id": "z1", "zone_name": "Z", "lat": 62.0, "lon": 25.0,
             "species": "lingonberry", "suitability": 0.6},
        ]
        grid = MagicMock()
        grid.score_points.return_value = [
            {"id": "z1", "coverage": "grid", "scores": {
                "bilberry": {"score": 75, "confidence": "medium", "ripeness": "ripe"},
                "lingonberry": {"score": 60, "confidence": "medium", "ripeness": "ripe"},
            }}
        ]
        result = _apply_scores(rows, grid, dt.date(2026, 8, 1))
        points_called = grid.score_points.call_args[0][0]
        assert len(points_called) == 1, "deduplicated to one centroid"
        assert len(result) == 2

    def test_species_missing_from_grid_scores_is_dropped(self):
        rows = [{"zone_id": "z1", "zone_name": "Z", "lat": 62.0, "lon": 25.0,
                 "species": "cloudberry", "suitability": 0.5}]
        grid = self._mock_grid("z1", {"bilberry": {"score": 50, "confidence": "low", "ripeness": "unripe"}})
        assert _apply_scores(rows, grid, dt.date(2026, 5, 1)) == []

    def test_multiple_zones(self):
        rows = [
            {"zone_id": "z1", "zone_name": "Z1", "lat": 62.0, "lon": 25.0,
             "species": "bilberry", "suitability": 0.8},
            {"zone_id": "z2", "zone_name": "Z2", "lat": 62.1, "lon": 25.1,
             "species": "bilberry", "suitability": 0.7},
        ]
        grid = MagicMock()
        _sc = {"bilberry": {"score": 80, "confidence": "medium", "ripeness": "ripe"}}
        _sc2 = {"bilberry": {"score": 70, "confidence": "medium", "ripeness": "ripe"}}
        grid.score_points.return_value = [
            {"id": "z1", "coverage": "grid", "scores": _sc},
            {"id": "z2", "coverage": "grid", "scores": _sc2},
        ]
        result = _apply_scores(rows, grid, dt.date(2026, 8, 1))
        assert len(result) == 2
        assert {r["zone_id"] for r in result} == {"z1", "z2"}


class TestRunOneRule:
    def _make_rule(self, rule_id="ripe_nearby", version="1.0.0"):
        rule = MagicMock()
        rule.rule_id = rule_id
        rule.version = version
        return rule

    @patch("app.modules.reasoning.job._fetch_zone_rows", return_value=[])
    @patch("app.modules.reasoning.job._write_run", return_value="run-uuid-001")
    @patch("app.modules.reasoning.job._write_alerts")
    @patch("app.modules.reasoning.service.alerts_from_rule", return_value=[])
    def test_ok_path_returns_run_result(self, _mock_alerts, mock_write_alerts, mock_write_run, mock_fetch):
        from app.modules.reasoning.job import run_one_rule

        result = run_one_rule(
            db_url="postgresql://test",
            ontology_graph=MagicMock(),
            rule=self._make_rule(),
            zone_grid=MagicMock(score_points=MagicMock(return_value=[])),
            as_of=dt.date(2026, 8, 1),
        )

        assert result.status == "ok"
        assert result.rule_id == "ripe_nearby"
        assert result.rule_version == "1.0.0"
        assert result.run_id == "run-uuid-001"
        assert result.alert_count == 0
        mock_write_run.assert_called_once()
        mock_write_alerts.assert_called_once_with("postgresql://test", "run-uuid-001", [])

    @patch("app.modules.reasoning.job._fetch_zone_rows", side_effect=RuntimeError("db down"))
    @patch("app.modules.reasoning.job._write_run", return_value="run-uuid-002")
    def test_db_error_returns_failed_result(self, mock_write_run, _mock_fetch):
        from app.modules.reasoning.job import run_one_rule

        result = run_one_rule(
            db_url="postgresql://test",
            ontology_graph=MagicMock(),
            rule=self._make_rule(),
            zone_grid=MagicMock(),
            as_of=dt.date(2026, 8, 1),
        )

        assert result.status == "failed"
        assert "db down" in (result.error or "")
        mock_write_run.assert_called_once()
        written = mock_write_run.call_args[0][1]
        assert written.status == "failed"

    @patch("app.modules.reasoning.job._fetch_zone_rows", return_value=[])
    @patch("app.modules.reasoning.job._write_run", return_value="run-uuid-003")
    @patch("app.modules.reasoning.job._write_alerts")
    @patch("app.modules.reasoning.service.alerts_from_rule", return_value=[])
    def test_duration_ms_is_non_negative(self, _m_a, _m_wa, _m_wr, _m_f):
        from app.modules.reasoning.job import run_one_rule

        result = run_one_rule(
            db_url="postgresql://test",
            ontology_graph=MagicMock(),
            rule=self._make_rule(),
            zone_grid=MagicMock(score_points=MagicMock(return_value=[])),
            as_of=dt.date(2026, 8, 1),
        )
        assert result.duration_ms >= 0


class TestRunReasoning:
    @patch("app.modules.reasoning.job._fetch_zone_rows", return_value=[])
    @patch("app.modules.reasoning.job._write_run", return_value="run-uuid-multi")
    @patch("app.modules.reasoning.job._write_alerts")
    @patch("app.modules.reasoning.service.alerts_from_rule", return_value=[])
    def test_one_result_per_rule(self, _ma, _mwa, _mwr, _mf):
        from app.modules.reasoning.job import run_reasoning

        rules = [MagicMock(rule_id=f"rule_{i}", version="1") for i in range(3)]
        for r in rules:
            r.rule_id = f"rule_{rules.index(r)}"
            r.version = "1"
        grid = MagicMock(score_points=MagicMock(return_value=[]))

        results = run_reasoning("postgresql://test", MagicMock(), rules, grid, as_of=dt.date(2026, 8, 1))
        assert len(results) == 3
        assert all(r.status == "ok" for r in results)
