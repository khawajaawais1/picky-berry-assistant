# ADR-011 — The backend joins this repository as apps/api

> **Superseded on 2026-10-08 by [ADR-015](ADR-015-mobile-only-repository.md).** The
> owner declared this repository mobile-only, so the backend is **not** built here
> and where it lives is an open question again (PROJECT.md 3). The reasoning below is
> kept as history.

- **Status:** Superseded by [ADR-015](ADR-015-mobile-only-repository.md)
- **Date:** 2026-10-08
- **Deciders:** Project owner
- **Resolves:** ADR-007 decision 4 ("when the backend lands, revisit with a new ADR")

## Context

The mobile client needs an API that does not exist yet. ADR-007 placed the mobile
package in `apps/` precisely so a backend could join without restructuring, and
deferred the repository question to the owner. The owner decided on 2026-10-08 that
the FastAPI service is developed in this repository.

This matters because it fixes how the API contract evolves: in-repo means the
client and the contract can change in one commit, but it also means the two
codebases' dependency and CI concerns now share a repository.

## Decision

1. The backend lives at `apps/api` (Python/FastAPI) in this repository, alongside
   `apps/mobile`.
2. ADR-007's second decision still stands: **no npm workspace and no root
   package.json yet.** `apps/mobile` remains a standalone npm package with its own
   lockfile, and `apps/api` will own its Python dependency management. Workspaces
   are adopted only when shared code or lockstep versioning actually requires them,
   and the change that adopts them must include Metro verification (ADR-007
   decision 4).
3. CI gains an independent `api` job with its own path filter: a change touching
   `apps/api/**` must not run the mobile job and vice versa. The mobile gate stays
   as specified in ADR-008.
4. Cross-cutting contract changes (endpoints, payload shapes, auth header format)
   are a single commit touching both apps and the relevant documentation, never a
   coordinated pair of pull requests.

## Alternatives considered

1. **Separate repository** — independent ownership, deploy and access control, but
   every contract change becomes cross-repo coordination and shared types must be
   duplicated or published. Rejected as premature for a small team with one
   product.
2. **Adopt npm workspaces now, with the API in-repo** — one install command and a
   natural home for shared types, but it changes module resolution for Expo/Metro
   before there is anything to share. Deferred, not rejected.
3. **Generate the client from an OpenAPI document instead of sharing code** —
   keeps the two sides independent and is worth revisiting once the contract is
   stable; it adds a codegen step that has no buyer yet. Deferred.

## Consequences

Positive: the contract and its consumers change atomically; one CI can verify both
sides; the API can be run locally for the client without a second clone; open
questions 3 (backend) is closed.

Negative / accepted costs: the repository now hosts two toolchains, so contributors
need Node (mobile) and Python (api) locally and reviewers must check path filters;
backend deployment and secrets handling are not solved by this ADR and are still
open; a shared lockfile does not exist, so "it works on my machine" can still come
from one side's dependency drift.

## Related

- ADR-007 (repository layout), ADR-008 (mobile CI gate), PROJECT.md (open question 3)
- SECURITY.md (the API enforces everything the client must not be trusted for)
