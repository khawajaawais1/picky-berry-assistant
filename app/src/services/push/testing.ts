import type { PushDevice, PushPermission, PushPort } from './port';

/** A push port whose every call is a recording mock. Nothing in the app imports it. */
export function fakePushPort({
  permission = 'undetermined',
  afterRequest = 'granted',
  token = { token: 'token-1', platform: 'ios' },
}: {
  permission?: PushPermission;
  afterRequest?: PushPermission;
  token?: PushDevice | null;
} = {}) {
  let current = permission;

  return {
    permission: jest.fn(async () => current),
    request: jest.fn(async () => {
      current = afterRequest;
      return current;
    }),
    token: jest.fn(async () => token),
    openSettings: jest.fn(async () => undefined),
    /** What the platform answers next, as if the picker changed it in the phone's settings. */
    setPermission(next: PushPermission) {
      current = next;
    },
  } satisfies PushPort & { setPermission: (next: PushPermission) => void };
}
