import { router } from 'expo-router';

import { appMarketApi, MarketBrowseScreen } from '@/features/marketplace';

/** Screen 15 · Marketplace · Browse: the active listings from the API. */
export default function MarketBrowseRoute() {
  return (
    <MarketBrowseScreen
      marketApi={appMarketApi}
      onOpenListing={(listing) =>
        router.push({ pathname: '/marketplace-listing', params: { listing } })
      }
    />
  );
}
