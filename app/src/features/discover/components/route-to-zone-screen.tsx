import { Feather } from '@/components/atoms/app-icon';
import { Linking, StyleSheet, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Card, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNow } from '@/hooks/use-now';
import { interpolate, useTranslation, type TranslationKey } from '@/services/i18n';

import {
  compassPoint,
  formatDistance,
  walkingDirectionsUrl,
  walkingMinutes,
  WALKING_KMH,
  type CompassPoint,
} from '../domain/route';
import type { Species } from '../domain/species';
import { PILOT_ZONE_SPECIES, type ZoneSource } from '../domain/zone-source';
import { useZoneDistance } from '../hooks/use-zone-distance';
import { useZones } from '../hooks/use-zones';
import { ZoneMap } from './zone-map';

const COMPASS_KEY: Record<CompassPoint, TranslationKey> = {
  n: 'discover.route.compass.n',
  ne: 'discover.route.compass.ne',
  e: 'discover.route.compass.e',
  se: 'discover.route.compass.se',
  s: 'discover.route.compass.s',
  sw: 'discover.route.compass.sw',
  w: 'discover.route.compass.w',
  nw: 'discover.route.compass.nw',
};

export type RouteToZoneScreenProps = {
  zoneSource: ZoneSource;
  /** The zone to walk to, as the zone screen handed it over. */
  zoneId?: string;
  species?: Species;
  onBack?: () => void;
  onCancel?: () => void;
  onStart?: () => void;
  /** Opens a URL in the platform; defaults to React Native's `Linking`. */
  openUrl?: (url: string) => Promise<unknown>;
};

/**
 * Screen 08 · Core picker · Route to zone (Figma node `5:23106`).
 *
 * The zone is the one the picker opened, read from the zone service; the distance, heading and
 * walking estimate are measured from the phone's own position to the zone's middle. Turn-by-turn
 * directions come from the platform's maps app ("Directions in Maps"), because the app has no
 * routing service of its own. Without a position fix the screen says so instead of guessing.
 */
export function RouteToZoneScreen({
  zoneSource,
  zoneId,
  species = PILOT_ZONE_SPECIES,
  onBack,
  onCancel,
  onStart,
  openUrl = (url) => Linking.openURL(url),
}: RouteToZoneScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const now = useNow();
  const { status, zones } = useZones(zoneSource, species);
  const zone = zones.find((candidate) => candidate.id === zoneId);
  const distance = useZoneDistance(zone);

  if (!zone || !distance) {
    return (
      <Screen
        edges={['top']}
        eyebrow={t('discover.route.eyebrow')}
        onBack={onBack}
        title={t('discover.details.pendingTitle')}
      >
        <StatusMessage testID="route-status" tone="muted" variant="bodySmall">
          {status === 'loading'
            ? t('discover.map.loading')
            : status === 'error'
              ? t('discover.map.unavailable')
              : t('discover.details.unknown')}
        </StatusMessage>
        <TextAction label={t('discover.route.cancel')} onPress={onCancel} />
      </Screen>
    );
  }

  const minutes = distance.meters === null ? null : walkingMinutes(distance.meters);
  const arrival =
    minutes === null
      ? null
      : new Date(now.getTime() + minutes * 60_000).toLocaleTimeString(
          locale === 'fi' ? 'fi-FI' : 'en-GB',
          { hour: '2-digit', minute: '2-digit' },
        );

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.route.eyebrow')}
      onBack={onBack}
      title={interpolate(t('discover.route.title'), { zone: zone.name })}
    >
      <View className="w-full gap-section">
        <ZoneMap demo={false} height={layout.routeMapHeight} status="ready" zones={[zone]} />

        <Card style={styles.card} testID="route-card">
          {distance.meters === null || minutes === null || distance.bearing === null ? (
            <StatusMessage testID="route-no-position" tone="muted" variant="bodySmall">
              {t('discover.route.noPosition')}
            </StatusMessage>
          ) : (
            <>
              <View className="w-full flex-row gap-gap">
                <View className="flex-1 gap-xs">
                  <AppText style={{ color: colors.accent }} testID="route-distance" variant="stat">
                    {formatDistance(distance.meters, locale)}
                  </AppText>
                  <AppText tone="muted" variant="metadata">
                    {t('discover.route.distance')}
                  </AppText>
                </View>
                <View className="flex-1 gap-xs">
                  <AppText style={{ color: colors.accent }} variant="stat">
                    {interpolate(t('discover.route.duration'), { minutes: String(minutes) })}
                  </AppText>
                  <AppText tone="muted" variant="metadata">
                    {interpolate(t('discover.route.arrival'), {
                      pace: String(WALKING_KMH),
                      time: arrival ?? '',
                    })}
                  </AppText>
                </View>
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
                testID="route-card-divider"
              />

              <View className="w-full flex-row items-center gap-gap">
                <Feather color={colors.accent} name="compass" size={30} />
                <View className="flex-1 gap-tight">
                  <AppText variant="rowTitle">{t('discover.route.guidance.title')}</AppText>
                  <AppText testID="route-heading" tone="muted" variant="caption">
                    {interpolate(t('discover.route.guidance.detail'), {
                      direction: t(COMPASS_KEY[compassPoint(distance.bearing)]),
                      distance: formatDistance(distance.meters, locale),
                    })}
                  </AppText>
                </View>
              </View>
            </>
          )}
        </Card>

        <AppText tone="muted" variant="bodySmall">
          {t('discover.route.supporting')}
        </AppText>

        <AppButton
          icon={<Feather color={colors.onAccent} name="map" size={20} />}
          label={t('discover.route.directions')}
          onPress={() => {
            void openUrl(walkingDirectionsUrl(distance.centre)).catch(() => undefined);
          }}
          testID="route-directions"
        />

        {onStart ? (
          <AppButton
            icon={<Feather color={colors.onAccent} name="navigation" size={20} />}
            label={t('discover.route.start')}
            onPress={onStart}
            testID="route-start"
          />
        ) : null}

        <TextAction label={t('discover.route.cancel')} onPress={onCancel} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.cardGap, padding: spacing.section },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
  },
});
