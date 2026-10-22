# ADR-019 — Layout is measured at the largest system text size, in CI

- **Status:** Accepted
- **Date:** 2026-10-09
- **Deciders:** Project owner

## Context

ADR-018 measures every built screen in every shipped language, at the design's own text
size. That leaves half of "text must survive the largest system font scale" (AGENTS.md
§11.2, DEFINITION_OF_DONE.md) unmeasured: both platforms let the user ask for much larger
text, and what the screens are measured against is a fixed-height composition extracted
from Figma. ADR-018 stands as decided; this adds a second dimension to the same harness.

Measured at 200 %, the screens did what a fixed box does when its content grows:

- the design's 64 px header could not hold its own eyebrow and title, on all three screens
  and in both languages, so the title painted over the block below it;
- the Finnish choice-chip row — “Sähköposti” and “Puhelinnumero” — needed more than the
  342 px content column and ran past the viewport, where the screen clips horizontally
  instead of scrolling: the second chip lost its right edge, and the phone option with it;
- a form field grew past the screen: a text input's intrinsic width is a character count, so
  at 32 px the value's box was wider than the field — found once the emulation covered form
  values, which are drawn from a property rather than a text node.

The platform's mechanism is a multiplier. The OS scales each text element's size and, on
Android, its line height too — `toPixelFromSP` in the platform's own text props, applied
when `allowFontScaling` is on, which it is by default. The web export does not scale
anything: `react-native-web` renders px sizes literally and **ignores** `allowFontScaling`
and `maxFontSizeMultiplier` alike.

## Decision

1. **The harness emulates the platform's text scale in the page** (`applyFontScale`,
   `e2e/measure.ts`): every element that renders text has its font size and line height
   multiplied by the factor, which is the shape a device applies. It is idempotent — each
   element's original metrics are recorded on first use — so the harness can apply it again
   before its last check and repair an element a re-render put back to the design's size,
   without ever compounding the scale.
2. **The factor is 2.0** — the largest text size Android's accessibility setting offers, and
   the one WCAG 1.4.4 (Resize text) requires. iOS's accessibility sizes go beyond it; that is
   a limitation below, not something to average away.
3. **The design's line counts are not asserted at that size.** At 200 % a paragraph must
   reflow, and holding it to the frame's line count would demand the opposite of what the
   user asked for. What is asserted is that nothing is lost: every string in the manifest
   still renders, no box overflows or hides its content, and the page does not scroll
   sideways.
4. **Overflow is attributed to in-flow boxes**: a child painted outside its parent, or
   content an element hides in a box too small for it. Two numbers are deliberately not
   treated as overflow — an absolutely positioned descendant's box (RN-web stretches one to
   its container's width where native sizes it to its content, so the berry mark's leaf
   reported a 75 px box inside a 44 px mark while painting nothing), and a glyph-only
   element.
5. **Icon glyphs are neither scaled nor judged.** They are the one part of the interface
   whose behaviour at a large text size cannot be measured on this target, because the props
   that would control it are exactly the ones `react-native-web` ignores. A check that cannot
   be verified must not demand a fix, so what a glyph does at 200 % stays a device check.
6. **The defects found are fixed as floors, not redesigns.** The screen header takes
   `min-h-header` — the design's 64 px is the floor and its content may grow past it — the
   choice-chip row wraps, and a field's value box takes `min-width: 0` so the field keeps its
   width instead of growing past the screen (a text input's intrinsic width is a character
   count at the current font size, and the platform's automatic minimum size holds it there).
   At the design's own text size all three render exactly as before: the header measures 64 px
   and the chips sit on one 36 px row, as the frames draw them.
7. **It runs in the same CI job** as the language measurement: one export, one browser, and a
   screen that fails either dimension fails the job.

## Alternatives considered

- **A device run** (Maestro, or a build per run). The faithful target — native font shaping
  and glyph scaling included — but slow, needing a build per run, while the defect class here
  is text layout, which a browser engine reproduces. ADR-018 made the same call for
  languages; device journeys remain Maestro's job.
- **Capping growth in the app** (`maxFontSizeMultiplier`, or `allowFontScaling={false}`). It
  keeps the design's boxes intact by overruling the user's accessibility setting, and it is
  unusable here for a second reason: the measured target ignores those props, so nothing in
  CI could tell whether a cap had been applied.
- **A root font-size emulation in CSS.** Impossible: `react-native-web` emits px sizes, so
  nothing inherits a root scale. Multiplying each text element explicitly is the same thing
  said in longer form, and it is what the harness does.
- **Asserting the frames' line counts at 200 % as well.** Rejected: it would turn "the text
  may reflow" into "the text may not grow", which is the defect, not the requirement.
- **Scaling only `fontSize`, not `lineHeight`.** Android scales both when font scaling is on;
  scaling only the size would measure a line box no platform paints.

## Consequences

- A screen that survives a large text size only by hiding, clipping or truncating its copy
  now fails CI, in both languages, with a screenshot attached.
- Adding a screen needs the same manifest entry as before — its copy and the lines its frame
  draws — and it is measured at both text sizes for free.
- Controls whose content can grow take a minimum height rather than a fixed one
  (`min-h-header` and the mirrored `minHeight` scale in `tailwind.config.js`, kept in sync by
  the drift test). A control that keeps a fixed height is now a decision the probe can
  challenge with a number.
- **Not covered:** iOS accessibility sizes above 2.0, icon glyphs (see decision 5), and the
  platform's own fonts and text shaping — all of which remain checks on a device (ADR-018).
