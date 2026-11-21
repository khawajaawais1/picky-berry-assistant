"""Benchmark ZoneGrid.score_points: N zone centroids in one call (default 3,500).

    python scripts/benchmark_score_points.py            # the grid berry_ml loads (v2 if present)
    python scripts/benchmark_score_points.py --n 3500 --radius 400

Prints grid size, load time, scoring time and peak Python memory (tracemalloc) plus process RSS.
"""
from __future__ import annotations

import argparse
import resource
import sys
import time
import tracemalloc
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from berry_ml import ZoneGrid  # noqa: E402


def rss_mb() -> float:
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return r / 1024 / (1024 if sys.platform == "darwin" else 1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=3500)
    ap.add_argument("--radius", type=float, default=400)
    ap.add_argument("--date", default="2026-08-01")
    a = ap.parse_args()
    t0 = time.perf_counter()
    g = ZoneGrid()
    t_load = time.perf_counter() - t0
    rng = np.random.default_rng(42)
    lo0, la0, lo1, la1 = g.bounds
    pts = [{"id": str(i), "h3": f"h{i}", "lat": float(rng.uniform(la0, la1)), "lon": float(rng.uniform(lo0, lo1))}
           for i in range(a.n)]
    tracemalloc.start()
    t0 = time.perf_counter()
    res = g.score_points(pts, date=a.date, radius_m=a.radius)
    t_score = time.perf_counter() - t0
    peak = tracemalloc.get_traced_memory()[1] / 1e6
    tracemalloc.stop()
    covered = sum(r["coverage"] == "grid" for r in res)
    print(f"grid {g.version}: {len(g.lat):,} cells, loaded in {t_load:.2f} s")
    print(f"score_points: {a.n:,} points (radius {a.radius:.0f} m) in {t_score:.2f} s "
          f"({1000 * t_score / a.n:.2f} ms/point), {covered:,} covered")
    print(f"peak Python memory during scoring {peak:.0f} MB; process max RSS {rss_mb():.0f} MB")


if __name__ == "__main__":
    main()
