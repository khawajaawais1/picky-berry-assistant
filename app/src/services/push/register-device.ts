import type { PushDevice, PushPort } from './port';

/**
 * - `registered`: the service kept this phone's token;
 * - `not-allowed`: the platform's permission is not granted, so nothing was read or sent;
 * - `no-token`: allowed, but the platform issued no token (a build without its push configuration);
 * - `failed`: the service did not keep it. The next start tries again.
 */
export type DeviceRegistrationOutcome = 'registered' | 'not-allowed' | 'no-token' | 'failed';

export type RegisterDevice = (device: PushDevice) => Promise<{ ok: boolean }>;

/** Registers this phone for push alerts with the account service, if the platform allows it. */
export async function registerThisDevice({
  push,
  register,
}: {
  push: PushPort;
  register: RegisterDevice;
}): Promise<DeviceRegistrationOutcome> {
  if ((await push.permission()) !== 'granted') return 'not-allowed';

  const device = await push.token();
  if (device === null) return 'no-token';

  const outcome = await register(device);
  return outcome.ok ? 'registered' : 'failed';
}
