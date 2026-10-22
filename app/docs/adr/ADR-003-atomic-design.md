# ADR-003 — Atomic Design for UI composition

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner (bootstrap specification §8)

## Context

The app needs a consistent visual language across many screens written by
different people with no dedicated designer yet. Without shared primitives, every
screen re-invents text styles, button states and card surfaces, and accessibility
behaviour (roles, accessible names, disabled/busy states) gets implemented
inconsistently.

The specification requires Atomic Design layers and forbids business logic inside
presentation components.

## Decision

Compose UI through the Atomic Design layers under `src/components/`:

```
atoms → molecules → organisms → templates → screens (src/app/**)
```

- `atoms/`: `AppText`, `AppButton` — typography, colour tone, accessibility states.
- `molecules/`: `Card`, `InfoRow` — group atoms into a reusable unit.
- `organisms/`: not yet populated; feature-level composite UI.
- `templates/`: `Screen` — owns safe area, background, content width and heading.
- Feature UI lives in `features/<feature>/components/` and composes shared
  layers; data and callbacks come in as props.

Supporting rules: all visual values come from `src/constants/theme.ts` (no
hard-coded colours, spacing or font sizes); presentation components contain no
business logic, no fetching and no authorisation; a component that does not fit a
layer is not forced into one.

## Alternatives considered

1. **Ad-hoc components with a shared style sheet** — fastest to start, but
   guarantees divergence and duplicated accessibility work. Rejected.
2. **A third-party component library** (Paper, Tamagui, gluestack) — saves time on
   primitives, but adds a runtime/theme dependency and a large surface to learn
   before we know our own design. Rejected for now; the token + primitive layer is
   thin enough that adopting one later remains possible.
3. **NativeWind/Tailwind-style utility classes** — concise, but stylings live in
   strings, which weakens type safety and token enforcement. Rejected.

## Consequences

Positive: consistent look and accessibility by construction; a visual change is a
token change; screens become declarative composition; the layering doubles as
review vocabulary.

Negative / accepted costs: an extra indirection for one-off styling; contributors
must know the vocabulary to place new components correctly; the layer taxonomy can
become dogma — mitigated by the explicit "do not force a component into a
category" rule.

## Related

- Bootstrap specification §8
- ADR-002 (feature modules), `ARCHITECTURE.md` §3.2
