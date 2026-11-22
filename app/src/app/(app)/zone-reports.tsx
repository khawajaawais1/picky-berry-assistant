import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import { isSpecies, ZoneReportsScreen } from '@/features/discover';
import { appReportsApi } from '@/services/reports';

/**
 * The zone's own report list (ADR-044), pushed from the zone screen with the zone and the berry
 * it was reading. The back control is offered only when there is history to go back to.
 */
export default function ZoneReportsRoute() {
  const canGoBack = useCanGoBack();
  const params = useLocalSearchParams<{ species?: string; zone?: string }>();

  return (
    <ZoneReportsScreen
      onBack={canGoBack ? () => router.back() : undefined}
      reportsApi={appReportsApi}
      species={isSpecies(params.species) ? params.species : undefined}
      zoneId={params.zone}
    />
  );
}
