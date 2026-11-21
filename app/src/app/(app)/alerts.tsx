import { router } from 'expo-router';

import { AlertsScreen } from '@/features/discover';
import { appAccountApi, appProfileApi } from '@/features/privacy';
import { appPushPort } from '@/services/push';

/**
 * Screen 12 · Core picker · Alerts and forecast (Figma node `5:23439`).
 *
 * A route only wires a screen to a feature's public API. The alert itself is the feature's own
 * sample; its preferences card is the account's (ADR-067): the push switch is the platform's
 * permission and registers this phone, and the radius and species rows open the Alert preferences
 * screen. The layout harness's stub build has no profile API (`appProfileApi`), so it measures the
 * card as the design's sample. The frame has no back control — in the design this screen is a tab — and neither does
 * the route, because a tab's navigation is the bar and not the history underneath it (AGENTS.md
 * §11.2; `src/config/__tests__/shell-tab-roots.test.ts` holds the rule).
 */
export default function AlertsRoute() {
  return (
    <AlertsScreen
      accountApi={appProfileApi}
      onOpenPreferences={() => router.push('/alert-preferences')}
      push={appPushPort}
      register={(device) => appAccountApi.registerDevice(device)}
    />
  );
}
