"""Daily run_reasoning job: score zones, run SPARQL rules, write alerts tables.

Postgres reads and writes use lazy SQLAlchemy imports so this module can be
imported without SQLAlchemy installed (the backend[job] extra is optional).

Typical call flow (APScheduler or HTTP trigger):
    rows  = _fetch_zone_rows(db_url, as_of)          # zones + suitability
    rows  = _apply_scores(rows, zone_grid, as_of)    # merge ML scores in
    alerts = alerts_from_rule(graph, rows, rule)     # SPARQL rule
    run_id = _write_run(db_url, result)              # alert_rules_log
    _write_alerts(db_url, run_id, alerts)            # alerts
"""
from __future__ import annotations

import datetime as dt
import logging
import time
from dataclasses import dataclass

from app.modules.reasoning.service import Alert

log = logging.getLogger(__name__)


@dataclass
class RunResult:
    rule_id: str
    rule_version: str
    zone_count: int
    alert_count: int
    status: str          # ok | failed
    duration_ms: int
    error: str | None = None
    run_id: str | None = None


def _fetch_zone_rows(db_url: str, as_of: dt.date) -> list[dict]:
    """Read zone centroids + per-species suitability from Postgres."""
    from sqlalchemy import create_engine, text

    sql = text("""
        SELECT z.id::text                           AS zone_id,
               COALESCE(z.name, z.id::text)         AS zone_name,
               ST_Y(z.centroid::geometry)::real     AS lat,
               ST_X(z.centroid::geometry)::real     AS lon,
               zs.species,
               zs.suitability::float                AS suitability
        FROM zones z
        JOIN zone_species zs ON zs.zone_id = z.id
        WHERE zs.suitability >= 0.30
        ORDER BY z.id, zs.species
    """)
    eng = create_engine(db_url, future=True)
    with eng.connect() as conn:
        return [dict(r) for r in conn.execute(sql).mappings()]


def _apply_scores(
    zone_rows: list[dict],
    zone_grid,
    as_of: dt.date,
) -> list[dict]:
    """Call ZoneGrid.score_points on unique centroids; merge scores back into rows.

    Zones whose centroid falls outside the grid are silently dropped — the grid
    covers 60 x 60 km around Jyväskylä, so a zone in Lapland has no score.
    """
    seen: dict[str, dict] = {}
    for r in zone_rows:
        zid = r["zone_id"]
        if zid not in seen:
            seen[zid] = {"id": zid, "lat": r["lat"], "lon": r["lon"]}

    scored = zone_grid.score_points(list(seen.values()), date=as_of)
    scores_by_zone = {s["id"]: s["scores"] for s in scored if s.get("scores")}

    out = []
    for r in zone_rows:
        zone_scores = scores_by_zone.get(r["zone_id"])
        if zone_scores is None:
            continue
        sp_score = zone_scores.get(r["species"])
        if sp_score is None:
            continue
        out.append({**r, "score": sp_score["score"], "confidence": sp_score["confidence"],
                    "ripeness": sp_score["ripeness"]})
    return out


def _write_run(db_url: str, result: RunResult) -> str:
    """Insert one alert_rules_log row; returns its uuid as text."""
    from sqlalchemy import create_engine, text

    eng = create_engine(db_url, future=True)
    with eng.begin() as conn:
        run_id = conn.execute(text("""
            INSERT INTO alert_rules_log
              (rule_id, rule_version, zone_count, alert_count, status, error, duration_ms)
            VALUES (:rule_id, :rule_version, :zone_count, :alert_count, :status, :error, :duration_ms)
            RETURNING id::text
        """), {
            "rule_id": result.rule_id, "rule_version": result.rule_version,
            "zone_count": result.zone_count, "alert_count": result.alert_count,
            "status": result.status, "error": result.error, "duration_ms": result.duration_ms,
        }).scalar_one()
    return run_id


def _write_alerts(db_url: str, run_id: str, alerts: list[Alert]) -> None:
    """Insert alert rows linked to a alert_rules_log run."""
    if not alerts:
        return
    from sqlalchemy import create_engine, text

    eng = create_engine(db_url, future=True)
    with eng.begin() as conn:
        for a in alerts:
            conn.execute(text("""
                INSERT INTO alerts
                  (run_id, zone_id, species, rule_id, rule_version, score, confidence,
                   ripeness, suitability, ecology_verified, sentence, place,
                   zone_number, zone_iri, species_iri, name_en, name_fi)
                VALUES
                  (:run_id, :zone_id::uuid, :species, :rule_id, :rule_version, :score,
                   :confidence, :ripeness, :suitability, :ecology_verified, :sentence,
                   :place, :zone_number, :zone_iri, :species_iri, :name_en, :name_fi)
            """), {
                "run_id": run_id, "zone_id": a.zone_id, "species": a.species,
                "rule_id": a.rule_id, "rule_version": a.rule_version,
                "score": a.score, "confidence": a.confidence, "ripeness": a.ripeness,
                "suitability": a.suitability, "ecology_verified": a.ecology_verified,
                "sentence": a.sentence, "place": a.place,
                "zone_number": a.zone_number, "zone_iri": a.zone_iri,
                "species_iri": a.species_iri, "name_en": a.name_en, "name_fi": a.name_fi,
            })


def make_alerts_source(db_url: str):
    """Return a callable the router uses for GET /api/v1/alerts (latest run, no user filter)."""
    def _source() -> list[Alert]:
        from sqlalchemy import create_engine, text

        eng = create_engine(db_url, future=True)
        with eng.connect() as conn:
            rows = conn.execute(text("""
                SELECT DISTINCT ON (zone_id, species)
                    zone_id::text, species, rule_id, rule_version,
                    score::int, confidence, ripeness, suitability::float,
                    ecology_verified, sentence, place, zone_number,
                    zone_iri, species_iri, name_en, name_fi
                FROM alerts
                ORDER BY zone_id, species, computed_at DESC
                LIMIT 500
            """)).mappings()
            return [
                Alert(
                    rule_id=r["rule_id"], rule_version=r["rule_version"],
                    zone_id=r["zone_id"], zone_iri=r["zone_iri"],
                    zone_number=r["zone_number"], place=r["place"],
                    species=r["species"], species_iri=r["species_iri"],
                    name_en=r["name_en"], name_fi=r["name_fi"],
                    score=int(r["score"]), confidence=r["confidence"],
                    suitability=float(r["suitability"]), ripeness=r["ripeness"],
                    ecology_verified=bool(r["ecology_verified"]),
                    sentence=r["sentence"],
                )
                for r in rows
            ]
    return _source


def run_one_rule(
    db_url: str,
    ontology_graph,
    rule,
    zone_grid,
    as_of: dt.date | None = None,
) -> RunResult:
    """Score zones and run one SPARQL rule; write alert_rules_log + alerts. Returns the result."""
    from app.modules.reasoning.service import alerts_from_rule

    if as_of is None:
        from berry_ml import today_helsinki
        as_of = today_helsinki()

    t0 = time.monotonic()
    try:
        zone_rows = _fetch_zone_rows(db_url, as_of)
        scored_rows = _apply_scores(zone_rows, zone_grid, as_of)
        alerts = alerts_from_rule(ontology_graph, scored_rows, rule)

        duration_ms = int((time.monotonic() - t0) * 1000)
        result = RunResult(
            rule_id=rule.rule_id, rule_version=rule.version,
            zone_count=len({r["zone_id"] for r in scored_rows}),
            alert_count=len(alerts), status="ok", duration_ms=duration_ms,
        )
        run_id = _write_run(db_url, result)
        result.run_id = run_id
        _write_alerts(db_url, run_id, alerts)
        log.info("rule %s: %d alerts from %d zones in %d ms",
                 rule.rule_id, len(alerts), result.zone_count, duration_ms)
        return result

    except Exception as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        log.exception("rule %s failed", getattr(rule, "rule_id", "?"))
        result = RunResult(
            rule_id=getattr(rule, "rule_id", "unknown"),
            rule_version=getattr(rule, "version", "unknown"),
            zone_count=0, alert_count=0, status="failed",
            duration_ms=duration_ms, error=str(exc),
        )
        try:
            _write_run(db_url, result)
        except Exception:
            log.exception("could not write failure row to alert_rules_log")
        return result


def run_reasoning(
    db_url: str,
    ontology_graph,
    rules: list,
    zone_grid,
    as_of: dt.date | None = None,
) -> list[RunResult]:
    """Run all rules; one RunResult per rule."""
    return [run_one_rule(db_url, ontology_graph, rule, zone_grid, as_of) for rule in rules]
