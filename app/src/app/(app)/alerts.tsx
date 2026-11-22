import { router } from 'expo-router';

import { AlertsScreen, appReasoningAlertsSource } from '@/features/discover';
import { appAccountApi, appProfileApi } from '@/features/privacy';
import { appPushPort } from '@/services/push';

/**
 * Screen 12 · Core picker · Alerts and forecast (Figma node `5:23439`): the reasoning backend's alerts
 * (`GET /api/v1/alerts`), each opening its zone, and the account's alert preferences (ADR-067). A tab, so
 * no back control (AGENTS.md §11.2).
 */
export default function AlertsRoute() {
  return (
    <AlertsScreen
      accountApi={appProfileApi}
      alertsSource={appReasoningAlertsSource}
      onOpenPreferences={() => router.push('/alert-preferences')}
      onOpenZone={(zone, species) =>
        router.push({ pathname: '/zone-details', params: { species, zone } })
      }
      push={appPushPort}
      register={(device) => appAccountApi.registerDevice(device)}
    />
  );
}
