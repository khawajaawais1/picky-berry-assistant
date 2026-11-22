import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { interpolate, useTranslation } from '@/services/i18n';
import type { AlertNotifier } from '@/services/push';

import {
  alertKey,
  alertNotificationData,
  alertsToNotify,
  zoneTargetOf,
} from '../domain/reasoning-alert';
import type { Species } from '../domain/species';
import { readNotifiedAlerts, recordNotifiedAlerts } from '../services/notified-alerts-store';
import type { ReasoningAlertsSource } from '../services/reasoning-alerts-source';
import { SPECIES_LABEL_KEY } from './species-copy';

/** How often an open app looks for new alerts; the reasoning job itself runs once a day. */
export const ALERT_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type AlertNotificationsProps = {
  source: ReasoningAlertsSource;
  notifier: AlertNotifier;
  /** Opens a zone on the zone screen, for the berry the tapped alert is about. */
  onOpenZone: (zoneId: string, species: Species) => void;
  now?: () => Date;
};

/**
 * Feature 6.7 on the phone: the alerts the reasoning backend wrote (`GET /api/v1/alerts`) shown as
 * notifications whose text is the rule's own sentence, and a tapped one — raised here or pushed by
 * FCM, whose data is the same — opening its zone. It looks on start, when the app returns to the
 * foreground and hourly while open, and only once the platform allows notifications (the alerts
 * switch asks, ADR-067). It applies the backend's own floors so a picker is not flooded: score at
 * least 70, never low confidence, two a day, a zone and berry once in three days. Draws nothing.
 */
export function AlertNotifications({
  notifier,
  now = () => new Date(),
  onOpenZone,
  source,
}: AlertNotificationsProps) {
  const { t } = useTranslation();
  const latest = useRef({ now, onOpenZone, t });
  useEffect(() => {
    latest.current = { now, onOpenZone, t };
  });

  useEffect(
    () =>
      notifier.onTap((data) => {
        const target = zoneTargetOf(data);
        if (target) latest.current.onOpenZone(target.zoneId, target.species);
      }),
    [notifier],
  );

  useEffect(() => {
    let checking = false;
    let mounted = true;

    async function check() {
      if (checking) return;
      checking = true;
      try {
        if (!(await notifier.canNotify())) return;
        const alerts = await source.list();
        const at = latest.current.now();
        const due = alertsToNotify({ alerts, notified: await readNotifiedAlerts(), now: at });
        if (!mounted || due.length === 0) return;

        const { t: translate } = latest.current;
        for (const alert of due) {
          await notifier.show({
            title: interpolate(translate('discover.alert.notification.title'), {
              species: translate(SPECIES_LABEL_KEY[alert.species]),
            }),
            body: alert.sentence,
            data: alertNotificationData(alert),
          });
        }
        await recordNotifiedAlerts(due.map(alertKey), at);
      } catch {
        // A background look that fails (offline, the free-tier backend still waking) shows
        // nothing; the next look tries again, and the Alerts tab is where a read failure is said.
      } finally {
        checking = false;
      }
    }

    void check();
    const timer = setInterval(() => void check(), ALERT_CHECK_INTERVAL_MS);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    return () => {
      mounted = false;
      clearInterval(timer);
      foreground.remove();
    };
  }, [notifier, source]);

  return null;
}
