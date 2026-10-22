# ADR 0003 – Zones are H3 resolution-8 hexagons of forest or mire

* **Status:** accepted (res 8 vs 9 revisited after the first walk test) · **Date:** 2026-10-22 · **Deciders:** Awais, Hassan · **Feature(s):** 6.2 and everything that uses zones

## Context
Scores, visits, reports and alerts all need one spatial unit with stable ids and cheap neighbours/aggregation.

## Decision
H3 resolution 8; keep a cell if ≥ 40 % is forest or mire; store the full hexagon; zone id =
uuid5(namespace, H3 index); zoomed-out map groups by the resolution-6 parent.

## Consequences
At 62° N a res-8 cell is ≈ 0.57 km² (not the 0.74 km² global mean): the 60 × 60 km pilot holds
6,271 cells and roughly 4,000–5,000 zones, more than the 3,000–4,000 in the architecture doc.
API payload and offline-pack size estimates must be re-checked with real zones.
