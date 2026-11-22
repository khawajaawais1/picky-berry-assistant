# Changelog

All notable changes to the Picky Server API are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the API version in the OpenAPI
document follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `POST /api/v1/auth/password-reset` requests a reset link. It always answers `202`, whether or
  not the address has an account.
- `POST /api/v1/auth/password-reset/confirm` sets a new password with a single-use token that
  expires after one hour, and revokes every refresh token of the account.
- Migration `0006_password_reset_tokens` allows `reset_password` email tokens.
- `GET /api/v1/health`, matching the `/api/v1` prefix of every other route.
- Migration `0009_job_leases` gives the job queue worker-owned leases and heartbeats, with
  `claim_job()`, `heartbeat_job()`, `complete_job()`, `fail_job()` and `reap_stale_jobs()`.
- `GET /api/v1/admin/jobs` reports worker id, heartbeat, lease expiry, recovery count and a derived
  stuck state; operations health now checks expired leases and missed heartbeats.

### Changed

- Routing, request ids, the error envelope and validation are configured once in
  `src/configure-app.ts`, which `main.ts` and the e2e suite share.
- `npm run openapi:lint` validates all three OpenAPI documents, not only `zones.yaml`.

### Unchanged

- `GET /health` at the root still answers, for platform probes.
