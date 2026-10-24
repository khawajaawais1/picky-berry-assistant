/**
 * Public API of the `discover` feature.
 *
 * Nine screens: frame 06's Discover map, the zone screen its card opens (frame 07), the route
 * to that zone (frame 08), the visit the walk opens (frame 09), the report that ends it
 * (frame 10), the season the report joins (frame 11), the forest's own heads-up (frame 12), the
 * picker's own saved plan (frame 14's “Saved spots” row, which the design never drew —
 * ADR-030) and the reports this phone holds for a zone (frame 07's own “See all 11”, which the
 * design never drew either — ADR-044).
 * The feature owns the design's map geometry (`domain/zone-map-geometry.ts`, generated from the
 * file), the zone vocabulary the legend, the map and the screens share (`domain/zone.ts`), the
 * route to a zone (`domain/route.ts`), the season's own figures
 * (`domain/season-insights.ts`), the rule that reads the phone's reports back under one zone's
 * name (`domain/zone-reports.ts`) and the components that draw them.
 *
 * What the screens deliberately do not have yet — a zone source behind the demo composition, the
 * place index a search would grow into, and the recentre control that needs a map which moves —
 * is recorded in PROJECT.md rather than invented here.
 */
export { ActiveVisitScreen, type ActiveVisitScreenProps } from './components/active-visit-screen';
export { AlertsScreen, type AlertsScreenProps } from './components/alerts-screen';
export { DiscoverScreen, type DiscoverScreenProps } from './components/discover-screen';
export {
  PostVisitFeedbackScreen,
  type PostVisitFeedbackScreenProps,
} from './components/post-visit-feedback-screen';
export {
  SeasonInsightsScreen,
  type SeasonInsightsScreenProps,
} from './components/season-insights-screen';
export { RouteToZoneScreen, type RouteToZoneScreenProps } from './components/route-to-zone-screen';
export { SavedSpotsScreen, type SavedSpotsScreenProps } from './components/saved-spots-screen';
export { ZoneDetailsScreen, type ZoneDetailsScreenProps } from './components/zone-details-screen';
export { DesignZoneMap } from './components/design-zone-map';
export { ZoneCard, type ZoneCardProps } from './components/zone-card';
export { ZoneMap } from './components/zone-map';
export { ZoneScoreLegend } from './components/zone-score-legend';
export { ZoneReportsScreen, type ZoneReportsScreenProps } from './components/zone-reports-screen';
export { SpeciesChips, type SpeciesChipsProps } from './components/species-chips';
export { ZoneList, type ZoneListProps } from './components/zone-list';
export { ZoneSearchField, type ZoneSearchFieldProps } from './components/zone-search-field';
export { ZoneStateLegend } from './components/zone-state-legend';
export { ZONE_SCORE_BANDS, scoreBand, type ZoneScoreBand } from './domain/zone-score-band';
export {
  PILOT_ZONE_SPECIES,
  parseZones,
  zoneFeatureCollection,
  type Zone,
  type ZoneQuery,
  type ZoneSource,
} from './domain/zone-source';
export {
  CARD_ZONE_STATE,
  DEMO_ZONES,
  ZONE_APPEARANCE,
  ZONE_STATES,
  type DemoZone,
  type ZoneAppearance,
  type ZoneState,
} from './domain/zone';
export { SPECIES, type Species } from './domain/species';
// The one table that turns a species into its word, exported because a second feature names berries
// now: the marketplace's listing screen prints what its produce is (“Bilberry · 20 kg available”).
// A second table would be a second vocabulary.
export { SPECIES_LABEL_KEY, speciesLabelKey } from './components/species-copy';
export { NO_ZONE_FILTER, filterZones, isFilterActive, type ZoneFilter } from './domain/zone-filter';
// The app's one distance formatter, exported because a second feature prints a distance now: the
// marketplace describes a listing by how far away it is (frame 15's “4.2 km away”), and two
// formatters for one unit is how “1.4 km” and “1,4 km” end up on two screens of the same app.
export { formatDistance } from './domain/route';

/**
 * PROTOTYPE — throwaway scaffolding for a design question, exported because a route may only
 * import from a feature's public API: three readings of the design's “community map”, each mounted
 * on the screen it would live on behind `?variant=` (`/discover`, `/zone-details`, `/saved-spots`)
 * — see [to-questionnaire-community-map.md](../../../to-questionnaire-community-map.md) and the
 * feature's `components/prototype/`. Delete this export with `components/prototype/` once the
 * question is answered.
 */
export {
  CommunityMapPrototype,
  communityMapReading,
  type CommunityMapPrototypeProps,
  type CommunityMapVariantKey,
} from './components/prototype/community-map-variants';
