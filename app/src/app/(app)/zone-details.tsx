import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import {
  appZoneInsightSource,
  appZoneSource,
  isSpecies,
  PILOT_ZONE_SPECIES,
  ZoneDetailsScreen,
} from '@/features/discover';
/**
 * Screen 07 · Core picker · Zone details (Figma node `5:23032`).
 *
 * A route only wires a screen to a feature's public API. It is reached from frame 06's zone
 * card, which hands over the zone's id and the berry whose score the card was reading; those
 * two params are what make the screen read the same `ZoneSource` answer instead of the design's
 * demo. The species is external input (a deep link can type anything), so the route accepts only
 * the app's own species and falls back to the pilot berry.
 *
 * The frame draws a back control on it, so it always has somewhere to go back to; the route
 * offers one only when the screen was actually pushed onto a stack, which keeps a deep link from
 * drawing a control that cannot act. Its “Navigate” action is the design's way on to screen 08,
 * so the route is also where that destination is decided — and so is the list behind its own
 * “See all 11”, which the design never drew and this route therefore owns (ADR-044).
 */
export default function ZoneDetailsRoute() {
  const canGoBack = useCanGoBack();
  const params = useLocalSearchParams<{ species?: string; zone?: string }>();
  return (
    <ZoneDetailsScreen
      insightSource={appZoneInsightSource}
      zoneSource={appZoneSource}
      onBack={canGoBack ? () => router.back() : undefined}
      onNavigate={
        params.zone
          ? () =>
              router.push({
                pathname: '/route-to-zone',
                params: { species: params.species ?? PILOT_ZONE_SPECIES, zone: params.zone },
              })
          : undefined
      }
      onSeeReports={
        params.zone
          ? () =>
              router.push({
                pathname: '/zone-reports',
                params: { species: params.species ?? PILOT_ZONE_SPECIES, zone: params.zone },
              })
          : undefined
      }
      species={isSpecies(params.species) ? params.species : PILOT_ZONE_SPECIES}
      zoneId={params.zone}
    />
  );
}
