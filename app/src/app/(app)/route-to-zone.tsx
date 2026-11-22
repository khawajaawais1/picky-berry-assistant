import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import { appZoneSource, isSpecies, RouteToZoneScreen } from '@/features/discover';

/**
 * Screen 08 · Core picker · Route to zone (Figma node `5:23106`), reached from the zone screen's
 * “Navigate” with the zone and berry it was reading. “Cancel route” always has somewhere to go;
 * “Start walking” opens the visit (screen 09).
 */
export default function RouteToZoneRoute() {
  const canGoBack = useCanGoBack();
  const params = useLocalSearchParams<{ species?: string; zone?: string }>();

  return (
    <RouteToZoneScreen
      onBack={canGoBack ? () => router.back() : undefined}
      onCancel={() => (router.canGoBack() ? router.back() : router.replace('/discover'))}
      onStart={() => router.push('/active-visit')}
      species={isSpecies(params.species) ? params.species : undefined}
      zoneId={params.zone}
      zoneSource={appZoneSource}
    />
  );
}
