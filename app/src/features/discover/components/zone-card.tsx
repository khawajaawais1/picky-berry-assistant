import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { spacing } from '@/constants/theme';
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
};

/**
 * Frame 06's zone card (node 5:22996), now reading the **same zone the map draws** rather than
 * the design's sample.
 *
 * It says what the source can be true about: the zone's own name, the score for the berry the
 * chips selected, the confidence behind it, and how far the season has got. Three things the
 * frame draws are gone with the demo, and each is recorded rather than faked:
 *
 * - **the walking distance** — no routing service is wired, and a distance invented here is
 *   the kind of claim this repository keeps off surfaces a picker reads as true;
 * - **the report age** (“updated 38 min ago”) — the zone payload carries no report stream, only
 *   the score's own timestamp, which is not what that sentence says;
 * - **the links to screen 07** — that screen describes the design's demo zone, so opening it
 *   from a source zone would show another zone's numbers. The card is a reading, not a control.
 *
 * The caption says where the numbers come from (“Pilot area · test data”), the same disclosure
 * the map carries two lines above it.
 */
export function ZoneCard({ species, zone }: ZoneCardProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="zone-card">
      <View className="w-full gap-tight">
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
}
