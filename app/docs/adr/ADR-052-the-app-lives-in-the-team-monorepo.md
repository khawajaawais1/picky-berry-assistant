# ADR-052 — The app lives in the team monorepo at `app/`

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Project owner (Salman / Prottoy), with the team's repository as the destination
- **Supersedes:** [ADR-015](ADR-015-mobile-only-repository.md) (this repository is the mobile
  app, at the root) — decisions 1–3, and with them the mobile-only scope
- **Relates to:** [ADR-007](ADR-007-repository-layout.md), [ADR-011](ADR-011-backend-in-repo.md)
  (both already superseded, kept as history), [ADR-051](ADR-051-the-team-mvp-plan-becomes-the-apps-target.md)

## Context

The app was built in its own repository (`picky-org/picky-mobile-app`) under
[ADR-015](ADR-015-mobile-only-repository.md): the Expo package was the repository root, CI ran
unfiltered at that root, and the backend was explicitly outside it. That was correct while the
app was the only thing that existed.

The team then created the project repository, `picky-berry-assistant`: a monorepo holding the
backend (`backend/`), the data pipelines (`data/`), the ML work (`ml/`), the ontology
(`ontology/`), the deployment (`docker/`, `deploy/`) and the team's documentation (`docs/`, plus
the root `CONTEXT.md` and `CONTRIBUTING.md`). The frontend folder, `app/`, was a placeholder
README describing a layout that had not been built yet.

Two repositories for one product meant two CI systems, two sets of branch rules and a contract
that would have to be agreed across them. The team's plan puts the app and the API behind one
OpenAPI contract, and the app's own ADR-051 already adopted that plan.

## Decision

1. **The app moves into the team repository at `app/`.** It remains a standalone npm package —
   its own `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `jest.config.js`,
   `eslint.config.js` and tooling configs all live in `app/`. No npm workspace is introduced
   (ADR-007's reason still holds: nothing is shared yet).
2. **Every app command runs from `app/`.** Documentation, PR descriptions and agent
   instructions say so; a command written as if the repo root were the package is a defect.
3. **CI is path-filtered, not root-relative.** `.github/workflows/mobile.yml` sets
   `working-directory: app`, caches on `app/package-lock.json`, and triggers for `app/**` and
   for itself — the same shape as `data.yml`. The app's gate (typecheck, lint, format, tests,
   expo-doctor, then the Playwright layout/accessibility job) is unchanged.
4. **There is one long-lived branch, `main`.** The `dev` integration branch of the standalone
   repository is not recreated; branches are named after their feature id
   (`feat/6.3-geofence-refresh`, the root's convention) or as `<type>/<handle>/<topic>`, and
   every PR targets `main`.
5. **The app's documentation stays with the app.** `app/README.md`, `app/ARCHITECTURE.md`,
   `app/CONTEXT.md`, `app/PROJECT.md`, `app/SECURITY.md`, `app/TESTING.md`,
   `app/DEFINITION_OF_DONE.md`, `app/AGENTS.md`, `app/CONTRIBUTING.md` and `app/docs/` move as
   they are, and are the authority for how the app is built. Team-level facts (who owns what,
   the timeline, the API conventions, the feature catalogue) live in the root documents, which
   win where the two disagree. `app/CONTRIBUTING.md` defers to the root file for branching and
   the definition of done.
6. **`main`'s history is the record.** The standalone repository stays as the app's prior
   history; this ADR does not rewrite any accepted decision from it. Decisions that assumed the
   app was the whole repository are amended here or by a later ADR, not silently.

## Alternatives considered

1. **Keep the app in its own repository** — independent CI and deploy, and no Python toolchain
   in the app's checkout. Rejected: the API contract, the IDs and the feature catalogue now
   live here, and the team's definition of done is per folder; a second repository would make
   every contract change cross-repo coordination again.
2. **Nest the package (`apps/mobile`, as ADR-007 once had it)** — the same monorepo benefit with
   a deeper path. Rejected: `app/` is the folder the team already documented and CODEOWNERS
   assigns, and the extra segment buys nothing while one frontend exists.
3. **Adopt npm workspaces now** — one install command and a home for shared types later.
   Deferred, not rejected: nothing is shared yet, and it changes Expo/Metro module resolution
   before there is a reason (ADR-007 decision 4, ADR-011 decision 2).
4. **Keep a `dev` branch in the monorepo** — rejected: the root already works trunk-based on
   `main` with one review and green CI, and a second long-lived branch would need a promotion
   ritual the rest of the team does not follow.

## Consequences

Positive: the app, the API and the data the app mocks against (`data/test_zones.geojson`) are
one clone; a contract change is one PR; the team's branch, review and definition-of-done rules
apply to the app without translation; CI runs only for the folder it verifies.

Negative / accepted costs: the app's dev environment now sits in a repository with a Python
toolchain it does not use (the mobile workflow installs only Node); the app's documents are one
level deeper than the team's, so links and commands must name `app/` explicitly; the app's CI
does not run for a docs-only or backend-only PR, which is deliberate and means a required
"mobile" check would block unrelated PRs; the standalone repository's issues, PRs and Actions
history do not come along.

## Related

- Supersedes: ADR-015 (decisions 1–3). Already superseded history: ADR-007, ADR-011.
- Amended in place by this ADR: `README.md`, `ARCHITECTURE.md` §1–§2, `AGENTS.md` §1 and §7,
  `CONTRIBUTING.md` (branching and CI), `docs/api-contract.md` (status), `PROJECT.md`
  (decisions 20, stack, open question 3 — the app no longer owns the backend question).
- The team's own rules: [`../../../CONTRIBUTING.md`](../../../CONTRIBUTING.md),
  [`../../../CONTEXT.md`](../../../CONTEXT.md), [`../../../docs/architecture.md`](../../../docs/architecture.md).
