import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, Card, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation, type TranslationKey } from '@/services/i18n';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import { DEMO_ROUTE, formatDistance, type TurnDirection } from '../domain/route';
import { ZoneMap } from './zone-map';

const TURN_KEY: Record<TurnDirection, TranslationKey> = {
  left: 'discover.route.turn.left',
  right: 'discover.route.turn.right',
};

export type RouteToZoneScreenProps = {
  onBack?: () => void;
  /**
   * Abandons the route. The route supplies it — back to the zone screen — because the feature
   * imports no router, and it is always supplied: the frame's own way out of this screen.
   */
  onCancel?: () => void;
  /**
   * Opens the visit the walk leads to (screen 09). The frame's own primary action; it is drawn
   * only when the route can take it there, which is why it arrived after screen 09 did.
   */
  onStart?: () => void;
};

/**
 * Screen 08 · Core picker · Route to zone (Figma node `5:23106`).
 *
 * The walk between the picker and the zone: the same map frame 06 draws, stretched to 322 px
 * and carrying the frame's own route, the note about what is on the device, the distance and
 * arrival card, and the next turn on the trail.
 *
 * Both of the frame's actions are real: **“Start walking”** opens the visit (screen 09) and
 * **“Cancel route”** abandons it. Neither is drawn without somewhere to go — the primary action
 * arrived only when screen 09 did, because a primary button that does nothing is the one thing
 * this repository does not ship (AGENTS.md §11.2, and the same reason frame 06's card had no
 * chevron until screen 07 did).
 *
 * Everything the card prints is the design's own sample — there is no routing service, no
 * position source and no map tile cache, so the route, its 22 minutes and its turn are
 * `DEMO_ROUTE`, and the eyebrow names the demo the way frame 06's map does.
 *
 * The frame's note (“Map ready offline — …tiles and zone boundaries are cached”) promises a
 * download this app never performs. It is drawn as what the app can be true about instead: the
 * boundaries are drawn from data on the device, and the tile cache it does not have is named as
 * missing. Its glyph is informational rather than a download for the same reason.
 */
export function RouteToZoneScreen({ onBack, onCancel, onStart }: RouteToZoneScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);
  const route = DEMO_ROUTE;

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.route.eyebrow')}
      onBack={onBack}
      title={interpolate(t('discover.route.title'), { zone: zone?.number ?? '' })}
    >
      <View className="w-full gap-section">
        <Callout
          icon={<Feather color={colors.success} name="info" size={20} />}
          testID="route-offline-note"
          title={t('discover.route.offline.title')}
          tone="success"
        >
          {interpolate(t('discover.route.offline.body'), { place: t('discover.map.place') })}
        </Callout>

        <ZoneMap height={layout.routeMapHeight} route />

        <Card style={styles.card} testID="route-card">
          <View className="w-full flex-row gap-gap">
            <View className="flex-1 gap-xs">
              <AppText style={{ color: colors.accent }} testID="route-distance" variant="stat">
                {formatDistance(route.distanceMeters, locale)}
              </AppText>
              <AppText tone="muted" variant="metadata">
                {t('discover.route.distance')}
              </AppText>
            </View>
            <View className="flex-1 gap-xs">
              <AppText style={{ color: colors.accent }} variant="stat">
                {interpolate(t('discover.route.duration'), { minutes: String(route.minutes) })}
              </AppText>
              <AppText tone="muted" variant="metadata">
                {interpolate(t('discover.route.arrival'), { time: route.arrivalTime })}
              </AppText>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
            testID="route-card-divider"
          />

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="corner-up-right" size={30} />
            <View className="flex-1 gap-tight">
              <AppText variant="rowTitle">{t('discover.route.guidance.title')}</AppText>
              <AppText tone="muted" variant="caption">
                {interpolate(t('discover.route.guidance.detail'), {
                  direction: t(TURN_KEY[route.nextTurn.direction]),
                  distance: formatDistance(route.nextTurn.meters, locale),
                  place: t('discover.map.place'),
                })}
              </AppText>
            </View>
          </View>
        </Card>

        <AppText tone="muted" variant="bodySmall">
          {t('discover.route.supporting')}
        </AppText>

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
