# ADR-001 — React Native + Expo as the mobile framework

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

The project needs one cross-platform mobile client for field use (iOS and
Android), delivered by a small team on a short timeline. An earlier architecture
proposal used Flutter. The team already has React Native/Expo experience, and the
bootstrap specification explicitly fixes React Native + Expo as the current
decision because that reduces learning cost and delivery risk.

## Decision

Build the mobile client with **React Native + Expo** (SDK 57), managed workflow
with continuous native generation, TypeScript everywhere, Expo Router for
navigation, EAS for builds/submissions/OTA updates.

`ios/` and `android/` are generated and never hand-edited. (The package location was
amended by [ADR-015](ADR-015-mobile-only-repository.md) and again by
[ADR-052](ADR-052-the-app-lives-in-the-team-monorepo.md): the app is the `app/` folder
root.)

## Alternatives considered

1. **Flutter** — strong performance and a single rendering pipeline, but would
   require the team to learn Dart, duplicates no existing skill, and the earlier
   proposal was already superseded by the owner's decision. Rejected.
2. **React Native without Expo (bare)** — maximum native control up front, but the
   team would own native tooling, upgrades and CI for a small MVP. Rejected:
   unnecessary complexity at this stage; Expo supports ejecting to a development
   build whenever a native module requires it.
3. **Web/PWA first** — no store distribution and faster iteration, but GPS-in-
   background, offline media capture, camera and push are materially weaker.
   Rejected for a field-use product.

## Consequences

Positive: fastest path for the existing team; large module ecosystem; EAS removes
local native build infrastructure; Expo Router gives file-based routing with typed
routes; React Compiler is available.

Negative / accepted costs: Expo SDK upgrades every release must be applied
deliberately (SDK-level breaking changes are real); Expo Go cannot load custom
native modules, so a development build is required once one is added; some
libraries need `npx expo install` to get SDK-compatible versions.

## Related

- Bootstrap specification §6 (framework change requires analysis, approval,
  updated architecture documentation and an ADR — this record is that artefact)
- ADR-007 (repository layout), ADR-008 (tooling)
