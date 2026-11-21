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
 * The push port on a phone, through `expo-notifications`. The web build has no push and answers
 * `unsupported` for everything, without touching the module.
 */
export function createExpoPushPort(os: string): PushPort {
  if (os !== 'ios' && os !== 'android') return UNSUPPORTED;
  const platform: PushDevice['platform'] = os;

  return {
    async permission() {
      return permissionOf(await getPermissionsAsync());
    },

    async request() {
      // Android 13 asks for the permission only once a channel exists to show alerts on.
      if (platform === 'android') {
        await setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
          name: 'Picky alerts',
          importance: AndroidImportance.DEFAULT,
        });
      }
      return permissionOf(await requestPermissionsAsync());
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
