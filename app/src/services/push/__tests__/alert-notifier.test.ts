import * as Notifications from 'expo-notifications';

import { createExpoAlertNotifier } from '../alert-notifier';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;

function responseWith(data: Record<string, unknown>) {
  return { notification: { request: { content: { data } } } } as never;
}

/**
 * The platform adapter behind an alert the phone shows itself: `expo-notifications` presents it
 * (in the foreground too) and reports the tap, including the one that started the app.
 */
describe('createExpoAlertNotifier', () => {
  afterEach(() => jest.clearAllMocks());

  it('may notify only once the platform allows it', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: true } as never);
    expect(await createExpoAlertNotifier('android').canNotify()).toBe(true);

    mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    expect(await createExpoAlertNotifier('ios').canNotify()).toBe(false);

    mocked.getPermissionsAsync.mockRejectedValueOnce(new Error('no module'));
    expect(await createExpoAlertNotifier('ios').canNotify()).toBe(false);
  });

  it('shows the alert at once, with its title, sentence and data', async () => {
    await createExpoAlertNotifier('android').show({
      title: 'Berry alert: Bilberry',
      body: 'Ripe bilberry in zone Ukonvuori 4 — yield score 82, medium confidence.',
      data: { zoneId: 'z1', species: 'bilberry' },
    });

    expect(mocked.setNotificationHandler).toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Berry alert: Bilberry',
        body: 'Ripe bilberry in zone Ukonvuori 4 — yield score 82, medium confidence.',
        data: { zoneId: 'z1', species: 'bilberry' },
      },
      trigger: null,
    });
  });

  it('hands over the tap that started the app, once, and each later tap', () => {
    mocked.getLastNotificationResponse.mockReturnValueOnce(responseWith({ zoneId: 'cold' }));
    const handler = jest.fn();

    const stop = createExpoAlertNotifier('ios').onTap(handler);
    expect(handler).toHaveBeenCalledWith({ zoneId: 'cold' });
    expect(mocked.clearLastNotificationResponse).toHaveBeenCalled();

    const listener = mocked.addNotificationResponseReceivedListener.mock.calls[0]![0];
    listener(responseWith({ zoneId: 'warm' }));
    expect(handler).toHaveBeenLastCalledWith({ zoneId: 'warm' });

    stop();
    const subscription = mocked.addNotificationResponseReceivedListener.mock.results[0]!.value;
    expect(subscription.remove).toHaveBeenCalled();
  });

  it('does nothing on the web, which has no notifications', async () => {
    const notifier = createExpoAlertNotifier('web');

    expect(await notifier.canNotify()).toBe(false);
    await notifier.show({ title: 't', body: 'b', data: {} });
    notifier.onTap(jest.fn())();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocked.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });
});
