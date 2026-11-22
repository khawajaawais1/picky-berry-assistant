import {
  addNotificationResponseReceivedListener,
  clearLastNotificationResponse,
  getLastNotificationResponse,
  getPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationHandler,
} from 'expo-notifications';

/**
 * What the app needs to show an alert itself and to know when one is tapped (feature 6.7). The
 * reasoning backend's FCM push and the alert the app raises from `GET /api/v1/alerts` carry the
 * same data, so one tap handler serves both.
 *
 * It never asks for the permission: the alerts switch does (ADR-067). Without it, nothing shows.
 */
export type AlertNotification = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export type AlertNotifier = {
  canNotify(): Promise<boolean>;
  show(notification: AlertNotification): Promise<void>;
  /** Calls `handler` with each tapped notification's data, starting with the one that opened the app. */
  onTap(handler: (data: unknown) => void): () => void;
};

const UNSUPPORTED: AlertNotifier = {
  canNotify: async () => false,
  show: async () => undefined,
  onTap: () => () => undefined,
};

let presentingInForeground = false;

/** A notification raised while the app is open is shown, not swallowed. */
function presentInForeground(): void {
  if (presentingInForeground) return;
  presentingInForeground = true;
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** The notifier on a phone, through `expo-notifications`. The web build has none. */
export function createExpoAlertNotifier(os: string): AlertNotifier {
  if (os !== 'ios' && os !== 'android') return UNSUPPORTED;

  return {
    async canNotify() {
      try {
        return (await getPermissionsAsync()).granted;
      } catch {
        return false;
      }
    },

    async show({ title, body, data }) {
      presentInForeground();
      await scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
    },

    onTap(handler) {
      presentInForeground();
      const opening = getLastNotificationResponse();
      if (opening) {
        // Cleared so a remount of the shell does not open the same zone again.
        clearLastNotificationResponse();
        handler(opening.notification.request.content.data);
      }

      const subscription = addNotificationResponseReceivedListener((response) =>
        handler(response.notification.request.content.data),
      );
      return () => subscription.remove();
    },
  };
}
