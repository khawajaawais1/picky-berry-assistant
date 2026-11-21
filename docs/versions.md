# Pinned versions

Pin exact versions in the first PR of each folder and record them here (architecture doc §3).
No upgrades mid-sprint; an upgrade is its own PR with a one-line reason.

| Area | Package / tool | Version | Pinned in | By |
|------|----------------|---------|-----------|----|
| data | Python | 3.12.x | `data/pyproject.toml` (requires ≥ 3.11) | Awais |
| data | geopandas / shapely / pyproj / h3 | to pin after D2 | `data/pyproject.toml` | Awais |
| db | postgis/postgis | 17-3.5 + postgresql-17-h3 | `docker/postgres/Dockerfile` | Sabih + Hassan |
| app | Expo SDK | 58.0.19 | `app/package.json` | Salman |
| app | React Native | 0.88.0 | `app/package.json` | Salman |
| app | @maplibre/maplibre-react-native | — | `app/package.json` | Salman |
| backend | FastAPI / SQLAlchemy / Alembic | — | `backend/pyproject.toml` | Hassan |
| ml | Python | 3.11–3.13 (CI 3.12) | `ml/pyproject.toml` | Sayeem |
| ml | numpy / pandas / pillow / onnxruntime / joblib | 2.4.6 / 3.0.5 / 13.0.0 / 1.29.0 / 1.6.0 | `ml/requirements.txt` | Sayeem |
| ml | fastapi / uvicorn / python-multipart (reference service) | 0.165.0 / 0.54.0 / 0.32 | `ml/requirements-service.txt` | Sayeem |
| ml | ultralytics (training only, Kaggle) | 8.4.209 | `ml/notebooks/` | Remon |
| ontology | rdflib | 7.6.0 | `backend/pyproject.toml` | Asmer |
