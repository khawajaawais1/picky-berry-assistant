"""D11 – zone_species: which species can grow in which zone, with habitat suitability 0–1.

suitability = Σ_h fraction_h · rule[species][h] / Σ_h fraction_h  ×  fertility multiplier
Rows below ``min_suitability`` are dropped ("cannot occur here"). Rules live in
config/zone_species_rules.yaml and are owned by Asmer (verified: false until sourced).
"""
from __future__ import annotations

import hashlib
import json

import pandas as pd

from .config import CONFIG_DIR, load_yaml


def rules_version(rules: dict) -> str:
    digest = hashlib.sha1(json.dumps(rules, sort_keys=True).encode()).hexdigest()[:8]
    return f"rules-{digest}{'' if rules.get('verified') else '-unverified'}"


def suitability(habitat: dict[str, float], species_rules: dict[str, float],
                fertility: int | None = None, fert_mult: dict | None = None) -> float:
    total = sum(habitat.values())
    if total <= 0:
        return 0.0
    s = sum(frac * species_rules.get(h, 0.0) for h, frac in habitat.items()) / total
    if fertility is not None and fert_mult:
        s *= float(fert_mult.get(int(fertility), 1.0))
    return max(0.0, min(1.0, s))


def build_zone_species(zones: pd.DataFrame, rules: dict | None = None,
                       stub: bool = False) -> pd.DataFrame:
    """zones needs columns id, habitat (JSON str or dict), fertility_class."""
    rules = rules or load_yaml("zone_species_rules.yaml")
    species = list(rules["rules"].keys())
    if stub:  # D11 stub: every species allowed everywhere
        rows = [(zid, sp, 1.0) for zid in zones["id"] for sp in species]
        df = pd.DataFrame(rows, columns=["zone_id", "species", "suitability"])
        df["rules_version"] = "stub-all-allowed"
        return df

    min_s = float(rules.get("min_suitability", 0.0))
    fert = rules.get("fertility_multiplier", {}) or {}
    rows = []
    for zid, hab, fc in zip(zones["id"], zones["habitat"], zones.get("fertility_class",
                                                                        [None] * len(zones))):
        hab = json.loads(hab) if isinstance(hab, str) else (hab or {})
        fc = None if fc is None or pd.isna(fc) else int(fc)
        for sp in species:
            s = suitability(hab, rules["rules"][sp], fc, fert.get(sp))
            if s >= min_s:
                rows.append((zid, sp, round(s, 3)))
    df = pd.DataFrame(rows, columns=["zone_id", "species", "suitability"])
    df["rules_version"] = rules_version(rules)
    return df


__all__ = ["CONFIG_DIR", "build_zone_species", "rules_version", "suitability"]
