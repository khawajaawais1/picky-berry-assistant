"""Pickers' reports -> updated zone score, and reporter trust (features 6.4, 6.5).

Rule v1 (tunable; the constants are at the top):

* Every report gives an **evidence score** 0-100:
  - photo:  min(100, 100 x berries of that species the detector counted / 30)
  - rating: (rating - 1) x 25           (1 -> 0, 3 -> 50, 5 -> 100)
  - both:   the photo score; if photo and rating disagree by more than 50 points the report's
            weight is halved (one of them is probably wrong)
* Each report has a **weight** = reporter trust (0-1) x freshness x (1.5 if it has a photo)
  where freshness = 0.5 ** (age in days / 7). Reports older than 28 days are ignored.
* The **new score** blends the map score (weight 1.0) with the weighted mean of the evidence:

      score = (1.0 x S_model + W x S_feedback) / (1.0 + W)

  So one fresh photo report from a fully trusted picker gives 40 % map + 60 % photo.
  Example: map 55, photo with 32 bilberries (photo score 100) -> 0.4 x 55 + 0.6 x 100 = 82.
* **Confidence**: high if W >= 2 and the newest report is at most 7 days old; at least medium if
  W >= 0.5; otherwise the map's own confidence.
* **Trust** starts at 0.5 and lives only on the server (never in a response about someone else).
  A report whose photo agrees with its rating (within 25 points) adds 0.05; one that disagrees by
  more than 50 points removes 0.10; trust stays between 0.05 and 1.0.
"""
from __future__ import annotations

import datetime as dt
from collections.abc import Sequence
from dataclasses import dataclass

MAP_WEIGHT = 1.0
PHOTO_BONUS = 1.5
PHOTO_FULL_COUNT = 30
HALF_LIFE_DAYS = 7.0
MAX_AGE_DAYS = 28.0
DISAGREE_POINTS = 50
AGREE_POINTS = 25
TRUST_START, TRUST_MIN, TRUST_MAX = 0.5, 0.05, 1.0
TRUST_UP, TRUST_DOWN = 0.05, 0.10
_CONF_ORDER = {"low": 0, "medium": 1, "high": 2}


@dataclass
class Report:
    created_at: dt.datetime
    rating: int | None = None         # 1-5, from the visit report
    photo_count: int | None = None    # detector count for THIS species, None if no photo
    reporter_trust: float = TRUST_START


def photo_score(count: int) -> float:
    return min(100.0, 100.0 * max(0, count) / PHOTO_FULL_COUNT)


def rating_score(rating: int) -> float:
    if not 1 <= rating <= 5:
        raise ValueError("rating must be 1-5")
    return (rating - 1) * 25.0


def evidence(report: Report) -> tuple[float | None, float]:
    """(evidence score, weight multiplier from the report's own content)."""
    if report.photo_count is not None:
        p = photo_score(report.photo_count)
        mult = PHOTO_BONUS
        if report.rating is not None and abs(p - rating_score(report.rating)) > DISAGREE_POINTS:
            mult *= 0.5
        return p, mult
    if report.rating is not None:
        return rating_score(report.rating), 1.0
    return None, 0.0


def freshness(created_at: dt.datetime, now: dt.datetime) -> float:
    age = max(0.0, (now - created_at).total_seconds() / 86400)
    return 0.0 if age > MAX_AGE_DAYS else 0.5 ** (age / HALF_LIFE_DAYS)


def update_zone_score(map_score: int, map_confidence: str, reports: Sequence[Report],
                      now: dt.datetime | None = None) -> dict:
    """Blend the map score with the zone's recent reports for ONE species."""
    now = now or dt.datetime.now(dt.UTC)
    total_w, total_e, newest = 0.0, 0.0, None
    used = 0
    for r in reports:
        e, mult = evidence(r)
        w = max(0.0, min(1.0, r.reporter_trust)) * freshness(r.created_at, now) * mult
        if e is None or w <= 0:
            continue
        total_w += w; total_e += w * e; used += 1
        newest = r.created_at if newest is None or r.created_at > newest else newest
    if total_w == 0:
        return {"score": int(map_score), "confidence": map_confidence, "sModel": int(map_score),
                "sFeedback": None, "evidenceWeight": 0.0, "reportsUsed": 0}
    s_fb = total_e / total_w
    score = (MAP_WEIGHT * map_score + total_w * s_fb) / (MAP_WEIGHT + total_w)
    conf = map_confidence
    if total_w >= 0.5 and _CONF_ORDER[conf] < 1:
        conf = "medium"
    if total_w >= 2.0 and (now - newest).total_seconds() <= 7 * 86400:
        conf = "high"
    return {"score": int(round(max(0, min(100, score)))), "confidence": conf, "sModel": int(map_score),
            "sFeedback": round(s_fb, 1), "evidenceWeight": round(total_w, 3), "reportsUsed": used}


def update_trust(trust: float, rating: int | None, photo_count: int | None) -> float:
    """New trust after one report. Only reports with both a photo and a rating move it."""
    if rating is None or photo_count is None:
        return trust
    diff = abs(photo_score(photo_count) - rating_score(rating))
    if diff <= AGREE_POINTS:
        trust += TRUST_UP
    elif diff > DISAGREE_POINTS:
        trust -= TRUST_DOWN
    return round(max(TRUST_MIN, min(TRUST_MAX, trust)), 3)
