# deploy/ — production (owners: Sabih, Sayeem for CI)

One EU VM (Hetzner Helsinki or CSC cPouta — decide in sprint 1) running docker compose with
three containers: the backend image, Postgres/PostGIS/h3 and Caddy (automatic HTTPS).
Photos, tiles, models and backups go to an S3-compatible bucket. Design: architecture doc §14.

Files to add here (sprint 3, D20):
* `docker-compose.prod.yml` — `api` (ghcr.io/…/bpa-backend:${TAG}), `db` (built from `../docker/postgres`), `caddy`
* `Caddyfile` — `api.<domain>` → `api:8000`
* `backup.sh` — nightly `pg_dump` to the bucket, 14 days kept; restore tested once per sprint

CI/CD: GitHub Actions on merge to `main` → build image → GHCR → SSH → `docker compose pull && up -d`
→ `alembic upgrade head` → hit `/health`. App binaries via EAS Build on tag `app-v*`.

Local development uses `../docker-compose.dev.yml` (Postgres + MinIO), not this folder.
