# ADR-008 — Quality tooling: ESLint, Prettier, Jest gates in CI; hooks deferred

- **Status:** Accepted (item 5 amended by ADR-023: `npm run verify` now runs the formatting check too)
- **Date:** 2026-10-08
- **Deciders:** Engineering (bootstrap specification §5, §35 step 5)

## Context

The project needs enforced type checking, linting, formatting and tests without
slowing a small team down. The specification asks for appropriate TypeScript,
ESLint, Prettier and test configuration plus "git hooks where justified" and "CI
checks where applicable".

## Decision

1. **TypeScript** `strict`, path alias `@/*` → `src/*`, checked with `tsc --noEmit`
   as `npm run typecheck`. `tsconfig.json` sets `"types": ["jest"]` explicitly,
   because automatic `@types` inclusion did not pick up the Jest globals in this
   configuration.
2. **ESLint** 9 with a flat config (`eslint.config.js`) layering `eslint-config-expo`
   and `eslint-config-prettier` last so Prettier owns formatting rules.
3. **Prettier** 3 with repository-local settings (single quotes, 100 columns,
   trailing commas); `format:check` is a gate.
4. **Jest** via `jest-expo` (ADR-004).
5. **One command for the gate:** `npm run verify` = typecheck + lint + test.
   CI (`.github/workflows/mobile-ci.yml`) additionally runs `format:check` and
   `expo-doctor`, and only verifies — it never deploys or publishes.
6. **Git hooks (Husky + lint-staged) are deferred.** Rationale: the CI gate already
   blocks merge, and pre-commit hooks add install-time machinery and another way
   for a commit to fail on a machine that other tooling also configures. This is a
   conscious deferral, not an oversight; it will be revisited if the CI gate proves
   too slow to catch formatting/local-test mistakes.
7. **Bundle-affecting dependencies kept as a documented baseline:**
   `react-native-reanimated`, `react-native-worklets` and
   `react-native-gesture-handler` remain installed though no first-party code uses
   them yet. They are the animation/gesture baseline for navigation-era Expo apps;
   removing them narrows the options for the first interactive feature. All other
   Expo-template demo dependencies (`@expo/ui`, `expo-glass-effect`, `expo-symbols`,
   `expo-device`, `expo-image`, `expo-web-browser`, `expo-font`) were removed
   because nothing uses them — see "no unnecessary dependencies".

## Alternatives considered

1. **Husky + lint-staged pre-commit** — earlier feedback, but more moving parts and
   slower commits; deferred (see 6), not rejected.
2. **Biome** (lint + format in one fast tool) — attractive, but it would drop
   Expo's React Native lint rules and ESLint's ecosystem. Rejected.
3. **`expo lint` as the lint script** — thin wrapper over ESLint that also
   bootstraps config; using `eslint .` directly is explicit and avoids surprise
   config generation. Rejected.
4. **Enforcing coverage thresholds now** — the codebase is mostly scaffolding, so a
   percentage would be noise. Deferred to the first product feature (ADR-004).

## Consequences

Positive: a single command reproduces CI locally; formatting and lint disputes are
settled by tooling; no deploy credentials exist in CI (verification only);
dependency footprint is smaller than the template's.

Negative / accepted costs: contributors must run `npm run verify` themselves
(nothing enforces it before push); jest-expo pins Jest 29; `expo-doctor` runs over
the network in CI; the deferred hook decision must be revisited if quality
regressions reach review repeatedly.

## Related

- TESTING.md, CONTRIBUTING.md, .github/workflows/mobile-ci.yml, ADR-004
