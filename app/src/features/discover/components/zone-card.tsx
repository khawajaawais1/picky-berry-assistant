import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import { SPECIES_LABEL_KEY } from './species-copy';

export type ZoneCardProps = {
  /**
   * Where the card leads — screen 07's zone details — or nothing.
   *
   * The card is a control only when the caller supplies this, and that is the point: the
   * design draws a chevron on it, and a chevron on a card that does nothing promises a
   * destination the app does not have (AGENTS.md §11.2). `src/app/discover.tsx` supplies the
   * navigation, which keeps the router out of the feature.
   */
  onPress?: () => void;
};

/**
 * Frame 06's zone card (node 5:22996): the zone its map is about — “Zone 14 · Lingonberry”,
 * where it is, how far the walk is, its reported yield with the confidence behind it, and a
 * status line naming its state.
 *
 * It is the frame's demo composition, and it says so through the screen's eyebrow
 * (“SEASON DEMO”). The frame draws the card's chevron because the card opens screen 07; with
 * `onPress` the chevron is drawn and the card acts, and without it neither is.
 *
 * The two pills are data, not controls — the frame draws them as chips — so they are
 * painted with the chips' metrics without claiming a role.
 */
export function ZoneCard({ onPress }: ZoneCardProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

  if (!zone) return null;

  const species = zone.species[0];

  const card = (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="zone-card">
      <View className="w-full flex-row items-center gap-gap">
        <View className="flex-1 gap-tight">
          <AppText variant="cardHeading">
            {interpolate(t('discover.card.title'), {
              // The species is the zone's own data, said in the language the reader is in —
              // the same substitution the filter chips and the zone list make.
              species: species ? t(SPECIES_LABEL_KEY[species]) : '',
              zone: zone.number,
            })}
          </AppText>
          <AppText tone="muted" variant="caption">
            {t('discover.card.place')}
          </AppText>
        </View>
        {onPress ? (
          <Feather
            color={colors.textMuted}
            name="chevron-right"
            size={20}
            testID="zone-card-chevron"
          />
        ) : null}
      </View>

      <View className="w-full flex-row flex-wrap gap-gap">
        <View
          className="h-chip flex-row items-center rounded-pill px-gap"
          style={{ backgroundColor: colors.accent }}
        >
          <AppText style={{ color: colors.onAccent, fontWeight: '600' }} variant="label">
            {t('discover.card.yield')}
          </AppText>
        </View>
        <View
          className="h-chip flex-row items-center rounded-pill px-gap"
          style={{ backgroundColor: colors.successMuted }}
        >
          <AppText style={{ color: colors.success, fontWeight: '600' }} variant="label">
            {t('discover.card.confidence')}
          </AppText>
        </View>
      </View>

      <AppText tone="muted" variant="metadata">
        {t('discover.card.status')}
      </AppText>
    </Card>
  );

  if (!onPress) return card;

  return (
    <Pressable
      accessibilityLabel={interpolate(t('discover.card.open'), { zone: zone.number })}
      accessibilityRole="button"
      // The design draws no separate hit area: the card is the control, and it is far taller
      // than the 44 px minimum (layout.minTouchTarget).
      onPress={onPress}
      style={{ minHeight: layout.minTouchTarget }}
      testID="zone-card-action"
    >
      {card}
    </Pressable>
  );
}
