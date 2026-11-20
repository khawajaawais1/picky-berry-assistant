"""Season quality ("year index") per area and berry (feature 6.6).

v1 result, honestly: on leave-one-year-out tests (FMI weather 2000-2025 + Ruokavirasto harvest
statistics 2013-2025) no weather model beat the "normal year" baseline, so the shipped model
returns 1.0 for every berry (see models/yield/v1/metrics.json). The interface is kept so a better
model (e.g. one trained on pickers' reports) can replace the file without code changes.

    from berry_ml import YieldModel
    YieldModel().year_index("Ita-Suomi", "bilberry", weather={})   # -> 1.0
"""
from __future__ import annotations

import math
from pathlib import Path

import joblib
import numpy as np

from .paths import YIELD_PATH, YIELD_VERSION

AREAS = ("Lappi", "Oulu-Kainuu", "Ita-Suomi", "Lansi-Suomi")


class YieldModel:
    def __init__(self, path: Path | str = YIELD_PATH):
        b = joblib.load(path)
        self.models, self.areas, self.chosen = b["models"], b["areas"], b["chosen"]
        self.version = YIELD_VERSION

    def year_index(self, area: str, berry: str, weather: dict | None = None) -> float:
        """1.0 = normal year; clipped to 0.5-1.5. Berries without a model return 1.0."""
        weather = weather or {}
        m = self.models.get(berry)
        if m is None or m["kind"] == "baseline":
            return 1.0
        if m["kind"] == "frost_rule":
            return 0.7 if (weather.get("frost_days_flower") or 0) >= 2 else 1.0
        import pandas as pd  # only needed for real sklearn models
        row = {**{f: weather.get(f, np.nan) for f in m["cols"] if not f.startswith("area_")},
               **{f"area_{a}": int(a == area) for a in self.areas}}
        x = pd.DataFrame([row])[m["cols"]].astype(float).fillna(0)
        return float(min(1.5, max(0.5, math.exp(m["model"].predict(x)[0]))))
