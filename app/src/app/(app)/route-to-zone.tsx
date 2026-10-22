import { router } from 'expo-router';

import { RouteToZoneScreen } from '@/features/discover';

/**
 * Screen 08 · Core picker · Route to zone (Figma node `5:23106`).
 *
 * A route only wires a screen to a feature's public API. It is reached from screen 07's
 * “Navigate” action and comes back the way it went in; “Cancel route” always has somewhere to
 * go, so a deep link that opened this screen directly cancels back to the zone screen rather
 * than leaving a control that cannot act. Its “Start walking” opens the visit (screen 09), and
 * the frame's back control is offered the same way as everywhere else: only when the screen was
 * actually pushed onto a stack.
 */
export default function RouteToZoneRoute() {
  return (
    <RouteToZoneScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onCancel={() => (router.canGoBack() ? router.back() : router.replace('/zone-details'))}
      onStart={() => router.push('/active-visit')}
    />
  );
}
