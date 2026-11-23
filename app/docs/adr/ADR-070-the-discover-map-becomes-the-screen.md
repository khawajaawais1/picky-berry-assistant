# ADR-070 — The Discover map becomes the screen, with foreground location behind the existing gate

- **Status:** Accepted (2026-11-23)
- **Deciders:** Project owner, asking for a full-screen map comparable in structure and fluidity to
  popular Finnish berry-picking apps, and for the picker to see their live position.
- **Supersedes:** ADR-053 decision 6 (screen 06's map no longer disables pan and zoom) and the
  frame-06 page layout from ADR-016. The Figma frame remains design history rather than the target
  for this screen.
- **Extends:** ADR-045 (foreground position port and consent gate), ADR-056 (no background capture),
  ADR-063 (watch budget), ADR-066 (the shell-mounted visit tracker), and ADR-053 (real zone rings).

## Context

Screen 06 put a 300 px map card below a large heading, search, four berry controls and explanatory
copy. On a phone, the primary field tool occupied less than half of the useful height and lived
inside a vertical scroll surface. That structure made a native map feel like an illustration even
after MapLibre, a basemap and gestures had arrived.

The map and location seams already carry the ingredients for a field-first screen: MapLibre draws
real coordinates; the zone service returns real rings; and `PositionSource` reads a bounded,
foreground-only fix after the picker recorded consent. The missing decision was how those pieces
meet without creating a second GPS watch, retaining a trail, or replacing the project's map stack
with Google Maps.

## Decision

1. **The map fills the Discover destination above core navigation.** Search, score-layer controls,
   map/list and download actions, the score legend and the selected-zone card float over it. The
   default map view is not wrapped in a `ScrollView`, so the map owns pan and zoom gestures.
2. **MapLibre stays north-up and flat.** Pan, pinch and double-tap zoom remain native; pitch and
   rotation stay off because they make the H3 score layer harder to compare. Camera fits and
   location movement use bounded eased transitions and reserve space for the overlays.
3. **A zone is selectable on the map.** A source press selects by the zone's stable id, strengthens
   that ring's outline, and updates the same source-backed card that opens zone details. The card's
   score and confidence remain the non-colour reading of what the selected fill means.
4. **The live-position dot uses the app's `PositionSource`, never MapLibre's independent location
   provider.** The existing consent record and foreground platform permission remain the only
   gates. A fix is shown in memory, replaced by the next fix, and neither stored, sent nor logged.
5. **Following is user-initiated.** The location control eases the camera to the newest fix and
   follows later fixes; a manual pan exits follow mode. Without recorded consent, the control opens
   Privacy settings rather than reading a position. If foreground platform access was denied or is
   unavailable, the same control opens the phone's app settings so the failure is actionable.
   Background permission, a foreground service and a movement trail remain absent.
6. **Concurrent consumers share one native foreground watch.** The map and visit tracker may both
   subscribe, but `PositionSource` fans one platform watch out to them and removes it after the last
   subscriber leaves. This prevents duplicated GPS work without coupling Discover to Visits.
7. **The renderer and provider decision do not change.** This work does not add Google Maps, an API
   key or another processor. It keeps the existing MapLibre/OpenFreeMap surface; ADR-031's intended
   self-hosted PMTiles replacement remains open and is still required before the provider question
   can be called final.
8. **The web export remains a static projection of the same rings.** It measures the full-screen
   overlay layout in Finnish, English and large text without adding a second browser map library.
   Every floating icon control has an accessible name and at least a 44 px target; list view remains
   the zone-by-zone alternative to the map image.

## Consequences

- Discover reads like a field map rather than a document containing a map, while the list, retry,
  offline and zone-detail paths remain available.
- Position becomes visible for the first time, but its privacy shape does not widen: foreground,
  consented, in memory, no raw track, no log and no server payload.
- Map and visit tracking no longer multiply native subscriptions or battery cost when both are
  mounted.
- Native gesture and camera quality still require a physical-device review; Jest can hold the
  state and boundary contracts but cannot measure GPU frame pacing.
- The current external tile host remains a known deployment/privacy limitation. This redesign
  neither resolves nor expands it; self-hosted PMTiles remains ADR-031's destination.
