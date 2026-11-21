import {
  AndroidImportance,
  getDevicePushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Linking } from 'react-native';

import type { PushDevice, PushPermission, PushPort } from './port';

/** The Android channel alerts arrive on; the config plugin names it the default (`app.json`). */
export const ALERTS_CHANNEL_ID = 'alerts';

function permissionOf(status: { granted: boolean; status: string }): PushPermission {
  if (status.granted) return 'granted';
  return status.status === 'denied' ? 'denied' : 'undetermined';
}

const UNSUPPORTED: PushPort = {
  permission: async () => 'unsupported',
  request: async () => 'unsupported',
  token: async () => null,
  openSettings: async () => undefined,
};

/**
 * The push port on a phone, through `expo-notifications`. The web build and Expo Go have no push
 * (Expo Go has received no remote notifications on Android since SDK 53) and answer `unsupported`
 * for everything, without touching the module.
 *
 * A platform call that rejects answers `unsupported` rather than escaping: the alerts switch then
 * says this phone cannot receive alerts, which is what the picker can act on.
 */
export function createExpoPushPort(
  os: string,
  { expoGo = false }: { expoGo?: boolean } = {},
): PushPort {
  if ((os !== 'ios' && os !== 'android') || expoGo) return UNSUPPORTED;
  const platform: PushDevice['platform'] = os;

  return {
    async permission() {
      try {
        return permissionOf(await getPermissionsAsync());
      } catch {
        return 'unsupported';
      }
    },

    async request() {
      // Android 13 asks for the permission only once a channel exists to show alerts on. A channel
      // the platform will not create is not a reason not to ask: the default channel still shows.
      if (platform === 'android') {
        try {
          await setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
            name: 'Picky alerts',
            importance: AndroidImportance.DEFAULT,
          });
        } catch {
          // Seen on Android: the module rejected with a NullPointerException.
        }
      }
      try {
        return permissionOf(await requestPermissionsAsync());
      } catch {
        return 'unsupported';
      }
    },

    async token() {
      try {
        const issued = await getDevicePushTokenAsync();
        return typeof issued.data === 'string' && issued.data !== ''
          ? { token: issued.data, platform }
          : null;
      } catch {
        // No Firebase or APNs configuration in this build, or a simulator: no token to register.
        return null;
      }
    },

    async openSettings() {
      await Linking.openSettings();
    },
  };
}
