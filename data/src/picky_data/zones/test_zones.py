"""D10 stub: 50 test zones around Laajavuori (Jyväskylä) in the exact GET /zones shape.

Lets Salman (app) and Hassan (API mocks) work before real zones exist. Each feature's
``properties`` matches the backend's ``ZoneProps`` for species=bilberry, plus
``forest_type`` and per-species scores in ``scores`` for the zone sheet.
Deterministic: the same file is produced on every run.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

import h3

from .h3_grid import cell_polygon, zone_id

CENTER = (62.2565, 25.6900)          # Laajavuori, NW Jyväskylä (lat, lng)
SPECIES = ("bilberry", "lingonberry", "cloudberry", "crowberry")
FOREST_TYPES = ("forest_spruce", "forest_pine", "forest_mixed", "mire", "forest_broadleaf")
RIPENESS = ("unripe", "ripening", "ripe", "past")
UPDATED_AT = "2026-08-03T07:02:00+03:00"   # mid-season so the mock shows ripe berries


def _confidence(r: random.Random) -> str:
    return r.choices(["high", "medium", "low"], weights=[2, 3, 5])[0]


def make_test_zones(n: int = 50, res: int = 8, seed: int = 62) -> dict:
    origin = h3.latlng_to_cell(*CENTER, res)
    cells = sorted(h3.grid_disk(origin, 5), key=lambda c: (h3.grid_distance(origin, c), c))[:n]
    r = random.Random(seed)
    features = []
    for i, cell in enumerate(cells, start=1):
        ftype = r.choice(FOREST_TYPES)
        scores = {}
        for sp in SPECIES:
            base = {"mire": {"cloudberry": 70, "crowberry": 50}, "forest_spruce": {"bilberry": 75},
                    "forest_pine": {"lingonberry": 75, "crowberry": 45}}.get(ftype, {}).get(sp, 35)
            scores[sp] = {
                "score": max(0, min(100, int(r.gauss(base, 15)))),
                "confidence": _confidence(r),
                "ripeness": r.choice(RIPENESS),
            }
        props = {
            "h3": cell,
            "name": f"Laajavuori {i}",
            "species": "bilberry",
            **scores["bilberry"],
            "updated_at": UPDATED_AT,
            "forest_type": ftype,
            "scores": scores,
            "stub": True,
        }
        features.append({
            "type": "Feature",
            "id": zone_id(cell),
            "geometry": json.loads(json.dumps(cell_polygon(cell).__geo_interface__)),
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features}


def write_test_zones(path: Path) -> Path:
    fc = make_test_zones()
    for f in fc["features"]:      # round coordinates to 6 dp (~0.1 m), as the API does
        f["geometry"]["coordinates"] = [[[round(x, 6), round(y, 6)] for x, y in ring]
                                        for ring in f["geometry"]["coordinates"]]
    path.write_text(json.dumps(fc, ensure_ascii=False, indent=1), encoding="utf-8")
    return path
