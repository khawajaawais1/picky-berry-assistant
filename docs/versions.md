# Pinned versions

Pin exact versions in the first PR of each folder and record them here (architecture doc §3).
No upgrades mid-sprint; an upgrade is its own PR with a one-line reason.

| Area | Package / tool | Version | Pinned in | By |
|------|----------------|---------|-----------|----|
| data | Python | 3.12.x | `data/pyproject.toml` (requires ≥ 3.11) | Awais |
| data | geopandas / shapely / pyproj / h3 | to pin after D2 | `data/pyproject.toml` | Awais |
| db | postgis/postgis | 17-3.5 + postgresql-17-h3 | `docker/postgres/Dockerfile` | Sabih + Hassan |
| app | Expo SDK | — | `app/package.json` | Salman |
| app | @maplibre/maplibre-react-native | — | `app/package.json` | Salman |
| backend | FastAPI / SQLAlchemy / Alembic | — | `backend/pyproject.toml` | Hassan |
| ml | ultralytics / onnxruntime / xgboost | — | `ml/requirements.txt` | Remon |
| ontology | rdflib | — | `backend/pyproject.toml` | Asmer |
