import { router, useLocalSearchParams } from 'expo-router';

import { appEnvironment } from '@/config/env';
import { CommunityMapPrototype, ZoneDetailsScreen, communityMapReading } from '@/features/discover';

/**
 * Screen 07 · Core picker · Zone details (Figma node `5:23032`).
 *
 * A route only wires a screen to a feature's public API. It is reached from frame 06's zone
 * card, and the frame draws a back control on it, so it always has somewhere to go back to;
 * the route offers one only when the screen was actually pushed onto a stack, which keeps a
 * deep link from drawing a control that cannot act. Its “Navigate” action is the design's way
 * on to screen 08, so the route is also where that destination is decided — and so is the list
 * behind its own “See all 11”, which the design never drew and this route therefore owns
 * (ADR-044).
 *
 * PROTOTYPE — `?variant=B` swaps this route's rendering for one throwaway reading of the design's
 * community map (the places people shared for a zone, listed under the zone's own figures), which
 * is the paper the designer reacts to while the design has no frame for one
 * ([to-questionnaire-community-map.md](../../to-questionnaire-community-map.md)). The other two
 * readings live on `/discover` and `/saved-spots`, which the prototype's own bar navigates to; a
 * **production** build ignores the parameter entirely, so no stray prototype can ship.
 */
export default function ZoneDetailsRoute() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const reading =
    appEnvironment() === 'production'
      ? undefined
      : communityMapReading('/zone-details', params.variant);

  if (reading) return <CommunityMapPrototype variant={reading} />;

  return (
    <ZoneDetailsScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onNavigate={() => router.push('/route-to-zone')}
      onSeeReports={() => router.push('/zone-reports')}
    />
  );
}
