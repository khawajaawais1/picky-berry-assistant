# Feature catalogue

All 20 functions from the HW4 design, in three levels. Each **core** feature gets a deep
dive before it is built (copy [TEMPLATE.md](TEMPLATE.md) to `docs/features/<id>-<slug>.md`).
Update the **Status** column in the same PR that changes a feature.

Status: ⬜ not started · 📝 deep dive written · 🟡 in progress · ✅ done (acceptance criteria pass on staging)

## Core (MVP) — architecture doc §6

| ID | Feature | Backend module(s) | App screens | Lead · co-owners | Sprint | Deep dive | Status |
|----|---------|-------------------|-------------|------------------|--------|-----------|--------|
| 6.1 | Accounts and roles (picker, admin; buyer reserved) | `accounts` | Login / register, consent | Hassan · Salman, Sabih | 1–2 | — | ⬜ |
| 6.2 | Live site map with yield score & confidence | `zones`, `prediction`, `ingest` | Map home, zone sheet, near me | Awais, Hassan, Salman, Remon · Asmer, Sabih | 1–2 | [6.2-live-site-map.md](6.2-live-site-map.md) | 📝 data/ 🟡 |
| 6.3 | GPS visit detection (arrive / pick / leave) | `visits` | Active visit | Salman · Hassan | 2 | — | ⬜ |
| 6.4 | Feedback (rating, amount, photo) | `feedback`, `media` | Feedback | Hassan · Salman, Sabih, Remon (YOLO) | 2 | — | ⬜ |
| 6.5 | Validation and trust weighting | `trust` | — (shows in scores) | Hassan · Remon | 2 | — | ⬜ |
| 6.6 | Yield prediction (phenology baseline → XGBoost) | `prediction`, `ingest` | Zone sheet (why) | Remon · Awais | 2–3 | — | ⬜ |
| 6.7 | Reasoning and explainable push alerts | `reasoning` | Alerts inbox | Asmer · Sabih (FCM), Hassan | 3 | — | ⬜ |
| 6.8 | Analytics (median stay time, trends) | `analytics` | My stats, admin page | Hassan · Sayeem | 3 | — | ⬜ |
| 6.9 | Offline mode and privacy (GDPR) | `accounts`, all | Profile & privacy, offline area | Salman · Hassan | 3 | — | ⬜ |

## Desired extras — after core is stable (architecture doc §16 hooks)

| ID | Feature | Hook already in the MVP | Sprint | Status |
|----|---------|------------------------|--------|--------|
| E1 | Marketplace with escrow (listings, orders, chat, ratings, disputes) | `buyer` role, new `marketplace` module, payments behind a service interface (test mode) | 3–4 | ⬜ |
| E2 | Video analysis & fraud checks | media pipeline + job queue; `reports.flags` | 4 | ⬜ |
| E3 | Rewards, tiers, badge | trust + visit/report history stored | 4 | ⬜ |
| E4 | Safety: route back & SOS | phone keeps the GPS track locally → offline route back | 4 | ⬜ |
| E5 | Admin & verification tools | `admin` role, `/admin/*`, `audit_log` | 4 | ⬜ |

## Future developments — not in the course scope

| ID | Feature | Door left open by |
|----|---------|------------------|
| F1 | LLM assistant (FI/EN) | explanations and rules are structured data; add `/assistant` |
| F2 | Planner & multi-agent backend | modules expose service interfaces an agent can call as tools |
| F3 | Linked Data | ontology IRIs + JSON-LD `@context` already on the API |
| F4 | Drone & wild-bee data | new ingest pipeline writing extra `zone_features` columns |
| F5 | Cognitive zone judgement | plugs into the score fusion step like the yield model |
| F6 | Growing beyond Finland (microservices / Kubernetes) | module boundaries + one image with a `ROLE` switch |

## Cross-feature dependencies (who feeds whom)

```
6.1 accounts ─► every user-facing feature (JWT, roles, consent)
6.2 map ◄── data/ (zones, weather, NDVI, basemap) ◄── 6.6 prediction ◄── 6.5 trust ◄── 6.4 feedback ◄── 6.3 visits
6.7 alerts ◄── 6.2 scores + ontology rules (Asmer) ──► FCM (Sabih)
6.8 analytics ◄── 6.3 visits + 6.4 reports
6.9 offline/privacy ── cross-cutting: outbox + SQLite cache (app), export/delete (backend)
```
