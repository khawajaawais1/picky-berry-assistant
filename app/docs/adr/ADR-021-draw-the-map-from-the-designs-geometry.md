# ADR-021 — The core map is drawn from the design's own geometry, not by a map provider

- **Status:** Accepted for frames 08–09; **superseded for screen 06 by [ADR-053](ADR-053-the-discover-map-is-real-geography.md)** (2026-10-22). The provider-free stance below is scoped to this drawn map; the real basemap is ADR-031.
- **Date:** 2026-10-09
- **Deciders:** Project owner

## Context

Frame 06 (Core picker · Discover map, node `5:22942`) is where onboarding hands over, and its
centre is a map: a 342×300 composition of woodlands, a lake shore, forest trails, three zone
polygons in different states, a place name, a lake name, zone identifiers, a yield badge, a
position marker, and a scale line reading “━━ 200 m · Season demo”. The design draws that map
itself — it is an illustration in the product's own visual language, not a rendering of a tile
provider — and it labels the whole screen a **season demo**, which is the design telling the
reader the data on it is not this user's.

That leaves a decision the design cannot make: what actually paints it on a device. The
choices were a platform map SDK, an exported raster of the frame, or the app drawing the
design's own shapes. The owner chose the last on 2026-10-09, for both the artwork (reached
through the design file rather than re-drawn by hand) and the renderer.

## Decision

1. **The app draws the map itself, from the design's geometry.** The seven shapes the frame
   draws — four terrain layers and one polygon per zone state — are extracted from the file
   through the read-only API route in docs/design-source.md, with `geometry=paths`; the
   generator writes `src/features/discover/domain/zone-map-geometry.ts`, and nothing
   hand-edits it. Coordinates are in the map frame's own 342×300 space, so the drawing and
   the labels the frame places on it share one system.
2. **`react-native-svg` renders it.** Expo SDK 57's recommended version (15.15.4), included
   in Expo Go, and supported on iOS, Android **and the web export** — the target the layout
   harness measures (ADR-018, ADR-019). The paths are therefore measured in both languages
   at both text sizes, like every other screen.
3. **The words on the map are components, not part of a drawing** (`AppText` positioned at
   the frame's own anchors): each comes from the catalogue, so it can be translated, carries
   an accessible name, and is measured by the harness. This is the treatment the exported
   preview on screen 05 could not have, and it is why that illustration's labels stay English
   until screens 06–07 replace it (docs/design-source.md).
4. **The zone states are data.** `ZONE_APPEARANCE` pairs each state with the polygon the frame
   draws for it, its fill, its outline and its label colour, and the legend paints its swatch
   from the same tokens — so the map and the legend cannot describe different colours.
5. **Nothing on the map is a control.** The frame's recentre button is not drawn: the map does
   not pan or follow the device, so a recentre control could not act (AGENTS.md §11.2). The
   position marker is the composition's, and its accessible name says exactly that rather than
   claiming “you are here”. Pan, zoom and a real position come with the capture slice, and
   they can arrive without changing this decision — the drawing is where they would be applied.
6. **Every colour the map paints is a token** in `src/constants/theme.ts`, and every
   text-on-map pair is asserted for WCAG AA contrast in both schemes
   (`src/constants/__tests__/contrast.test.ts`). Four of the frame's own annotation colours did
   not clear the bar and are darkened; the frame's values and the measured ratios are recorded
   in docs/design-source.md.

## Alternatives considered

- **A native map SDK.** SDK 57's own module is `expo-maps` (~57.0.4, **alpha**): unavailable in
  Expo Go, needing a development build and, for Google Maps on Android, an owner-created
  Google Cloud key plus the app's SHA-1 in `app.json`. It is also iOS/Android only, so a screen
  using it renders nothing on the web export — the screen would drop out of the project's own
  layout guarantee, in the one language and the one text size where a Finnish or 200 % break
  would otherwise be caught. `react-native-maps` and MapLibre carry the same native/web split.
  Decisive beyond that: none of them draws *this* map. The design's terrain is the product's
  own illustration, and a provider would replace it with real geography the design does not
  show — and would need a tile source, an attribution rule and a network policy for a screen
  whose frame says “demo”.
- **Export the map as a raster** (the treatment screen 01's hero photograph and screen 05's
  zone-map preview get). Smallest change, and it is what the *drawing* alone would want.
  Rejected because a raster cannot carry the design's words: they would be painted into pixels
  — untranslatable, invisible to a screen reader and unmeasurable by the harness — and because
  a zone's state is the thing the screen is about: as data it can change per zone, as pixels it
  cannot.
- **Ship the SVG as an asset** (a Metro transformer, or `SvgXml` with the file inlined). It
  would keep the geometry out of TypeScript, but adds a build-step dependency and a second file
  format to keep in step with the extraction, for a module that is generated either way.
- **Draw the terrain with plain Views.** The paths are curves and a compound polygon; there is
  no honest way to express them as boxes.
- **Hand-draw the map from the exported PNG's appearance.** Rejected by AGENTS.md §3: the design
  is the source, and a hand-drawn approximation of it is a different map that no test can
  compare against the frame.

## Consequences

- **The map is measurable in CI**, in both languages and at both text sizes, because it is a
  component tree on the web export rather than a native view. The layout harness already caught
  one real break this way (the legend row needed to wrap at 200 % in Finnish).
- **One drawing serves the three frames that share it.** Frames 06, 08 and 09 draw the same map at
  300, 322 and 210 px high, and their node boxes say it is that drawing stretched rather than
  redrawn — every shape and label inside moves by one factor. `ZoneMap` therefore takes the height
  its screen gives it, scales the design's vertical axis and the label anchors with it, and leaves
  the horizontal axis at the container's width. Frame 08's walking route is traced in the same
  342×300 space and lands where the frame draws it, which is how the design is allowed one drawing
  and the app one component (docs/design-source.md).
- **~41 KB of path data** is in the bundle, in a generated module. It is one file, and it is
  the design's own fidelity; simplifying it would change the map.
- **No real geography, no pan, no zoom, no offline tiles yet.** The screen does not know where
  the device is; the marker is the composition's. Screen 08's “map cached offline” is, for now,
  trivially true — the drawing ships in the bundle — and stops being trivial when tiles arrive.
- **A design change means regenerating one module**, through a documented command, and the
  geometry tests fail on a regeneration that lands shapes or labels outside the frame.
- **Four annotation colours depart from the frame** (lake name, both zone identifiers, the
  scale line) because the frame's values reach only 3.6–4.0:1 on the fill they sit on. The
  deviations and the measurements are recorded in docs/design-source.md and PROJECT.md.
- **A zone's state reaches a sighted user through colour.** A screen reader is told the state,
  and the legend names the three colours in words, but the map itself has no second signal; a
  state glyph on the polygon is the fix when a frame draws one. Recorded in PROJECT.md.
- **The tab shell these screens belong to is still unbuilt** (the frame's core navigation has
  four destinations — they exist as screens at `/discover`, `/visits`, `/alerts` and
  `/privacy-settings`, but the tab bar itself does not), so `/discover` is reached by its route
  rather than from a tab bar.
