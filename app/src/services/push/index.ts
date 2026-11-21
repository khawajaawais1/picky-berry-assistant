import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { createExpoPushPort } from './expo-push';

export type { PushDevice, PushPermission, PushPort } from './port';
export {
  registerThisDevice,
  type DeviceRegistrationOutcome,
  type RegisterDevice,
} from './register-device';
export { createExpoPushPort } from './expo-push';

/** The push port the app's screens and shell use (ADR-067). */
export const appPushPort = createExpoPushPort(Platform.OS, { expoGo: isRunningInExpoGo() });
