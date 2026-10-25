# ADR-002 — Feature-based modules with a public entry point

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner, engineering (bootstrap specification §7, §9)

## Context

The application will grow to a dozen distinct capabilities (auth, map, visits,
feedback, alerts, analytics, marketplace, rewards, safety). Organising by
technical type alone (`components/`, `screens/`, `api/`) spreads each capability
across the tree and makes boundaries invisible: nothing prevents a screen from
reaching into another area's internals, and AI agents and new engineers cannot
tell what is safe to change.

The specification requires feature-based organisation, separation of UI from
business logic, and testable business rules.

## Decision

Every capability is a **feature slice** under `src/features/<feature>/` with the
internal structure `domain/`, `hooks/`, `components/`, `services/`, and a single
public entry point `index.ts`. Consumers — routes in `src/app/**` and other
features — import only from `features/<feature>` (the entry point). A feature's
internal files are private.

Layering and dependency direction:

```
routes (src/app) → feature public API → feature internals → shared
   (components/atoms|molecules|organisms|templates, config, constants, hooks, utils)
```

Rules: shared code never imports from `features/**`; features never import another
feature's internals; business rules live in pure `domain/` modules with no React
and no I/O.

`src/features/visits` is the working reference implementation of this shape; the
earlier initialization example, `src/features/diagnostics`, was retired on
2026-10-08. The decision above is unchanged.

## Alternatives considered

1. **Type-based folders only** (`src/screens`, `src/api`, `src/store`) — familiar,
   but boundaries erode silently and changes touch many unrelated folders.
   Rejected.
2. **Full modular monorepo** (one npm package per feature) — strong enforcement via
   package boundaries, but heavy tooling and friction for a small team. Rejected
   for now; the `index.ts` boundary keeps the option open.
3. **Redux-style "domain" slices only** — models transport/state concerns but not
   UI ownership. Rejected.

## Consequences

Positive: a change stays inside one folder; deleting or rewriting a feature is
safe; `domain/` is unit-testable without mocks; the entry point gives an obvious
seam for tests and for future extraction into a package.

Negative / accepted costs: an extra `index.ts` per feature; discipline is required
in review (a cross-feature internal import is a review blocker, not a compile
error); some genuinely shared code must be promoted to `components/`, `utils/` or
`models/` rather than shared privately.

## Related

- Bootstrap specification §7 (feature organisation) and §9 (business logic separation)
- ADR-003 (Atomic Design), ADR-004 (testing)
