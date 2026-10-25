import { Feather } from '@/components/atoms/app-icon';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import type { Species } from '../domain/species';
import { SCORE_MAX } from '../domain/zone-details';
import type { Zone } from '../domain/zone-source';
import { SPECIES_LABEL_KEY } from './species-copy';
import { CONFIDENCE_LABEL_KEY, RIPENESS_LABEL_KEY } from './zone-source-copy';

export type ZoneCardProps = {
  /** The zone the screen is about: the first one the two controls left. */
  zone: Zone;
  /** The berry whose score the card is reading, i.e. the one the chips asked the source for. */
  species: Species;
  /**
   * Opens the zone's own screen — frame 07, which reads this same source — or nothing.
   *
   * The frame draws the card with a chevron, and it is a control only when the caller supplies
   * the destination: a card that claimed a role without anywhere to go would be an affordance
   * that does nothing (AGENTS.md §11.2).
   */
  onOpen?: () => void;
};

/**
 * Frame 06's zone card (node 5:22996), reading the **same zone the map draws**.
 *
 * It says what the source can be true about: the zone's own name, the score for the berry the
 * chips selected, the confidence behind it, and how far the season has got. Two things the
 * frame draws are gone with the demo, and each is recorded rather than faked:
 *
 * - **the walking distance** — no routing service is wired, and a distance invented here is
 *   the kind of claim this repository keeps off surfaces a picker reads as true;
 * - **the report age** (“updated 38 min ago”) — the zone payload carries no report stream, only
 *   the score's own timestamp, which is not what that sentence says.
 *
 * The caption says where the numbers come from (“Pilot area · test data”), the same disclosure
 * the map carries two lines above it.
 *
 * **The link to screen 07 is back** (2026-10-24): that screen now reads this same port, so the
 * card hands it the zone and the berry whose score it is showing instead of opening another
 * zone's figures.
 */
export function ZoneCard({ onOpen, species, zone }: ZoneCardProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const card = (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="zone-card">
      <View className="w-full flex-row items-center gap-gap">
        <View className="flex-1 gap-tight">
          <AppText variant="cardHeading">
            {interpolate(t('discover.card.zoneTitle'), {
              // Both values are the payload's own: the zone's name and the berry the chips chose,
              // said in the reader's language (the same substitution the chips and rows make).
              species: t(SPECIES_LABEL_KEY[species]),
              zone: zone.name,
            })}
          </AppText>
          <AppText tone="muted" variant="caption">
            {t('discover.card.source')}
          </AppText>
        </View>
        {onOpen ? (
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
            {interpolate(t('discover.list.yield'), {
              max: String(SCORE_MAX),
              score: String(zone.score),
            })}
          </AppText>
        </View>
        <View
          className="h-chip flex-row items-center rounded-pill px-gap"
          style={{ backgroundColor: colors.successMuted }}
        >
          <AppText style={{ color: colors.success, fontWeight: '600' }} variant="label">
            {t(CONFIDENCE_LABEL_KEY[zone.confidence])}
          </AppText>
        </View>
      </View>

      <AppText tone="muted" variant="metadata">
        {t(RIPENESS_LABEL_KEY[zone.ripeness])}
      </AppText>
    </Card>
  );

  if (!onOpen) return card;

  return (
    <Pressable
      // The card says where it goes rather than reading out every value on it, which is what a
      // screen reader would otherwise announce as one button (frame 06's card opens frame 07).
      accessibilityLabel={interpolate(t('discover.card.open'), { zone: zone.name })}
      accessibilityRole="button"
      onPress={onOpen}
      // The card is far taller than the 44 px minimum; the floor is here so a short card can
      // never shrink below what a finger can hit.
      style={{ minHeight: layout.minTouchTarget }}
    >
      {card}
    </Pressable>
  );
}
