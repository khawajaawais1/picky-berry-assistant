import { router, useLocalSearchParams } from 'expo-router';

import { appEnvironment } from '@/config/env';
import { DiscoverScreen, CommunityMapPrototype, communityMapReading } from '@/features/discover';

/**
 * Screen 06 · Core picker · Discover map (Figma node 5:22942).
 *
 * A route only wires a screen to a feature's public API. In the design this screen is the
 * Discover tab of the core navigation, and since 2026-10-10 the app shell draws that bar over
 * this route and its three siblings (`/visits`, `/alerts` and the Profile destination —
 * ADR-022). The frame draws no back control, and neither does the route: a tab's navigation is
 * the bar, and the history underneath it is not — entering the shell from onboarding pushes this
 * route onto a stack that still holds the welcome, sign-up and consent screens, so a
 * `router.canGoBack()` test put a back arrow on the app's home screen that walked the picker back
 * into a flow they had finished (`src/config/__tests__/shell-tab-roots.test.ts`).
 *
 * Two destinations, both of them screens that exist: the zone card and a list row the app knows
 * a zone screen for open frame 07, and the download glyph opens frame 13's offline centre.
 *
 * PROTOTYPE — `?variant=A` swaps this route's rendering for one throwaway reading of the design's
 * community map (other people's shared spots as a second layer on this very map), which is the
 * paper the designer reacts to while the design has no frame for one
 * ([to-questionnaire-community-map.md](../../to-questionnaire-community-map.md), and the feature's
 * `components/prototype/`; the other two readings live on `/zone-details` and `/saved-spots`,
 * which the prototype's own bar navigates to). Without the parameter the screen below is exactly
 * the one measured by the layout harness, and a **production** build ignores the parameter
 * entirely, so no stray prototype can ship.
 */
export default function DiscoverRoute() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const reading =
    appEnvironment() === 'production'
      ? undefined
      : communityMapReading('/discover', params.variant);

  if (reading) return <CommunityMapPrototype variant={reading} />;

  return (
    <DiscoverScreen
      onOpenDownloads={() => router.push('/downloads')}
      onOpenZone={() => router.push('/zone-details')}
    />
  );
}
