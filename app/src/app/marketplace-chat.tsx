import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import { appMarketApi, MarketChatScreen } from '@/features/marketplace';

/** Screen 17 · Marketplace · Seller chat, on the listing it was opened from. */
export default function MarketChatRoute() {
  const canGoBack = useCanGoBack();
  const { listing } = useLocalSearchParams<{ listing?: string }>();

  return (
    <MarketChatScreen
      listingId={listing}
      marketApi={appMarketApi}
      onBack={canGoBack ? () => router.back() : undefined}
      onOpenOrder={(id) => router.push({ pathname: '/marketplace-order', params: { listing: id } })}
    />
  );
}
