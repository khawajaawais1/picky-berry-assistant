import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import { appMarketApi, MarketListingScreen } from '@/features/marketplace';

/** Screen 16 · Marketplace · Listing detail, for the listing the browse screen opened. */
export default function MarketListingRoute() {
  const canGoBack = useCanGoBack();
  const { listing } = useLocalSearchParams<{ listing?: string }>();

  return (
    <MarketListingScreen
      listingId={listing}
      marketApi={appMarketApi}
      onBack={canGoBack ? () => router.back() : undefined}
      onContactSeller={(id) =>
        router.push({ pathname: '/marketplace-chat', params: { listing: id } })
      }
      onOpenOrder={(id) => router.push({ pathname: '/marketplace-order', params: { listing: id } })}
    />
  );
}
