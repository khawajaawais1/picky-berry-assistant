import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { createExpoAlertNotifier } from './alert-notifier';
import { createExpoPushPort } from './expo-push';

export type { PushDevice, PushPermission, PushPort } from './port';
export {
  registerThisDevice,
  type DeviceRegistrationOutcome,
  type RegisterDevice,
} from './register-device';
export { createExpoPushPort } from './expo-push';
export {
  createExpoAlertNotifier,
  type AlertNotification,
  type AlertNotifier,
} from './alert-notifier';

/** The push port the app's screens and shell use (ADR-067). */
export const appPushPort = createExpoPushPort(Platform.OS, { expoGo: isRunningInExpoGo() });

/** Shows the alerts the app raises and reports their taps (feature 6.7). */
export const appAlertNotifier = createExpoAlertNotifier(Platform.OS);
