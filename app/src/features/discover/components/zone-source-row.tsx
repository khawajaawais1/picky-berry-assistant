import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, Chip } from '@/components/molecules';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import type { Species } from '../domain/species';
import { SCORE_MAX } from '../domain/zone-details';
import { scoreBand } from '../domain/zone-score-band';
import type { Zone } from '../domain/zone-source';
import { SPECIES_LABEL_KEY } from './species-copy';
import { RIPENESS_LABEL_KEY } from './zone-source-copy';

export type ZoneSourceRowProps = {
  zone: Zone;
  /** The berry whose score this row prints, i.e. the one the chips asked the source for. */
  species: Species;
  /** The row's own handle, so each caller's tests can name the list they are looking at. */
  rowTestID: string;
};

/**
 * One source zone as a list row: the zone's name, its score for the berry the chips chose,
 * and how far the season has got.
 *
 * It is the map's own list (`ZoneList`) for the pilot's zones, and it is **not** `ZoneRow`:
 * that row still draws the design's sample zones for the saved plan (ADR-030), whose picking
 * state no source returns. What the two share is the card's metrics and the legend's colours
 * — the ripeness chip is outlined in its score band's line token, which is what makes the row
 * readable to someone who has just read the map.
 *
 * A row is a reading, not a control: no source zone has a detail screen yet (screen 07 still
 * describes the design's demo zone), and a row that opened another zone's numbers would be
 * worse than one that opens nothing (AGENTS.md §11.2).
 */
export function ZoneSourceRow({ rowTestID, species, zone }: ZoneSourceRowProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const band = scoreBand(zone.score);
  const bandColour = colors[band.line];

  return (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID={rowTestID}>
      <AppText variant="cardHeading">
        {interpolate(t('discover.card.zoneTitle'), {
          species: t(SPECIES_LABEL_KEY[species]),
          zone: zone.name,
        })}
      </AppText>

      <View className="w-full flex-row flex-wrap gap-gap">
        <View
          className="h-chip flex-row items-center rounded-pill px-gap"
          style={{
            backgroundColor: colors.surface,
            borderColor: bandColour,
            borderWidth: 1,
          }}
          testID={`${rowTestID}-ripeness`}
        >
          <AppText style={{ color: bandColour, fontWeight: '600' }} variant="label">
            {t(RIPENESS_LABEL_KEY[zone.ripeness])}
          </AppText>
        </View>

        <Chip
          label={interpolate(t('discover.list.yield'), {
            max: String(SCORE_MAX),
            score: String(zone.score),
          })}
          testID={`${rowTestID}-yield`}
          tone="accent"
        />
      </View>
    </Card>
  );
}
