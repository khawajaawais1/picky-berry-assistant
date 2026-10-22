"""Growing-degree days (base 5 °C) accumulated from 1 April, per station and year.

* gdd_day        = max(0, tmean − base)
* gdd_since_apr1 = Σ gdd_day from 1 April of the same year (0 before 1 April)
* Gaps of ≤ 3 days in tmean are linearly interpolated per station; longer gaps add 0
  to the running sum (so GDD never decreases) and gdd_day stays NaN for those days.
"""
from __future__ import annotations

import pandas as pd

MAX_INTERP_DAYS = 3


def _interpolate_short_gaps(s: pd.Series, max_len: int) -> pd.Series:
    """Linear interpolation only inside gaps of ≤ max_len consecutive missing days."""
    missing = s.isna()
    run_id = (missing != missing.shift()).cumsum()
    run_len = missing.groupby(run_id).transform("sum")
    filled = s.interpolate(limit_area="inside")
    return s.where(~missing | (run_len > max_len), filled)


def add_gdd(daily: pd.DataFrame, base_c: float = 5.0, season_start: str = "04-01") -> pd.DataFrame:
    if daily.empty:
        return daily.assign(gdd_day=pd.Series(dtype=float), gdd_since_apr1=pd.Series(dtype=float))
    m, d = (int(x) for x in season_start.split("-"))
    out = []
    for fmisid, g in daily.groupby("fmisid", sort=False):
        g = g.copy()
        g["date"] = pd.to_datetime(g["date"])
        # reindex to a complete daily calendar so gaps are visible
        full = g.set_index("date").reindex(pd.date_range(g["date"].min(), g["date"].max(), freq="D"))
        full["fmisid"] = fmisid
        t = _interpolate_short_gaps(full["tmean_c"], MAX_INTERP_DAYS)
        gdd_day = (t - base_c).clip(lower=0)
        season_start_dates = pd.to_datetime(
            {"year": full.index.year, "month": m, "day": d})
        in_season = full.index >= season_start_dates.values
        gdd_day = gdd_day.where(in_season, 0.0)
        full["gdd_day"] = gdd_day
        full["gdd_since_apr1"] = gdd_day.fillna(0).groupby(full.index.year).cumsum()
        full = full.loc[full.index.isin(g["date"])]          # keep only observed days
        full.index.name = "date"
        out.append(full.reset_index())
    res = pd.concat(out, ignore_index=True)
    res["date"] = res["date"].dt.date
    res["gdd_day"] = res["gdd_day"].round(2)
    res["gdd_since_apr1"] = res["gdd_since_apr1"].round(2)
    return res
