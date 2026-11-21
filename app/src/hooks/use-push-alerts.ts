import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  registerThisDevice,
  type DeviceRegistrationOutcome,
  type PushPermission,
  type PushPort,
  type RegisterDevice,
} from '@/services/push';

/**
 * Frame 12's “Ripe-berry push alerts” switch (ADR-067). Its state is the **platform's permission**,
 * because that is the only switch that decides whether this phone can be alerted:
 *
 * - `on` — granted; `off` — never asked; `denied` — refused in the phone's settings;
 *   `unsupported` — no push on this build (the web);
 * - `turnOn` asks for the permission (only ever from the picker's press) and registers the phone;
 * - turning alerts **off** is the platform's own switch: an app cannot take its permission back,
 *   so `openSettings` opens the page where it is done, and the state is read again when the
 *   picker comes back.
 */
export type PushAlertStatus = 'loading' | 'on' | 'off' | 'denied' | 'unsupported';

export type PushAlerts = {
  status: PushAlertStatus;
  /** The outcome of the registration this screen asked for, if it asked. */
  registration: DeviceRegistrationOutcome | null;
  turnOn: () => Promise<void>;
  openSettings: () => Promise<void>;
};

function statusOf(permission: PushPermission): PushAlertStatus {
  if (permission === 'granted') return 'on';
  if (permission === 'undetermined') return 'off';
  return permission;
}

export function usePushAlerts({
  push,
  register,
}: {
  push: PushPort;
  register: RegisterDevice | undefined;
}): PushAlerts {
  const [status, setStatus] = useState<PushAlertStatus>('loading');
  const [registration, setRegistration] = useState<DeviceRegistrationOutcome | null>(null);

  useEffect(() => {
    let active = true;
    const read = () =>
      push.permission().then(
        (permission) => {
          if (active) setStatus(statusOf(permission));
        },
        () => {
          if (active) setStatus('unsupported');
        },
      );

    void read();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void read();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [push]);

  const turnOn = useCallback(async () => {
    let permission: PushPermission;
    try {
      permission = await push.request();
    } catch {
      // A platform that cannot ask cannot alert: the switch says so instead of a rejection escaping.
      permission = 'unsupported';
    }
    setStatus(statusOf(permission));
    if (permission !== 'granted' || !register) return;
    setRegistration(await registerThisDevice({ push, register }));
  }, [push, register]);

  const openSettings = useCallback(() => push.openSettings(), [push]);

  return { status, registration, turnOn, openSettings };
}

/**
 * Registers this phone with the account service on each start and for each account signed in, once
 * the platform's permission is granted (ADR-067). It never asks for the permission: that is the
 * alerts switch's job. Mounted once in the app shell.
 */
export function usePushRegistration({
  push,
  register,
  accountId,
}: {
  push: PushPort;
  register: RegisterDevice;
  accountId: string | null;
}): void {
  useEffect(() => {
    if (accountId === null) return;
    // A failed registration is tried again on the next start; nothing here can say it.
    void registerThisDevice({ push, register }).catch(() => undefined);
  }, [accountId, push, register]);
}
