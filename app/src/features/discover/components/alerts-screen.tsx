import { Feather } from '@/components/atoms/app-icon';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { ProfileApi } from '@/features/privacy';
import { interpolate, useTranslation } from '@/services/i18n';
import { appPushPort, type PushPort, type RegisterDevice } from '@/services/push';

import { confidenceLabelKey } from '../domain/alert';
import { alertKey, type ReasoningAlert } from '../domain/reasoning-alert';
import type { Species } from '../domain/species';
import { SCORE_MAX } from '../domain/zone-details';
import type { ReasoningAlertsSource } from '../services/reasoning-alerts-source';
import { LiveAlertPreferences } from './live-alert-preferences';
import { SPECIES_LABEL_KEY } from './species-copy';
import { RIPENESS_LABEL_KEY } from './zone-source-copy';

export type AlertsScreenProps = {
  onBack?: () => void;
  /**
   * The reasoning backend's alerts (`GET /api/v1/alerts`, feature 6.7); without it the screen
   * shows the preferences alone.
   */
  alertsSource?: ReasoningAlertsSource;
  accountApi?: ProfileApi;
  push?: PushPort;
  register?: RegisterDevice;
  onOpenPreferences?: () => void;
  /** Opens an alert's zone on the zone screen, for the berry the alert is about. */
  onOpenZone?: (zoneId: string, species: Species) => void;
};

/** The service answers every zone it scored; the inbox draws the best of them. */
export const ALERTS_SHOWN = 20;

/**
 * Screen 12 · Core picker · Alerts and forecast (Figma node `5:23439`).
 *
 * The explainable alerts the daily reasoning job produced (`GET /api/v1/alerts`, feature 6.7): one
 * card per zone and berry, best score first, each with its score, confidence, ripeness, the rule's
 * own sentence and a way into the zone. Below them, the picker's own alert preferences, saved to
 * their account (ADR-067).
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
  const feed = useQuery({
    queryKey: ['reasoning-alerts'],
    queryFn: async () =>
      [...(await alertsSource!.list())].sort((a, b) => b.score - a.score).slice(0, ALERTS_SHOWN),
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
          feed.data.length === 0 ? (
            <StatusMessage testID="alerts-empty" tone="muted" variant="bodySmall">
              {t('discover.alert.empty')}
            </StatusMessage>
          ) : (
            feed.data.map((alert) => (
              <AlertCard
                alert={alert}
                key={`${alert.ruleId}:${alertKey(alert)}`}
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

function AlertCard({ alert, onOpen }: { alert: ReasoningAlert; onOpen?: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const species = t(SPECIES_LABEL_KEY[alert.species]);

  const card = (
    <View
      className="w-full gap-cardGap rounded-lg px-section py-section"
      style={{ backgroundColor: colors.accentMuted }}
      testID={`alert-card-${alertKey(alert)}`}
    >
      <View className="w-full flex-row items-center gap-gap">
        <Feather color={colors.accent} name="bell" size={22} />
        <AppText className="flex-1" variant="heroTitle">
          {interpolate(t('discover.alert.headline.zone'), { species, zone: alert.zoneName })}
        </AppText>
        {onOpen ? <Feather color={colors.accent} name="chevron-right" size={20} /> : null}
      </View>

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

      {/* The rule's own explanation, as the reasoning service wrote it (English for now). */}
      <AppText tone="muted" variant="caption">
        {alert.sentence}
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
