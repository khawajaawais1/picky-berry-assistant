import { router, useCanGoBack } from 'expo-router';

import { MarketChatScreen } from '@/features/marketplace';
/**
 * Screen 17 · Planned marketplace · Seller chat (Figma node `5:23883`).
 *
 * The thread leads on to the order it is about (frame 18), which is the one thing on it that acts:
 * nothing sends a message, so the screen's composer claims no role and is drawn as the design draws
 * it (PROJECT.md records it).
 */
export default function MarketChatRoute() {
  const canGoBack = useCanGoBack();

  return (
    <MarketChatScreen
      onBack={canGoBack ? () => router.back() : undefined}
      onOpenOrder={() => router.push('/marketplace-order')}
    />
  );
}
