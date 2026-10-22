# ADR 0002 – React Native + Expo for the mobile app (replaces Flutter)

* **Status:** accepted · **Date:** 2026-10-20 · **Deciders:** team · **Feature(s):** all app features

## Context
HW4 slides and the presentation script said Flutter. Salman (Prottoy), who builds the app,
works in React Native.

## Decision
React Native with Expo (TypeScript, dev client, EAS Build); MapLibre React Native for maps
(MapLibre does not run in Expo Go → dev builds from week 1).

## Consequences
iOS builds without a Mac via EAS. HW4 deck slides 13, 14, 17, the architecture PNGs and the
script still say Flutter — update them before reuse.
