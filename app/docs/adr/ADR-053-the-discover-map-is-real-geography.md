# ADR-053 — Screen 06's map is real geography, through a zone port — and the web answer is a drawing of the same rings

- **Status:** Accepted (2026-10-22); its note that the card and list still read the design's sample is amended by [ADR-057](ADR-057-screen-06-reads-one-zone-source.md) (2026-10-23)
- **Date:** 2026-10-22
- **Deciders:** Project owner (asked for the drawn map to be replaced by MapLibre showing
  `data/test_zones.geojson` through a `ZoneSource` port; chose the native/web split, the
  Discover-only reach and the five-band colour rule)
- **Supersedes:** [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) **for screen 06
  only**. Frames 08 (route) and 09 (visit) still draw the design's map, because a route and a
  zone a visit is judged against have no geometry to draw yet.

## Context

[ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) drew frame 06's map from the
design's own shapes, and [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) decided
what a real map would be made of: MapLibre React Native and OSM-derived vector tiles the
project hosts. ADR-031 deliberately changed nothing, because there was no zone geometry to put
on it. There now is: the data team publishes `data/test_zones.geojson`, 50 zones around
Laajavuori in the exact `GET /api/v1/zones` shape (docs/data-contract.md), and the team's MVP
plan makes "MapLibre + real zone geometry" sprint 1's deliverable.

Two constraints decide the shape of this change.

1. **MapLibre React Native has no web target.** Every layout and accessibility check in this
   repository measures a static web export (ADR-018, ADR-019). A screen that renders nothing on
   the web would drop the app's most map-shaped screen out of the one place a Finnish or 200 %
   break is caught. ADR-031 named the cost in advance: “a screen carrying the basemap needs a
   web fallback or a harness exemption”.
2. **The project has no basemap to draw.** The PMTiles file (D18) is not built, and every
   substitute — OpenStreetMap's own tile servers, a hosted provider — is either against OSM's
   usage policy or a new processor receiving approximate location per tile request, which is
   an owner decision (ADR-031 ¶6). A map that needs no tiles is a map that works offline and
   adds no processor.

## Decision

1. **The zones come through a `ZoneSource` port** (`domain/zone-source.ts`): `list({ species })`
   answers with validated zones. The only adapter is `services/test-zone-source.ts`, which reads
   the data team's stub from `assets/data/test-zones.json` — a copy of
   `data/test_zones.geojson`, kept equal by a test, because Metro only bundles files inside the
   app package. When the zone service answers, another adapter replaces it and no screen changes.
2. **Everything at the boundary is validated** (ADR-036 §1.2's proposed rule): a ring with
   fewer than three vertices, a coordinate off the world, an identifier or name that cannot be
   printed, or a score outside 0–100 drops that zone; a document that is not a feature
   collection is **no zones at all**. Nothing unknown is carried onto the zone. A payload with a
   `scores` map is answered from that map only — falling back to the file's default berry would
   paint one berry's score under another berry's name.
3. **The device renders it with MapLibre React Native** (`@maplibre/maplibre-react-native`
   v11, a development build — it is not in Expo Go). The style is a single background layer in
   `mapBase` plus one GeoJSON source and a fill/line pair: **no tile source, no network, no
   attribution line**, because no third party's data is drawn. The camera frames every ring;
   the styles' colours come from the same tokens the legend uses.
4. **The web export draws the same rings into an SVG** (`zone-map-canvas.web.tsx`), projected
   with local equirectangular maths (`domain/zone-map-projection.ts`): longitude is scaled by
   the cosine of the pilot's latitude, so a square on the ground is a square on the screen. It
   is the harness's answer, not a second map: same data, same bands, same fade, no new web
   dependency and no MapLibre web bundle for a target that only CI opens.
5. **The map paints five yield-score bands**, as the spec's A3 asks: 0–19, 20–39, 40–59, 60–79,
   80–100, with a low-confidence zone faded to 40 % opacity. The edges are the app's own — the
   spec names the count, not the thresholds — and they live in `ZONE_SCORE_BANDS`. The
   three-state legend is replaced on screen 06 by a legend that names the five ranges and says
   in words what the fade means; frames 08 and 09 keep the state legend their map still draws.
6. **Nothing on the map is a control.** Pan, zoom, rotate and pitch are off on the device
   canvas. The frame draws a recentre button, and a map that can be moved away from the pilot
   area without a way back is worse than one that stays where it was put. The interactions
   arrive with the recentre control, not before it.
7. **The map is named.** It is the screen's primary presentation of the zones, so the canvas
   carries `discover.map.label` as its text alternative on both platforms (known issue 35's
   rule), and the zone-by-zone reading remains the list the screen's toggle opens.

## Alternatives considered

- **MapLibre GL JS on the web export.** A real interactive map in Chromium too. Rejected: the
  web export is a measurement target, not a shipped surface, and adding the browser map library
  (and its CSS) for CI is weight no user of the app receives.
- **Native only, with the screen exempt from the harness.** Cheapest in code, and the option
  ADR-031 named as the other half of its warning. Rejected: the map is the screen, and losing
  it from the only automated layout check is exactly the regression the harness exists to catch.
- **Wait for the PMTiles basemap.** Faithful to ADR-031's order of work, but it makes sprint 1's
  deliverable wait on a data job and leaves the team's stub unconnected to the app. Rejected:
  a map with real zone geometry and no basemap is already more honest than the drawing, and the
  basemap can arrive without changing this decision.
- **A hosted tile provider now.** Fastest to something that looks like a map. Rejected for the
  reason ADR-031 gives: a processor that sees approximate location per request needs its
  region, its DPA and a lawful basis recorded first.
- **Keep the drawing and put a MapLibre view beside it.** Two maps on one screen, with two
  different geographies. Rejected.

## Consequences

- **A development build is now required to see screen 06 on a device.** Expo Go cannot load
  MapLibre; the app's README and the team plan say so. The web export still builds and the
  harness still measures it.
- **The card and the list are still the design's sample.** They, their filters and the saved
  plan read `DEMO_ZONES`; the map reads the pilot source. The screen now shows two datasets at
  once, and says so on the map (“test data”) — the card/list migration is the next step and is
  recorded in PROJECT.md rather than half-done here. The filters narrow the card and list, not
  the map.
- **The frame's map words are gone from screen 06**: no lake name, no scale line, no per-zone
  identifiers or score badge, because the real map has none of those. The place name stays, and
  a count line says how many zones are drawn and that they are test data.
- **The app ships ~62 KB of stub geometry**, and a test ties the copy to the published file.
  When the service lands, both go.
- **The five band edges are a product choice to revisit** once the scoring service exists; they
  are one constant, and the legend derives from it.
- **Native behaviour is not verified by this repository's tests.** Jest mocks the native module
  and the Playwright harness measures the web drawing; camera framing, gesture flags and the
  colours on a device are a review on a development build.
