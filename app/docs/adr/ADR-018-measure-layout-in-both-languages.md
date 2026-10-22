# ADR-018 — Layout is measured in every shipped language, in CI

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner

## Context

The design file is authored in English and the app ships in Finnish and English
(ADR-017). Finnish runs longer, so a translated string can wrap onto a line the frame
does not draw, or push a block past its box — and nothing in the Jest suite can see it.
React Native Testing Library has no layout engine: `toHaveStyle` proves the font size
and the string, never the line the engine paints.

Screen 01's third promise tag was exactly that defect. “Yksityinen luonnostaan” is 22
characters, which does not fit a third of the content column at 12 px semibold; it
wrapped to two lines and moved everything under it down. It was found by measuring the
running app in a browser by hand, and reworded to “Yksityinen oletus”. A character
budget in the catalogue test now holds the three tags to one line, but that is a proxy
for one element: it encodes a guess about one string in one box, it cannot fail on a
clip, and it says nothing about any other screen.

## Decision

1. **A browser harness measures every built screen in every shipped language**, at the
   frame's 390 px width: `e2e/`, run by `npm run test:layout`, on Playwright pinned to an
   exact version (1.63.0 — its browser build is version-locked, so a range would ask for
   a browser the machine does not have). The harness builds the static web export
   (`expo export --platform web`), serves it (`expo serve`) and drives a real browser
   against it, so the numbers come from an engine that lays text out.
2. **The language is the browser context's locale**, not a test-only override: the app
   resolves its language through `useLocales()` → `navigator.languages`, so the harness
   exercises the same path a Finnish phone does. The measurement waits for the locale's
   own copy to appear first, so a broken locale path fails instead of measuring English.
3. **Each screen declares, per string, the number of lines its frame draws**
   (`e2e/layout.spec.ts`, `maxLines`). More lines than the frame is a failure, fewer is
   not. The whole page is also checked for horizontal overflow and for text cut off
   inside a box that hides its overflow.
4. **The probes are themselves tested** (`e2e/measure.spec.ts`) against synthetic pages
   that must be reported — a wrapped line, a clipped one, a container that must not be
   mistaken for its label. An instrument that can only report “fine” is worse than no
   instrument.
5. **CI runs it as its own job**, after the fast gate.
6. **The web export is the target, not a device.** Native font differences and native
   text shaping remain device concerns, and Maestro stays the plan for device journeys
   (TESTING.md §2).

## Alternatives considered

- **A character budget per string.** What the catalogue test does today: cheap and fast,
  but it does not measure anything. It covers only the element somebody budgeted, and it
  cannot fail on a clip or on a screen nobody budgeted. Kept as a smoke test beside the
  real measurement, not instead of it.
- **Jest with React Native Testing Library.** No layout engine — this is precisely the
  limitation the harness exists to cover.
- **Visual snapshot tests** (Playwright's screenshot comparison). Needs baselines that
  every legitimate copy change invalidates, and a pixel diff does not say *which* string
  wrapped. The harness asserts the design's line counts instead and attaches a
  screenshot to a failure for the human reading it.
- **Maestro on a device build, now.** The faithful target, but it needs a build per run
  and much slower feedback, while the defect class in question is text layout, which a
  browser engine reproduces.
- **Measuring by hand and writing the result down.** What the first pass did
  (docs/design-source.md, “Language lengths”). It found the defect and does nothing to
  stop the next one.

## Consequences

- A translation that wraps where the frame draws one line, or clips, fails CI instead of
  shipping. Adding a screen means adding its frame's copy and line counts to the manifest
  in `e2e/layout.spec.ts` — which is also the honest record of how many lines the design
  gives each string.
- The layout job costs minutes the unit gate does not (a browser download and a web
  build), so it runs only once the fast gate is green.
- The measured target is `react-native-web`, not the native renderer. A break that only
  exists with a platform font or native shaping still surfaces by looking at a screen:
  this narrows the window, it does not close it.
