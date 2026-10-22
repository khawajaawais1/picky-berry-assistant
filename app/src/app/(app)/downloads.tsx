import { router } from 'expo-router';

import { OfflineSyncScreen } from '@/features/offline';

/**
 * Screen 13 · Account and offline · Downloads (Figma node `5:23530`).
 *
 * A route only wires a screen to a feature's public API; this screen reads the device's report
 * queue through the shared hook, so the route supplies nothing but the way out. The frame draws a
 * back control, so the route offers one whenever there is somewhere to go back to — a deep link
 * straight to this route has not, and a control that cannot act must not claim a role
 * (AGENTS.md §11.2).
 *
 * The way in is frame 14's “Offline maps & sync” row (`src/app/privacy-settings.tsx`), which is
 * the design's own place for it; a deep link reaches the screen directly too, and then there is
 * nowhere to go back to.
 */
export default function DownloadsRoute() {
  return <OfflineSyncScreen onBack={router.canGoBack() ? () => router.back() : undefined} />;
}
