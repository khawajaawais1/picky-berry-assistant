# ADR-031 — A real basemap, when the map becomes real: OSM-derived tiles we host ourselves

- **Status:** Accepted (nothing is built by this ADR; it decides the shape the map takes the day it stops being a drawing)
- **Date:** 2026-10-10
- **Deciders:** Project owner (asked for OpenStreetMap on 2026-10-10: “for map we will use maybe open street map because I think it's free to use”; the tile source below is this repository's reading of what “free” can actually mean)

## Context

Today's map is [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md)'s: the frames' own
geometry drawn with `react-native-svg`, nothing on it a control, and the zones on it are the
design's demo composition (`DEMO_ZONES`) because **nothing returns a zone** (PROJECT.md known
issues 12 and 14). That drawing is a good illustration and a poor map: its geography is the
designer's, not the world's.

The design asks for things an illustration cannot honestly carry, and each is one frame away from
being buildable:

- a **route on the map** with a distance and an arrival (frame 08),
- a **live position** with an arrival and a visit timer (frame 09),
- a **recentre control** and a pannable view (frames 06 and 09 — the one control this project
  deliberately did not draw, because the drawing does not move),
- **downloaded map regions** that survive no signal (frame 13).

So a real geographic map is coming, and the only question this ADR answers is **who serves its
tiles**.

The owner's instinct — OpenStreetMap is free — is right about the data and wrong about the
service. OpenStreetMap's [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
begins: “OpenStreetMap (OSM) data is free for everyone to use. **Our tile servers are not** …
capacity is limited. We may block access, without notice, if your usage degrades the service.”
It offers no SLA, requires a distinct User-Agent naming the application and visible
“© OpenStreetMap contributors” attribution, and forbids — verbatim — “bulk downloading
(‘scraping’) tiles or offer prefetch features”. Frame 13's downloaded regions *are* a prefetch
feature. An app backed by `tile.openstreetmap.org` is therefore an app that can be cut off
without notice and may not ship the offline map its own design draws.

## Decision

1. **The basemap is OSM-derived vector tiles that this project hosts itself**, built as
   [Protomaps](https://protomaps.com/) basemaps: the world as a single static PMTiles file on
   object storage, styled with MapLibre styles. The tile server is our own storage, so the
   decision adds **no processor and no transfer outside the EEA** (AGENTS.md §11.1) — the hosting
   region is the same owner decision as the backend's (PROJECT.md question 16) when there is one.
2. **The renderer is [MapLibre React Native](https://maplibre.org/maplibre-react-native/)**
   (`@maplibre/maplibre-react-native`), the OSM ecosystem's native renderer: v11 supports only
   React Native's new architecture and requires RN ≥ 0.80 (this app is 0.86.3 on the new
   architecture). Installation is `npx expo install @maplibre/maplibre-react-native`, the
   package added to the `plugins` array in `app.json`, and a **development build**: the package is
   not part of the Expo SDK and **cannot run in Expo Go**.
3. **Attribution is part of the map, not a detail.** “© OpenStreetMap contributors” is drawn
   whenever the basemap is drawn — in the app's copy, in the accessibility tree — and the ODbL
   obligations of the tile file belong to whoever hosts it.
4. **Nothing changes today.** The drawn map stays as it is (ADR-021) until real zone geometry
   exists to put on a real basemap; its season-demo disclosure stays until then, and no screen
   gains a map control that cannot act.
5. **The offline half is deliberately not promised yet.** Hosting the tiles ourselves makes frame
   13's downloaded region *possible* without touching anybody's tile server — but “vector tiles
   downloaded and served from the device under MapLibre React Native” is an integration this
   project has not verified, and it must be spiked and measured before frame 13's downloaded-region
   card is built on it.
6. **A third-party tile host later is an amendment to this ADR**, not a configuration change:
   MapTiler, Stadia Maps or any other host means a processor that receives each user's approximate
   location with every tile request, and that needs its region, its DPA and a lawful basis recorded
   first (AGENTS.md §11.1; PROJECT.md questions 15 and 16).

## Alternatives considered

- **OpenStreetMap's own tile servers** (`tile.openstreetmap.org`). Ruled out by policy, not by
  taste: no SLA, blocking without notice, a required identifying User-Agent, and an explicit ban on
  the prefetch that frame 13 draws. It is also the version of “free” that makes a donation-funded
  community service carry a commercial app's traffic — the reason the policy exists.
- **A hosted EU provider** (MapTiler — Swiss; Stadia Maps; Thunderforest). The least engineering and
  a free tier at low volume, and MapLibre's own documentation points at this shape (“For production
  use, please provide your own style/tiles or use a provider like Stadia Maps or MapTiler”). It is a
  new processor that sees approximate location per request, so it is deliberately **deferred**
  rather than accepted: if the volume ever makes self-hosting the wrong trade, this ADR is amended
  and the processor recorded.
- **Google Maps or Mapbox.** Proprietary, US-based, licence terms that fit this app's
  data-protection posture least well, and their visual language is not the design's.
- **Keeping the drawn map forever.** The honest fallback, and what happens until a zone source
  exists — but it cannot carry a route, a live position or a downloaded region, and three frames
  ask for exactly those.
- **`react-native-maps` with a `UrlTile` overlay.** Workable, but the platform views are Google's
  (Android) and Apple's (iOS) by the back door, and their map cannot be styled to the design.

## Consequences

- **No new processor, and nothing to delete if the map never ships.** The decision can be recorded
  today and built years from now without an owner re-asking the privacy question in between.
- The project takes on a hosting job it does not have today: a tile file on object storage (cost,
  region, cache headers) plus whatever refreshes it. That is an operational task, and it must exist
  before the map ships rather than after.
- **MapLibre React Native has no web target**, and this repository measures every built screen in a
  static web export (ADR-018/019). A screen carrying the basemap needs a web fallback or a harness
  exemption, and its copy is still measured in both languages at both text sizes.
- The first map work happens on a **development build** (`npx expo run:ios|android` locally, or
  `eas build --profile development`): the map cannot be seen in Expo Go, which changes how the
  screen is reviewed before it is real.
- **Attribution travels with the map** into the copy and the accessibility tree, in both languages.
- The map must not become a movement trace: what the screen shows about the picker's own position
  is subject to ADR-010 (derived per-segment centroids, never a trace) and to the retention rules in
  ADR-014 — a basemap makes position *visible*, which is exactly when those rules bind.
- Zone polygons on a real basemap need a **zone service** with real geography; until one exists,
  ADR-021's drawing is the only map this app may honestly show, and this ADR changes no screen.

## Related

- [ADR-021](ADR-021-draw-the-map-from-the-designs-geometry.md) — the drawn map this sits behind,
  and the reason nothing changes today
- [ADR-010](ADR-010-position-retention.md) — what may be shown about position
- [ADR-014](ADR-014-retention-policy.md) — how long it may be kept
- [ADR-018](ADR-018-measure-layout-in-both-languages.md),
  [ADR-019](ADR-019-measure-at-the-largest-system-text-size.md) — the harness that needs a web
  answer for a native-only map
- PROJECT.md — known issue 30 (nothing built), questions 15 and 16 (lawful basis, processors)
