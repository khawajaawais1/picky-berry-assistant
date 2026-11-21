import { router, useCanGoBack } from 'expo-router';

import { appAccountApi, LanguageScreen } from '@/features/privacy';

/**
 * The screen behind frame 14's “Language” row, app-drawn because the frame draws the row and
 * nothing behind it (ADR-067). A route only wires a screen to a feature's public API; the back
 * control is drawn only when there is history to go back to.
 */
export default function LanguageRoute() {
  const canGoBack = useCanGoBack();

  return (
    <LanguageScreen
      accountApi={appAccountApi}
      onBack={canGoBack ? () => router.back() : undefined}
    />
  );
}
