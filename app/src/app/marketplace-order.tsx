import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';

import { appMarketApi, MarketOrderScreen } from '@/features/marketplace';

/**
 * Screen 18 · Marketplace · Order: the order form for `?listing=`, or the order `?order=` names.
 * A placed order replaces the form, so going back does not reopen a form already sent.
 */
export default function MarketOrderRoute() {
  const canGoBack = useCanGoBack();
  const { listing, order } = useLocalSearchParams<{ listing?: string; order?: string }>();

  return (
    <MarketOrderScreen
      listingId={listing}
      marketApi={appMarketApi}
      onBack={canGoBack ? () => router.back() : undefined}
      onMessageSeller={(id) =>
        router.push({ pathname: '/marketplace-chat', params: { listing: id } })
      }
      onPlaced={(id) => router.replace({ pathname: '/marketplace-order', params: { order: id } })}
      orderId={order}
    />
  );
}
