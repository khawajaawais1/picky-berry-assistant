# ADR 0006 – NDVI via Process API tiles + local zonal stats

* **Status:** accepted · **Date:** 2026-10-22 · **Deciders:** Awais · **Feature(s):** 6.2, 6.6

## Context
The architecture doc suggests the Statistical API per zone. With ~4–5k zones, ~15 dekads per
season and 6 years of backfill that is hundreds of thousands of requests against a free quota.

## Decision
Request cloud-masked mean NDVI for ≤ 30 × 30 km tiles (UTM 35N, 20 m) per dekad (1–10, 11–20,
21–end of month) and compute per-zone means locally. Anomaly = NDVI − 2021–2025 mean for the
same dekad; missing → 0.

## Consequences
≈ 9 requests per dekad. Dekads keep bins identical across years (leap-safe). Rasterio is
needed in the worker.
