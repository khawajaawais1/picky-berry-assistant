"""Pickers' reports -> updated zone score, and reporter trust (features 6.4, 6.5).

Rule v2 (``zone-score-rules-v2``; the constants are at the top):

* Every report gives an **evidence score** 0-100 for ONE species:
  - rating only:  (rating - 1) x 25                      (1 -> 0, 3 -> 50, 5 -> 100)
  - photo only:   min(100, 100 x detector count / 30)    (a count of 0 is not evidence: leaf or
                  unripe photos give 0, so a photo alone with 0 berries is ignored)
  - both:         max(rating score, photo score)         (a photo can only raise a report)
* Each report has a **weight** = reporter trust (0-1) x recency x visit, where
  recency = 0.5 ** (age in days / 7) (0 after 28 days) and visit = 1.0 if the report is backed by
  a detected visit (``visit_backed``), else 0.5.
* The **new score** blends the map score (weight 1.0) with the weighted mean evidence:

      score = (1.0 x S_model + W x S_feedback) / (1.0 + W),   W = sum of the weights

  Example: map 55, one fresh visit-backed report from a fully trusted picker with a photo of
  32 bilberries (evidence 100): W = 1.0 -> 0.5 x 55 + 0.5 x 100 = 78.
* **Confidence**: high if W >= 2 and the newest used report is at most 7 days old; at least medium
  if W >= 0.5; otherwise the map's own confidence.
* **Trust** (``update_trust``) starts at 0.5 and stays between 0.05 and 1.0. A report **agrees** if
  its rating is within 1 star of ``zone_consensus`` (the mean rating of OTHER users' reports for
  that zone and species this week) OR the detector found the reported species in its photo
  (count > 0): +0.05. It **disagrees** if its rating is more than 1 star from the consensus and the
  photo does not confirm the species: -0.10. Anything else leaves trust unchanged. A photo can
  only raise trust, never lower it (lingonberry detection is weak; leaf or unripe photos give 0).
"""
from __future__ import annotations

import datetime as dt
from collections.abc import Sequence
from dataclasses import dataclass

from .paths import SCORE_RULES_VERSION

SPECIES = ("bilberry", "lingonberry", "cloudberry", "crowberry")
MAP_WEIGHT = 1.0
PHOTO_FULL_COUNT = 30
HALF_LIFE_DAYS = 7.0
MAX_AGE_DAYS = 28.0
VISIT_FACTOR = {True: 1.0, False: 0.5}
CONSENSUS_STARS = 1.0
TRUST_START, TRUST_MIN, TRUST_MAX = 0.5, 0.05, 1.0
TRUST_UP, TRUST_DOWN = 0.05, 0.10
_CONF_ORDER = {"low": 0, "medium": 1, "high": 2}
REPORT_REASONS = ("recent_reports_high", "recent_reports_low", "no_reports_baseline")


@dataclass
class Report:
    created_at: dt.datetime           # UTC; a naive datetime is read as UTC
    rating: int | None = None         # 1-5 stars, None if the picker gave no rating
    photo_count: int | None = None    # detector count for THIS species, None if no photo
    reporter_trust: float = TRUST_START
    visit_backed: bool = False        # the report is linked to a detected visit


def _utc(t: dt.datetime) -> dt.datetime:
    return t.replace(tzinfo=dt.UTC) if t.tzinfo is None else t.astimezone(dt.UTC)


def photo_score(count: int) -> float:
    return min(100.0, 100.0 * max(0, count) / PHOTO_FULL_COUNT)


def rating_score(rating: int) -> float:
    if not 1 <= rating <= 5:
        raise ValueError("rating must be 1-5")
    return (rating - 1) * 25.0


def evidence(report: Report) -> float | None:
    """The report's evidence score 0-100, or None if it carries no usable evidence."""
    r = rating_score(report.rating) if report.rating is not None else None
    p = photo_score(report.photo_count) if report.photo_count else None   # None or 0 -> no photo evidence
    if r is None:
        return p
    return r if p is None else max(r, p)


def recency(created_at: dt.datetime, now: dt.datetime) -> float:
    age = max(0.0, (_utc(now) - _utc(created_at)).total_seconds() / 86400)
    return 0.0 if age > MAX_AGE_DAYS else 0.5 ** (age / HALF_LIFE_DAYS)


freshness = recency  # v1 name


def report_weight(report: Report, now: dt.datetime) -> float:
    trust = max(0.0, min(1.0, report.reporter_trust))
    return trust * recency(report.created_at, now) * VISIT_FACTOR[bool(report.visit_backed)]


def update_zone_score(map_score: int, map_confidence: str, reports: Sequence[Report],
                      now: dt.datetime | None = None, map_explanation: dict | None = None) -> dict:
    """Blend the map score with the zone's recent reports for ONE species.

    Returns {score, confidence, s_model, s_feedback, evidence_weight, reports_used, explanation}.
    ``explanation`` is the map explanation (stored with the map score) with its report reason and
    report inputs updated; it is None when no ``map_explanation`` is passed.
    """
    now = _utc(now or dt.datetime.now(dt.UTC))
    total_w, total_e, newest, used, photo_ok = 0.0, 0.0, None, 0, False
    for r in reports:
        e = evidence(r)
        w = report_weight(r, now)
        if e is None or w <= 0:
            continue
        total_w += w; total_e += w * e; used += 1
        photo_ok = photo_ok or bool(r.photo_count)
        t = _utc(r.created_at)
        newest = t if newest is None or t > newest else newest
    if total_w == 0:
        out = {"score": int(map_score), "confidence": map_confidence, "s_model": int(map_score),
               "s_feedback": None, "evidence_weight": 0.0, "reports_used": 0}
        reason = "no_reports_baseline"
    else:
        s_fb = total_e / total_w
        score = (MAP_WEIGHT * map_score + total_w * s_fb) / (MAP_WEIGHT + total_w)
        conf = map_confidence
        if total_w >= 0.5 and _CONF_ORDER[conf] < 1:
            conf = "medium"
        if total_w >= 2.0 and (now - newest).total_seconds() <= 7 * 86400:
            conf = "high"
        out = {"score": int(round(max(0, min(100, score)))), "confidence": conf, "s_model": int(map_score),
               "s_feedback": round(s_fb, 1), "evidence_weight": round(total_w, 3), "reports_used": used}
        reason = "recent_reports_high" if s_fb >= map_score else "recent_reports_low"
    out["explanation"] = _with_reports(map_explanation, reason, photo_ok, out) if map_explanation else None
    return out


def _with_reports(map_explanation: dict, reason: str, photo_ok: bool, result: dict) -> dict:
    reasons = [c for c in map_explanation.get("reasons", [])
               if c not in REPORT_REASONS and c != "photo_confirms_species"]
    reasons.append(reason)
    if photo_ok:
        reasons.append("photo_confirms_species")
    inputs = {**map_explanation.get("inputs", {}), "reports_used": result["reports_used"],
              "evidence_weight": result["evidence_weight"]}
    return {**map_explanation, "rules_version": SCORE_RULES_VERSION, "reasons": reasons, "inputs": inputs}


def update_trust(trust: float, rating: int | None, photo_count: int | None,
                 species: str | None = None, zone_consensus: float | None = None) -> float:
    """New trust after one report (see the module docstring for the rule).

    trust: current trust 0.05-1.0 · rating: 1-5 or None · photo_count: detector count for the
    reported species, None if no photo · species: the reported species (validated) ·
    zone_consensus: mean rating 1-5 of OTHER users' reports for this zone and species this week,
    or None if there are none.
    """
    if species is not None and species not in SPECIES:
        raise ValueError(f"unknown species {species!r}")
    if rating is not None and not 1 <= rating <= 5:
        raise ValueError("rating must be 1-5")
    photo_confirms = bool(photo_count)
    near = rating is not None and zone_consensus is not None and abs(rating - zone_consensus) <= CONSENSUS_STARS
    far = rating is not None and zone_consensus is not None and abs(rating - zone_consensus) > CONSENSUS_STARS
    if photo_confirms or near:
        trust += TRUST_UP
    elif far:
        trust -= TRUST_DOWN
    return round(max(TRUST_MIN, min(TRUST_MAX, trust)), 3)
