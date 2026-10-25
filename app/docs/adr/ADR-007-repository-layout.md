# ADR-007 — Repository layout: single app package, workspace later

> **Superseded on 2026-10-08 by [ADR-015](ADR-015-mobile-only-repository.md).** This
> repository is mobile-only and the application lives at the root, so the `apps/`
> prefix this ADR introduced no longer exists. The reasoning below is kept as
> history: it is why the layout was chosen while a backend was expected here.

- **Status:** Superseded by [ADR-015](ADR-015-mobile-only-repository.md)
- **Date:** 2026-10-08
- **Deciders:** Engineering (bootstrap specification §7, §35)

## Context

The specification sketches a monorepo (`apps/mobile`, and a backend to come). Only
the mobile application exists today; the backend is undecided (separate repository
or not). Choices now determine install, CI and tooling complexity for a small team
with a short timeline.

## Decision

1. The repository keeps the `apps/` prefix so a backend (`apps/api`) can join
   without restructuring.
2. **`apps/mobile` is a standalone npm package** with its own `package.json` and
   committed `package-lock.json`. There is intentionally **no root
   `package.json` and no npm workspace** at this stage: a single-package workspace
   adds hoisting and resolution questions to every Expo/Metro/jest-expo issue for
   no benefit while there is one package.
3. All commands run from `apps/mobile` (`npm --prefix apps/mobile …` from the
   repository root if needed). CI uses `working-directory: apps/mobile`.
4. When the backend lands, revisit with a new ADR: either workspace-hoisted
   packages or two independent packages with their own CI. If workspaces are
   adopted, Expo's monorepo guidance (Metro `watchFolders`, `nodeModulesPaths`)
   must be applied and verified in the same change.
5. Routes live in `apps/mobile/src/app/` (Expo Router convention) and all other
   code outside `src/app/`; this is the only deviation from the literal
   `apps/mobile/app/` sketch in the specification, and it exists because the
   `src/`-based template is what `expo-router` resolves by default.

## Alternatives considered

1. **Root npm workspace from day one** — better ergonomics for shared packages and
   a single `npm install`, but premature: it changes how Metro resolves modules and
   adds a failure mode to debug for a package that does not exist yet. Rejected for
   now (not permanently).
2. **Two repositories (mobile/backend)** — cleaner ownership boundaries and
   independent CI, but cross-cutting changes (API contract, shared types) become
   multi-repo coordination, which is expensive for a small team. Deferred to the
   owner's decision (PROJECT.md open question 3).
3. **Flat layout (`mobile/` at the root)** — no room for the backend later without
   a disruptive move. Rejected.
4. **Root *is* the mobile app, with the backend in `api/` and the operator surface
   in `admin/`** — raised again by the owner on 2026-10-08 and rejected for now:
   it is legitimate and common, but the root would then be mobile-specific
   (`app.json`, `eas.json`, `tsconfig`, `jest.config`, `eslint.config`,
   `package-lock.json`, `src/`), and "which files belong to the mobile app" would no
   longer be answerable by path — the mobile CI path filter would have to exclude
   `api/**` and `admin/**` by negation instead of matching `apps/mobile/**` exactly
   (ADR-011 relies on that symmetry for its independent backend job). Revisit only
   if the prefix becomes a daily friction that outweighs that; the move is
   mechanical while the repository still holds one app.

## Consequences

Positive: nothing to debug in module resolution today; CI is trivial; the backend
can be added without moving the mobile app; dependency installs are reproducible
per package.

Negative / accepted costs: paths in prose and CI always include `apps/mobile`; no
shared types package between client and server yet (types will be duplicated or
generated when the contract exists); adopting workspaces later requires a
deliberate migration with Metro verification.

## Related

- CONTRIBUTING.md (commands, CI), ARCHITECTURE.md §2, PROJECT.md (open question 3)
