import { router } from 'expo-router';

import { MarketListingScreen } from '@/features/marketplace';

/**
 * Screen 16 · Planned marketplace · Listing detail (Figma node `5:23832`).
 *
 * Both of the frame's actions are wired here because both have a destination: the thread with the
 * seller (frame 17) and the order the two of them agreed on (frame 18). The screen draws a back
 * control only when the route was actually pushed onto a stack, so a deep link never draws a
 * control that cannot act.
 */
export default function MarketListingRoute() {
  return (
    <MarketListingScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onContactSeller={() => router.push('/marketplace-chat')}
      onOpenOrder={() => router.push('/marketplace-order')}
    />
  );
}
