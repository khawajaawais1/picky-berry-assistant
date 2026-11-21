import { router, useCanGoBack } from 'expo-router';

import { AlertPreferencesScreen } from '@/features/discover';
import { appAccountApi } from '@/features/privacy';

/**
 * The screen behind frame 12's “Search radius” and “Species” rows, app-drawn because the frame
 * draws the rows and nothing behind them (ADR-067). The back control is drawn only when there is
 * history to go back to.
 */
export default function AlertPreferencesRoute() {
  const canGoBack = useCanGoBack();

  return (
    <AlertPreferencesScreen
      accountApi={appAccountApi}
      onBack={canGoBack ? () => router.back() : undefined}
    />
  );
}
