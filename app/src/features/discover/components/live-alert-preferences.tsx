import { Feather } from '@/components/atoms/app-icon';
import { Pressable, Switch, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, StatusMessage, TextAction } from '@/components/molecules';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePushAlerts } from '@/hooks/use-push-alerts';
import { useSession } from '@/hooks/use-session';
import { useAccountProfile, type ProfileApi } from '@/features/privacy';
import { interpolate, useTranslation } from '@/services/i18n';
import type { PushPort, RegisterDevice } from '@/services/push';

import { formatRadius } from '../domain/alert-radius';
import { isSpecies } from '../domain/species';
import { SPECIES_LABEL_KEY } from './species-copy';

export type LiveAlertPreferencesProps = {
  accountApi: ProfileApi;
  push: PushPort;
  register?: RegisterDevice;
  /** Opens the Alert preferences screen, where the radius and species are changed. */
  onOpenPreferences?: () => void;
};

/**
 * Frame 12's alert-preferences card (nodes `5:23480`–`5:23504`), made real (ADR-067):
 *
 * - **Ripe-berry push alerts** is the platform's permission. Turning it on asks for it and
 *   registers this phone (`POST /me/devices`); turning it off opens the phone's settings, because an
 *   app cannot take its own permission back. Where there is no push the row says so and draws no
 *   switch.
 * - **Search radius** and **Species** are the account's (`GET /me`), changed on the Alert
 *   preferences screen the rows open. A species code the app cannot name is left out.
 * - **Quiet hours** has no field in the contract, so the row says it is not offered yet rather than
 *   drawing the design's 21:00–07:00 as if it were this account's.
 *
 * The card's last line says where the settings are kept and that the service sends no alert yet:
 * the backend stores the token and sends nothing.
 */
export function LiveAlertPreferences({
  accountApi,
  onOpenPreferences,
  push,
  register,
}: LiveAlertPreferencesProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const { session } = useSession();
  const { profile, status } = useAccountProfile(accountApi, session?.accountId ?? null);
  const alerts = usePushAlerts({ push, register });
  const pushLabel = t('discover.alert.preferences.push');

  const species = (profile?.speciesInterest ?? []).filter(isSpecies);
  const [first] = species;
  const speciesValue =
    first === undefined
      ? t('discover.alert.preferences.speciesNone')
      : species.length === 1
        ? t(SPECIES_LABEL_KEY[first])
        : interpolate(t('discover.alert.preferences.speciesValue'), {
            count: String(species.length - 1),
            species: t(SPECIES_LABEL_KEY[first]),
          });

  const registrationFailed = alerts.registration === 'failed' || alerts.registration === 'no-token';

  return (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="alert-preferences">
      <AppText style={{ fontWeight: '600' }} variant="cardLead">
        {t('discover.alert.preferences.title')}
      </AppText>

      {alerts.status === 'on' || alerts.status === 'off' || alerts.status === 'denied' ? (
        <View
          className="w-full flex-row items-center gap-gap py-setting"
          testID="alert-preferences-push"
        >
          <AppText className="flex-1" variant="cardTitle">
            {pushLabel}
          </AppText>
          <Switch
            accessibilityHint={
              alerts.status === 'on' ? t('discover.alert.push.offHint') : undefined
            }
            accessibilityLabel={pushLabel}
            ios_backgroundColor={colors.border}
            onValueChange={(next) => void (next ? alerts.turnOn() : alerts.openSettings())}
            testID="alert-preferences-push-switch"
            thumbColor={colors.onAccent}
            trackColor={{ false: colors.border, true: colors.accent }}
            value={alerts.status === 'on'}
          />
        </View>
      ) : null}

      {alerts.status === 'denied' ? (
        <View className="w-full gap-xs">
          <AppText tone="muted" variant="metadata">
            {t('discover.alert.push.denied')}
          </AppText>
          <TextAction
            label={t('discover.alert.push.openSettings')}
            onPress={() => void alerts.openSettings()}
          />
        </View>
      ) : null}

      {alerts.status === 'unsupported' ? (
        <AppText testID="alert-preferences-push-unsupported" tone="muted" variant="metadata">
          {t('discover.alert.push.unsupported')}
        </AppText>
      ) : null}

      {registrationFailed ? (
        <StatusMessage testID="alert-preferences-push-failed" tone="danger" variant="caption">
          {t('discover.alert.push.registerFailed')}
        </StatusMessage>
      ) : null}

      {/* The frame draws one divider, under its first setting (node 5:23487). */}
      <View
        className="w-full"
        style={{ backgroundColor: colors.border, height: 1 }}
        testID="alert-preferences-divider"
      />

      {status === 'loading' ? (
        <AppText tone="muted" variant="caption">
          {t('common.loading')}
        </AppText>
      ) : null}

      {status === 'error' ? (
        <StatusMessage testID="alert-preferences-read-failed" tone="danger" variant="caption">
          {t('discover.alert.preferences.readFailed')}
        </StatusMessage>
      ) : null}

      {status === 'none' ? (
        <AppText tone="muted" variant="metadata">
          {t('discover.alertPreferences.signedOut')}
        </AppText>
      ) : null}

      {profile ? (
        <>
          <LiveRow
            label={t('discover.alert.preferences.radius')}
            onPress={onOpenPreferences}
            value={formatRadius(profile.alertRadiusKm, locale)}
          />
          <LiveRow
            label={t('discover.alert.preferences.quiet')}
            value={t('discover.alert.preferences.quietUnset')}
          />
          <LiveRow
            label={t('discover.alert.preferences.species')}
            onPress={onOpenPreferences}
            value={speciesValue}
          />
          <AppText testID="alert-preferences-live" tone="muted" variant="metadata">
            {t('discover.alert.preferences.live')}
          </AppText>
        </>
      ) : null}
    </Card>
  );
}

/**
 * One of the card's settings: the frame's label and its accent value, and — when there is somewhere
 * to change it — the frame's chevron and a press. Without a destination it is the reading it is.
 */
function LiveRow({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress?: () => void;
  value: string;
}) {
  const { colors } = useAppTheme();

  const content = (
    <>
      <AppText className="flex-1" variant="cardTitle">
        {label}
      </AppText>
      <AppText tone="accent" variant="rowValue">
        {value}
      </AppText>
      {onPress ? <Feather color={colors.textMuted} name="chevron-right" size={18} /> : null}
    </>
  );

  if (!onPress) {
    return <View className="w-full flex-row items-center gap-gap py-setting">{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      className="w-full flex-row items-center gap-gap py-setting"
      onPress={onPress}
      style={{ minHeight: layout.minTouchTarget }}
    >
      {content}
    </Pressable>
  );
}
