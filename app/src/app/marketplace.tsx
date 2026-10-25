import { router } from 'expo-router';

import { MarketBrowseScreen } from '@/features/marketplace';

/**
 * Screen 15 · Planned marketplace · Browse (Figma node `5:23780`).
 *
 * A route only wires a screen to a feature's public API. This one leads on to the listing's own
 * screen (frame 16), which is the only listing the app has a story for.
 *
 * The design draws no way into the marketplace from the core screens — its four frames label
 * themselves “OUTSIDE CORE” and frame 14's settings rows do not mention it — so the screen is
 * reached by its own route, and PROJECT.md records that its entry point is still missing.
 */
export default function MarketBrowseRoute() {
  return <MarketBrowseScreen onOpenListing={() => router.push('/marketplace-listing')} />;
}
