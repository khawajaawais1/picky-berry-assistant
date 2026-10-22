import { router } from 'expo-router';

import { MarketOrderScreen } from '@/features/marketplace';

/**
 * Screen 18 · Planned marketplace · Checkout and order status (Figma node `5:23935`).
 *
 * Only one of the frame's three actions is wired, because only one of them has a destination: the
 * thread with the seller (frame 17). Confirming receipt releases a payment and opening a dispute
 * freezes one, and no provider holds anything, so neither is drawn at all — an action that cannot
 * act claims no role (AGENTS.md §11.2, and PROJECT.md records the gap).
 */
export default function MarketOrderRoute() {
  return (
    <MarketOrderScreen
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onMessageSeller={() => router.push('/marketplace-chat')}
    />
  );
}
