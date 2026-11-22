import { Platform } from 'react-native';

import type { ConfigResult } from '@/config/env';
import { appConfig } from '@/services/api/app-config';
import { createApiClient, type ApiFetch } from '@/services/api/api-client';

import {
  createApiPasswordResetCompletion,
  createApiPasswordResetRequest,
} from './api-password-reset';
import { createApiSessionPort, type ApiSessionPort } from './api-port';
import { createSecureSessionStore, type SecureStorage } from './secure-store';
import { createInMemorySessionStore } from './store';

/**
 * The app's one session port (ADR-065), composed from configuration.
 *
 * - **The API adapter** over the validated base URL from `src/config/env.ts`.
 * - **Secure storage on a device** (ADR-006). The web export has no keychain, so there the
 *   session lives in memory for the tab's lifetime and is never written to web storage.
 * - **An unusable configuration answers nothing.** A build whose base URL failed validation gets
 *   a port that refuses everything as `unavailable` and sends no request. A credential must
 *   never go to an address `env.ts` rejected.
 */
export type AppSessionPortOptions = {
  config: ConfigResult;
  platform: typeof Platform.OS;
  fetchImpl?: ApiFetch;
  secureStorage?: SecureStorage;
};

const UNAVAILABLE = { ok: false, reason: 'unavailable' } as const;

const unavailable = async () => UNAVAILABLE;
const nothing = async () => null;

const unconfiguredPort: ApiSessionPort = {
  signIn: unavailable,
  register: unavailable,
  current: nothing,
  signOut: async () => undefined,
  requestPasswordReset: unavailable,
  completePasswordReset: unavailable,
  tokens: { accessToken: nothing, refresh: nothing },
};

export function createAppSessionPort({
  config,
  platform,
  fetchImpl,
  secureStorage,
}: AppSessionPortOptions): ApiSessionPort {
  if (!config.ok) return unconfiguredPort;

  const client = createApiClient({ baseUrl: config.config.apiBaseUrl, fetchImpl });

  return createApiSessionPort({
    client,
    passwordReset: createApiPasswordResetRequest({ client }),
    passwordResetComplete: createApiPasswordResetCompletion({ client }),
    store:
      platform === 'web'
        ? createInMemorySessionStore()
        : createSecureSessionStore(secureStorage ? { storage: secureStorage } : {}),
  });
}

/** The port the app itself uses. One instance, because a session is one thing. */
export const sessionPort: ApiSessionPort = createAppSessionPort({
  config: appConfig(),
  platform: Platform.OS,
});
