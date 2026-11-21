import { useCallback } from 'react';

import { usePushRegistration } from '@/hooks/use-push-alerts';
import { useSession } from '@/hooks/use-session';
import type { PushDevice, PushPort } from '@/services/push';

import type { AccountApi } from '../services/account-api';

export type PushRegistrationProps = {
  accountApi: Pick<AccountApi, 'registerDevice'>;
  push: PushPort;
  /** The app's own version, sent with the token so the service can tell builds apart. */
  appVersion?: string;
};

/**
 * Hands this phone's push token to the account service (`POST /me/devices`) on each start and for
 * each account signed in, once the platform allows alerts (ADR-067). Tokens rotate, so registering
 * again is how the service keeps the current one. It never asks for the permission — the alerts
 * switch does — and it draws nothing. Mounted once in the app shell.
 */
export function PushRegistration({ accountApi, appVersion, push }: PushRegistrationProps) {
  const { session } = useSession();
  const register = useCallback(
    (device: PushDevice) =>
      accountApi.registerDevice(appVersion === undefined ? device : { ...device, appVersion }),
    [accountApi, appVersion],
  );

  usePushRegistration({ push, register, accountId: session?.accountId ?? null });
  return null;
}
