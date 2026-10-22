import { router, useLocalSearchParams } from 'expo-router';

import { appEnvironment } from '@/config/env';
import { CommunityMapPrototype, SavedSpotsScreen, communityMapReading } from '@/features/discover';

/**
 * The picker's own saved plan, the screen frame 14's “Saved spots” row opens (Figma node
 * `5:23613`'s row; the screen behind it was never drawn — ADR-030).
 *
 * A route only wires a screen to a feature's public API. The frame draws a back control on the
 * screens it pushes, so this one gets a back control whenever there is somewhere to go back to;
 * a deep link straight to this route has not, and a control that cannot act must not claim a role
 * (AGENTS.md §11.2).
 *
 * Two destinations, both of them screens that exist: a saved zone the app has a zone screen for
 * opens frame 07 (`/zone-details`), and the empty plan offers frame 06's map. The screen itself
 * decides which of its rows may open anything — a row for a zone with no numbers behind it stays a
 * reading.
 *
 * The way in is the settings screen (`src/app/(app)/privacy-settings.tsx`), which is frame 14's
 * own row; the plan belongs to the Profile destination, as the frames 13–14 half of the app does.
 *
 * PROTOTYPE — `?variant=C` swaps this route's rendering for one throwaway reading of the design's
 * community map: shared places as cards carrying the person who shared them, filed beside the
 * picker's own plan ([to-questionnaire-community-map.md](../../to-questionnaire-community-map.md)).
 * The other two readings live on `/discover` and `/zone-details`, which the prototype's own bar
 * navigates to; a **production** build ignores the parameter entirely, so no stray prototype can
 * ship.
 */
export default function SavedSpotsRoute() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const reading =
    appEnvironment() === 'production'
      ? undefined
      : communityMapReading('/saved-spots', params.variant);

  if (reading) return <CommunityMapPrototype variant={reading} />;

  return (
    <SavedSpotsScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onBrowseZones={() => router.navigate('/discover')}
      onOpenZone={() => router.push('/zone-details')}
    />
  );
}
