# ADR-004 — TDD with Jest and React Native Testing Library

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner (bootstrap specification §10, §11, §12)

## Context

The application encodes rules that must not silently regress: GPS visit
detection, yield/trust scoring, offline queueing and synchronisation, duplicate
suppression, authorization and privacy rules. The specification requires TDD
(RED → GREEN → REFACTOR) and tests for those business rules.

The stack must work with React Native 0.86, React 19 and Expo SDK 57, and must run
fast enough to be part of every change.

## Decision

1. **TDD is mandatory** for behaviour: write the failing test first, confirm it
   fails for the expected reason, implement the minimum, refactor, then run the
   full suite with typecheck and lint. Exceptions (pure scaffolding: layout,
   config, docs) must be stated in the task report.
2. **Tooling:** Jest with the `jest-expo` preset + React Native Testing Library
   for behaviour-level rendering, plus `@types/jest` pinned to the Jest major.
3. **Placement:** tests are colocated in `src/**/__tests__/<name>.test.ts(x)` next
   to the code they cover, rather than in a top-level `tests/` folder as the
   bootstrap specification sketched — colocation keeps a test from being orphaned
   when a module moves, and `src/app/**` (routes) stay thin so they need no unit
   tests.
4. **Coverage:** collected from the start, thresholds deliberately deferred until
   product code exists; the behavioural contract (every business-critical rule has
   a test, including its rejection case) applies now.
5. **E2E** (Maestro) is planned for critical flows on a real build, not part of
   every pull request.

## Alternatives considered

1. **Top-level `tests/` tree** — mirrors the bootstrap sketch, but splits tests
   from the code they describe and invites stale fixtures. Rejected in favour of
   colocation (documented deviation).
2. **Detox for E2E** — deeper native integration, heavier setup and slower runs;
   Maestro is chosen for E2E when it arrives. Deferred, not rejected.
3. **Vitest / node:test** — excellent DX, but React Native component rendering
   support is not production-ready. Rejected.
4. **Snapshot-heavy testing** — cheap to write, brittle and behaviour-blind.
   Rejected; snapshots are not used.

## Consequences

Positive: business rules are verifiable without a device or a network; the pure
`domain/` layer keeps tests fast (68 tests run in ~1s); regressions surface in CI
rather than in the field; RNTL's async API (v14) enforces realistic interaction.

Negative / accepted costs: RNTL v14 requires `await render(...)` and
`await fireEvent.press(...)` — contributors accustomed to v12/13 will hit this;
jest-expo pins Jest 29, so Jest 30 features are unavailable until Expo moves;
component tests cover behaviour on the JS side only — device-specific regressions
still need manual or E2E verification.

## Related

- [TESTING.md](../../TESTING.md) for the operational details
- ADR-002 (feature modules with pure `domain/` layers)
