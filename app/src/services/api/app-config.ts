import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { loadConfig, resolveDevelopmentApiBaseUrl, type ConfigResult } from '@/config/env';

/**
 * The app's validated public configuration, with a development build's loopback API URL pointed
 * at the machine Metro serves from (`resolveDevelopmentApiBaseUrl`), so `localhost` in `.env`
 * reaches the API from a phone or emulator too. Every transport reads its base URL here.
 */
export function appConfig(): ConfigResult {
  const result = loadConfig();
  if (!result.ok) return result;

  return {
    ok: true,
    config: resolveDevelopmentApiBaseUrl(result.config, {
      platform: Platform.OS,
      devServerHostUri: Constants.expoConfig?.hostUri ?? null,
    }),
  };
}
