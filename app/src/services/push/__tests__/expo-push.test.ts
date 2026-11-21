import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import { createExpoPushPort } from '../expo-push';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getDevicePushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;

/**
 * The platform adapter behind the push port (ADR-067): `expo-notifications` for the permission and
 * the native token (FCM on Android, APNs on iOS), and the platform's own settings screen for
 * turning alerts off. The web build has no push, and says so.
 */
describe('createExpoPushPort', () => {
  afterEach(() => jest.clearAllMocks());

  it('reads the permission without asking', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);

    expect(await createExpoPushPort('ios').permission()).toBe('granted');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('creates the alerts channel before Android asks, as Android 13 requires', async () => {
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false } as never);

    expect(await createExpoPushPort('android').request()).toBe('denied');
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      'alerts',
      expect.objectContaining({ importance: 3 }),
    );
    expect(mocked.setNotificationChannelAsync.mock.invocationCallOrder[0]!).toBeLessThan(
      mocked.requestPermissionsAsync.mock.invocationCallOrder[0]!,
    );
  });

  it('answers the native token with its platform', async () => {
    mocked.getDevicePushTokenAsync.mockResolvedValue({ type: 'ios', data: 'apns-1' } as never);

    expect(await createExpoPushPort('ios').token()).toEqual({ token: 'apns-1', platform: 'ios' });
  });

  it('answers no token when the platform cannot issue one', async () => {
    mocked.getDevicePushTokenAsync.mockRejectedValue(new Error('no google-services.json'));

    expect(await createExpoPushPort('android').token()).toBeNull();
  });

  it('opens the platform’s settings to turn alerts off', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

    await createExpoPushPort('ios').openSettings();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('has no push on the web', async () => {
    const port = createExpoPushPort('web');

    expect(await port.permission()).toBe('unsupported');
    expect(await port.request()).toBe('unsupported');
    expect(await port.token()).toBeNull();
    expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
  });
});
