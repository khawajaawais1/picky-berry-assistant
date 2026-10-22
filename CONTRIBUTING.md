# Contributing to Picky

Short rules so 7 people can work on 9 core features (+ 5 extras) without stepping on each other.
Project brief: [CONTEXT.md](CONTEXT.md).

## 1. Everything is tied to a feature id

| Level | Ids |
|-------|-----|
| Core | 6.1 … 6.9 |
| Extras | E1 … E5 |
| Future | F1 … F6 |
| Cross-cutting | `infra`, `docs`, `ci` |

Catalogue: [docs/features/README.md](docs/features/README.md).

* **Issue** title `[6.3] Geofence set refresh every 2 km`, label `feature:6.3` + area label (`app`, `backend`, `data`, `ml`, `ontology`, `infra`).
* **Branch** `feat/6.3-geofence-refresh`, `fix/6.2-legend-colours`, `data/6.6-zone-features`, `docs/…`.
* **PR** title `[6.3] Refresh geofence set every 2 km`; body uses the PR template.
* **Commits** imperative and short: `Add IDW weights for zone weather`.

## 2. Starting a new core feature

1. Copy [docs/features/TEMPLATE.md](docs/features/TEMPLATE.md) to `docs/features/<id>-<slug>.md` and fill it with the lead + co-owners.
2. List its dependencies with a **stub** for each, so nobody waits.
3. Link it in the catalogue and set status 📝.
4. Create the issues on the board (GitHub Projects), one per deliverable, each with an owner.
5. If it changes a design decision, add an ADR in `docs/decisions/` (copy `0000-template.md`).

## 3. Pull requests

* Into `main` only; `main` is protected: **1 review + green CI**. CODEOWNERS requests the right reviewer.
* Keep PRs small (one deliverable). Draft PRs early are welcome.
* A PR that changes the API updates the OpenAPI spec in the same PR; the app regenerates its client.
* A PR that changes a table updates the Alembic migration **and** `docs/data-contract.md` if `data/` tables are involved.
* Update the feature's status in the catalogue when a deliverable lands.

## 4. Definition of done (per deliverable)

- [ ] Code + tests (every formula has a unit test; every endpoint has an API test including auth)
- [ ] Lint clean (ruff / ESLint) and CI green
- [ ] Docs updated (folder README, contract, ADR if a decision changed)
- [ ] Works with stubs **and** with the real dependency when it exists
- [ ] No secrets, no personal data, no big binaries in git
- [ ] FI + EN strings for anything user-facing

A **feature** is done when its acceptance criteria pass on staging with pilot data.

## 5. Module boundaries (backend)

* A module calls another module's `service.py` — never its tables or models directly.
* Each module owns its tables and migrations. Cross-module reads go through a service function or a view.
* Background work goes through the `jobs` table, not threads.

## 6. Data and files

* Secrets only in `.env` (copy `.env.example`); GitHub Actions secrets for CI.
* Large or reproducible files (`*.pbf`, `*.pmtiles`, `*.tif`, `*.parquet`, model weights, photos) go to object storage. `.gitignore` already blocks the common ones.
* Small test fixtures (< 1 MB) are fine in `tests/fixtures/`.

## 7. Versions

Pin exact versions in the first PR of each folder and record them in
[docs/versions.md](docs/versions.md). No upgrades mid-sprint.

## 8. Asking for help

Blocked for more than half a day → post in the team chat the same day with: what you tried,
what you need, from whom. Weekly 15-minute check-in for everything else.
