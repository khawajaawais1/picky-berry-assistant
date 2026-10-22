# ADR-015 — This repository is the mobile app, at the root

> **Superseded on 2026-10-22 by [ADR-052](ADR-052-the-app-lives-in-the-team-monorepo.md).**
> The app now lives at `app/` in the team's monorepo, so it is no longer the repository root
> and the repository is no longer mobile-only. The reasoning below is kept as history; read
> ADR-052 for the current layout, CI and branch rules.

- **Status:** Superseded by [ADR-052](ADR-052-the-app-lives-in-the-team-monorepo.md)
- **Date:** 2026-10-08
- **Deciders:** Project owner
- **Supersedes:** [ADR-007](ADR-007-repository-layout.md) (repository layout) and
  [ADR-011](ADR-011-backend-in-repo.md) (backend in this repository)

## Context

ADR-007 nested the application at `apps/mobile` so that a backend could join at
`apps/api` without restructuring, and ADR-011 then decided the FastAPI service would
live in this repository. On 2026-10-08 the owner decided that this GitHub repository
is **only** for the mobile application and that the app belongs at the repository
root; the backend and the operator surface (ADR-012) are separate projects.

That declaration removes the reason the `apps/` prefix existed. Keeping it would
nest the only package one level below the root for no benefit, while every command,
CI configuration and document paid the prefix.

## Decision

1. **The Expo application *is* the repository root:** `package.json`,
   `package-lock.json`, `app.json`, `tsconfig.json`, `jest.config.js`,
   `eslint.config.js`, `jest.setup.ts`, `src/`, `assets/` and the tooling configs are
   top level.
2. **No other package exists here.** The backend and the operator surface are not
   built in this repository; where they live is undeclared for now (PROJECT.md open
   question 3 is open again).
3. **CI runs at the root** with no `working-directory` and no path filter: in a
   repository that holds one application, every change is a change to that
   application, so it is verified (typecheck, lint, format, tests, expo-doctor).
   The cost is that documentation-only changes also run CI, which is accepted in
   exchange for a filter that cannot silently miss a file.
4. **Documentation was merged, not duplicated:** one root `README.md`, one root
   `.gitignore`, and one root `AGENTS.md` whose §10 holds the Expo/React Native
   specifics that previously lived in a nested `AGENTS.md`.
5. **Reintroducing a sibling package** (a backend, generated API types, an admin
   app) requires a new ADR and an explicit layout decision — never by quietly
   re-creating `apps/`.

## Alternatives considered

1. **Keep `apps/mobile`** — legitimate, and argued in ADR-007. Rejected by the
   owner: with the repository declared mobile-only, the prefix is friction (in
   commands, CI paths and every document) with no remaining benefit.
2. **Keep the app nested under a shorter name (`mobile/`)** — the same friction
   plus a rename. Rejected.
3. **Flat root now, decide the layout again if a sibling appears** — chosen. The
   move is mechanical while exactly one package exists; ADR-007 already warned that
   it gets more expensive with siblings.

## Consequences

Positive: paths are short and unambiguous (no prefix in commands, CI, docs or
code); the statement "this repository is the app" is literally true; CI needs no
path filter that could drift; the duplicated `.gitignore`/`README`/`AGENTS.md`
guidance is gone.

Negative / accepted costs: adding a backend later needs a deliberate layout
decision and an ADR; CI runs for documentation-only changes; the nested-AGENTS.md
convention (app-specific guidance next to the package) is gone, so all agent
guidance lives in one root file that must stay short enough to be read; ADR-007 and
ADR-011 remain in the log as superseded history and must not be read as current.

## Related

- Superseded: ADR-007, ADR-011. Unaffected: ADR-012 (the operator surface is out of
  this app), ADR-008 (quality tooling — the root-relative commands are now
  prefix-free)
- PROJECT.md ("Open questions" 3) and [AGENTS.md](../../AGENTS.md) §10
