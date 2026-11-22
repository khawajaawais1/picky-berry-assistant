import { Feather } from '@/components/atoms/app-icon';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDevicePosition } from '@/hooks/use-device-position';
import type { ProfileApi } from '@/features/privacy';
import { formatShortDate, interpolate, useTranslation } from '@/services/i18n';
import { appPushPort, type PushPort, type RegisterDevice } from '@/services/push';

import { confidenceLabelKey, type PickerAlert } from '../domain/alert';
import { formatDistance } from '../domain/route';
import type { Species } from '../domain/species';
import { SCORE_MAX } from '../domain/zone-details';
import type { AlertsSource } from '../services/api-alerts-source';
import { LiveAlertPreferences } from './live-alert-preferences';
import { SPECIES_LABEL_KEY } from './species-copy';
import { RIPENESS_LABEL_KEY } from './zone-source-copy';

export type AlertsScreenProps = {
  onBack?: () => void;
  /** The alert feed (`GET /alerts`); without it the screen shows the preferences alone. */
  alertsSource?: AlertsSource;
  accountApi?: ProfileApi;
  push?: PushPort;
  register?: RegisterDevice;
  onOpenPreferences?: () => void;
  /** Opens an alert's zone on the zone screen, for the berry the alert is about. */
  onOpenZone?: (zoneId: string, species: Species) => void;
};

/**
 * Screen 12 · Core picker · Alerts and forecast (Figma node `5:23439`).
 *
 * The explainable alerts the reasoning job produced for this picker (`GET /alerts`): one card per
 * zone and berry, nearest first when the phone has a position fix, each with its score,
 * confidence, ripeness and freshest report, and a way into the zone. Below them, the picker's own
 * alert preferences, saved to their account (ADR-067).
 */
export function AlertsScreen({
  accountApi,
  alertsSource,
  onBack,
  onOpenPreferences,
  onOpenZone,
  push = appPushPort,
  register,
}: AlertsScreenProps) {
  const { t } = useTranslation();
  const { fix } = useDevicePosition();
  const position = fix ? { latitude: fix.latitude, longitude: fix.longitude } : undefined;
  const feed = useQuery({
    // Rounded so a walking picker does not refetch on every metre.
    queryKey: [
      'alerts',
      position ? Math.round(position.latitude * 100) : null,
      position ? Math.round(position.longitude * 100) : null,
    ],
    queryFn: () => alertsSource!.list(position),
    enabled: alertsSource !== undefined,
    retry: false,
  });

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.alert.eyebrow')}
      onBack={onBack}
      title={t('discover.alert.title')}
    >
      <View className="w-full gap-section">
        {alertsSource === undefined ? null : feed.data ? (
          feed.data.alerts.length === 0 ? (
            <StatusMessage testID="alerts-empty" tone="muted" variant="bodySmall">
              {t('discover.alert.empty')}
            </StatusMessage>
          ) : (
            feed.data.alerts.map((alert) => (
              <AlertCard
                alert={alert}
                key={alert.id}
                onOpen={onOpenZone ? () => onOpenZone(alert.zoneId, alert.species) : undefined}
              />
            ))
          )
        ) : (
          <StatusMessage
            testID="alerts-status"
            tone={feed.isError ? 'danger' : 'muted'}
            variant="bodySmall"
          >
            {t(feed.isError ? 'discover.alert.readFailed' : 'common.loading')}
          </StatusMessage>
        )}

        {accountApi ? (
          <LiveAlertPreferences
            accountApi={accountApi}
            onOpenPreferences={onOpenPreferences}
            push={push}
            register={register}
          />
        ) : null}

        <AppText tone="muted" variant="metadata">
          {t('discover.alert.note')}
        </AppText>
      </View>
    </Screen>
  );
}

function AlertCard({ alert, onOpen }: { alert: PickerAlert; onOpen?: () => void }) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const species = t(SPECIES_LABEL_KEY[alert.species]);
  const at = new Date(alert.computedAt);
  const time = at.toLocaleTimeString(locale === 'fi' ? 'fi-FI' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const card = (
    <View
      className="w-full gap-cardGap rounded-lg px-section py-section"
      style={{ backgroundColor: colors.accentMuted }}
      testID={`alert-card-${alert.id}`}
    >
      <View className="w-full flex-row items-center gap-gap">
        <Feather color={colors.accent} name="bell" size={22} />
        <AppText className="flex-1" style={{ fontWeight: '600' }} tone="accent" variant="metadata">
          {interpolate(t('discover.alert.stamp'), {
            date: formatShortDate(alert.computedAt, locale),
            time,
          })}
        </AppText>
        {onOpen ? <Feather color={colors.accent} name="chevron-right" size={20} /> : null}
      </View>

      <AppText variant="heroTitle">
        {alert.distanceMeters === null
          ? interpolate(t('discover.alert.headline.zone'), { species, zone: alert.zoneName })
          : interpolate(t('discover.alert.headline'), {
              distance: formatDistance(alert.distanceMeters, locale),
              species,
            })}
      </AppText>

      <View className="w-full flex-row flex-wrap gap-sm">
        <AlertChip
          label={interpolate(t('discover.alert.score'), {
            max: String(SCORE_MAX),
            score: String(alert.score),
          })}
          testID="alert-score"
          tone="accent"
        />
        <AlertChip
          label={t(confidenceLabelKey(alert.confidence))}
          testID="alert-confidence"
          tone="success"
        />
        <AlertChip
          label={t(RIPENESS_LABEL_KEY[alert.ripeness])}
          testID="alert-ripeness"
          tone="success"
        />
      </View>

      <AppText tone="muted" variant="caption">
        {alert.latestReportAt === null
          ? interpolate(t('discover.alert.context.noReport'), { zone: alert.zoneName })
          : interpolate(t('discover.alert.context'), {
              date: formatShortDate(alert.latestReportAt, locale),
              zone: alert.zoneName,
            })}
      </AppText>
    </View>
  );

  return onOpen ? (
    <Pressable
      accessibilityLabel={interpolate(t('discover.alert.open'), { zone: alert.zoneName })}
      accessibilityRole="button"
      onPress={onOpen}
    >
      {card}
    </Pressable>
  ) : (
    card
  );
}

function AlertChip({
  label,
  testID,
  tone,
}: {
  label: string;
  testID: string;
  tone: 'accent' | 'success';
}) {
  const { colors } = useAppTheme();
  const tint = tone === 'accent' ? colors.accent : colors.successMuted;

  return (
    <View
      className="min-h-chip flex-row items-center rounded-pill px-gap"
      style={{ backgroundColor: tint, borderColor: tint, borderWidth: 1 }}
      testID={testID}
    >
      <AppText
        style={{ color: tone === 'accent' ? colors.onAccent : colors.success, fontWeight: '600' }}
        variant="label"
      >
        {label}
      </AppText>
    </View>
  );
}
