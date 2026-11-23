# API expectations from the mobile app (Picky)

**Audience:** backend team (Hassan et al.) and anyone improving `picky-server`.  
**Source of truth for what the app sends/reads:** the mobile adapters in `app/src/` and the
served OpenAPI documents in `picky-server/docs/openapi/`.  
**Last updated:** 2026-11-23.

This document states, for each pending or recently-aligned feature, the **request and response
shapes the mobile app already expects**, so a backend change that breaks one of them is visible
before it ships. It is a *consumer contract*, not a replacement for the OpenAPI specs — when the
two disagree, the OpenAPI spec wins and the app adapter must be updated in the same PR.

Conventions (from `CONTEXT.md`): `/api/v1`, JWT bearer, RFC 9457 problem JSON, client-generated
UUIDs as idempotency keys, raw GPS never leaves the phone.

---

## 1. Already aligned (PR #54) — keep these stable

### Zones (feature 6.2)
- `GET /zones?bbox=&species=&zoom=` → GeoJSON `FeatureCollection`. Properties include
  `score` (0–100 int), `confidence` (`high|medium|low`), `ripeness`
  (`unripe|ripening|ripe|past|off_season`), `updated_at` (ISO-8601 with offset). **All five
  ripeness states must be accepted by both server and app.**
- `GET /zones/near?lat=&lng=&species=&sort=&radius_km=&limit=` → `{ origin, radius_km, zones[] }`.
  Distance mode returns `{ id, name, h3, centroid, distance_km }` (no score). Score mode returns
  the full scored shape. **The app does not call this with a live coordinate (privacy rule); it
  selects the 20 nearest polygons locally from `GET /zones`.** Do not require `species` for the
  distance sort.
- `GET /zones/{id}`, `/zones/{id}/explanation`, `/zones/{id}/history`, `GET /zones/snapshot`.
- Mobile expects `name` nullable → app applies the `Zone 5CF1B` fallback from the H3 cell.

### Visits (feature 6.3)
- `POST /visits` body `{ client_id, zone_id, started_at, ended_at, manual }`. **Must accept
  `Idempotency-Key` header equal to `client_id`.** Response `{ id, zone_id, zone_name,
  started_at, ended_at, duration_s, manual, status, reject_reason, idempotent_replay }`.
  Replays return 200, new records 201. Rejected visits are stored with `status: rejected` + reason
  (`invalid_range|in_future|too_short|too_long|zone_not_found|overlap`).
- `GET /visits?limit=&cursor=&status=` → `{ visits[], next_cursor }`.
- Raw GPS tracks are never accepted — only zone + timestamps.

---

## 2. Pending backend work — expected contracts

### 2.1 Feedback (feature 6.4) — `POST /reports`
Mobile sends (`ReportsApi.send`):
```json
{
  "client_id": "uuid (idempotency key)",
  "zone_id": "uuid",
  "species": "bilberry|lingonberry|cloudberry|crowberry",
  "rating": 1..5,
  "amount_kg": 0..500 (optional, 2 decimals),
  "minutes": 0..1440 (optional),
  "visit_id": "uuid (optional)",
  "recorded_at": "ISO-8601 instant"
}
```
Mobile expects: 2xx → recorded (even if body unreadable); 409/422 → refused; else retry.
**Missing on backend:** presigned upload URL for photos, YOLO photo analysis trigger, trust
weighting (`T = (agree+1)/(agree+disagree+2)`), fraud checks (visit-backed reports once per
zone/day, >10 reports/day flagged, >50 km from last visit flagged). Feedback without a visit
gets half weight.

### 2.2 Media / photos (feature 6.4)
- `POST /media/presigned-url` (or similar) → `{ upload_url, object_key }` so the app uploads
  bytes straight to S3-compatible storage, then tells the API to run YOLO.
- Constraints (SECURITY.md §7): JPEG/PNG/HEIC only, ≤25 MB image / 200 MB video, type verified
  from bytes, EXIF (incl. GPS) stripped, server-generated storage names.

### 2.3 Trust (feature 6.5)
- `user_trust` table, trust recomputation job, moderation endpoints (admin). App reads trust only
  indirectly via `trust: 'trusted'|'unverified'` on zone reports.

### 2.4 Yield prediction (feature 6.6)
- `prediction` module: phenology baseline → XGBoost, daily 07:00 job writing `zone_scores` /
  `zone_scores_current` with `score, confidence, ripeness, explanation, computed_at`.
- `explanation` must carry `inputs`, `reasons[]` (≥2 reason codes), `model_version`.
- Ripeness thresholds (GDD) per species still an open decision (Asmer).

### 2.5 Alerts (feature 6.7)
- `GET /alerts?lat=&lng=&limit=` → list of alerts with reason codes, already localized.
  Mobile reads `discover.alert.readFailed` on failure.
- FCM send path: backend stores device tokens from `POST /me/devices` (done) and sends pushes
  via FCM HTTP v1 using the service account JSON (provided). App deep-links into alerts on tap
  (`AlertNotifier.onTap` already wired).

### 2.6 Analytics (feature 6.8)
- `GET /me/season` → `{ year, visit_count, report_count, zones_visited, stay_hours,
  median_minutes, harvested_kg, kg_per_hour, harvest_by_report[] }`. Mobile parses this
  (`parseSeason`). Currently returns design sample data on app side.
- `GET /me/analytics` (admin) and admin analytics page — pending.

### 2.7 Account & privacy (features 6.1, 6.9)
Already implemented: `GET/PATCH /me`, `PATCH /me/privacy`, `POST /me/devices`, `POST /me/export`,
`DELETE /me`. Mobile expects:
- `GET /me` → `{ email, email_verified, nickname, lang, alert_radius_km, species_interest[],
  privacy_level }`.
- `PATCH /me` body `{ nickname?, alert_radius_km?, species_interest?, lang? }`.
- `PATCH /me/privacy` body `{ privacy_level }` → `{ privacy_level }`.
- `POST /me/export` → JSON document with sections `profile, consents, devices, visits, reports`.
- `DELETE /me` body `{ password }` → 204.
- **Still pending:** retention enforcement (12 months), backup/erasure path, account row carrying
  locale + consent timestamps (ADR-054).

### 2.8 Offline / sync (feature 6.9)
- Mobile has durable outbox (SQLite/Drizzle + AsyncStorage fallback) for reports and visits.
- Backend must be idempotent on `client_id` (already is for visits and reports).
- Offline tile packs: data team (Awais) delivers self-hosted basemap (ADR-031); app swaps URL.

---

## 3. Improvements to existing endpoints (mobile asks)

1. **`/zones/near` distance mode** — currently returns only centroids. If backend wants to support
   geofencing server-side, add `geometry` (polygon ring) to the distance response. Mobile does
   containment locally to avoid sending coordinates, but a server-side option helps other clients.
2. **`GET /zones` p95 < 300 ms** (A1) — at 3,000–6,300 zones; ensure spatial index on `geom`
   and `centroid` (migration `0002`).
3. **ETags / 304** — already on zones list/snapshot/detail; ensure `Cache-Control: private` and
   ETag on all read endpoints mobile caches.
4. **OpenAPI spec** — keep `docs/openapi/*.yaml` in sync with any new endpoint (mobile reads
   `/docs-json`).

---

## 4. Privacy constraints (non-negotiable, SECURITY.md §10)

- No raw GPS tracks stored, logged, or forwarded. Only zone id + timestamps + derived centroid.
- No coordinate in any request query from the mobile app (hence local geofence selection).
- Tokens and personal data never logged.
- All location-derived fields inherit the visit's retention policy (12 months, ADR-014). No
  production ship before retention is enforced.

---

## 5. Quick reference: mobile adapter → endpoint

| Mobile adapter | File | Endpoint(s) |
|---|---|---|
| `createApiZoneSource` | `app/src/features/discover/services/api-zone-source.ts` | `GET /zones` |
| `createApiZoneInsightSource` | `.../api-zone-insight-source.ts` | `GET /zones/{id}`, `/explanation`, `/history` |
| `createZoneSnapshotSource` | `.../zone-snapshot.ts` | `GET /zones/snapshot` |
| `createVisitsApi` | `app/src/features/visits/services/visits-api.ts` | `POST /visits`, `GET /visits` |
| `createReportsApi` | `app/src/services/reports/reports-api.ts` | `POST /reports`, `GET /zones/{id}/reports`, `GET /me/reports`, `GET /me/season` |
| `createAccountApi` | `app/src/features/privacy/services/account-api.ts` | `GET/PATCH /me`, `PATCH /me/privacy`, `POST /me/export`, `DELETE /me`, `POST /me/devices` |
| `createApiAlertsSource` | `app/src/features/discover/services/reasoning-alerts-source.ts` | `GET /alerts` |
| `createApiZoneInsightSource` | (above) | `GET /species` |