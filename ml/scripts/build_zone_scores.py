"""Score a GeoJSON of zone polygons with the ML zone model and write the app's payload shape.

    cd ml
    python scripts/build_zone_scores.py --zones ../data/test_zones.geojson --date 2026-07-25 \
        --out out/pilot_zone_scores_2026-07-25.geojson

The output is a drop-in replacement for data/test_zones.geojson (same fields, "stub": false).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from berry_ml import YieldModel, ZoneGrid  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--zones", default=str(Path(__file__).resolve().parents[2] / "data" / "test_zones.geojson"))
ap.add_argument("--date", required=True, help="YYYY-MM-DD the scores are for")
ap.add_argument("--out", required=True)
a = ap.parse_args()

fc = json.loads(Path(a.zones).read_text(encoding="utf-8"))
out = ZoneGrid().score_zones(fc, date=a.date, year_index=YieldModel().year_index("Lansi-Suomi", "bilberry"))
Path(a.out).parent.mkdir(parents=True, exist_ok=True)
Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
missing = sum(1 for f in out["features"] if f["properties"].get("coverage") == "none")
print(f"wrote {a.out}: {len(out['features'])} zones, {missing} outside the forest grid")
