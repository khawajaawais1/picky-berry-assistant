/**
 * The push port (ADR-067): what the app needs from the platform to be reachable by a push alert.
 *
 * - **the permission**, read without asking and asked for only from a control the picker pressed;
 * - **the native token** the platform issues — FCM on Android, APNs on iOS — which is what the
 *   account service's `POST /me/devices` takes. A build without its Firebase or APNs configuration
 *   answers no token, and the app says so rather than registering nothing;
 * - **the platform's settings**, because an app cannot take its own notification permission back:
 *   turning alerts off is the platform's switch, and the app opens it.
 *
 * Nothing here is stored on the phone: the token is the platform's, read again on each start, and
 * the service is where the registration is kept.
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export type PushDevice = { token: string; platform: 'ios' | 'android' };

export type PushPort = {
  permission(): Promise<PushPermission>;
  request(): Promise<PushPermission>;
  token(): Promise<PushDevice | null>;
  openSettings(): Promise<void>;
};
