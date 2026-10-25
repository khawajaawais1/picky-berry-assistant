import { Feather } from '@/components/atoms/app-icon';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, Chip } from '@/components/molecules';
import { layout, spacing } from '@/constants/theme';
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
  /**
   * Where the row leads — frame 07's details page, for the saved plan — or nothing. A row with
   * no destination stays the reading the map's own list draws (AGENTS.md §11.2).
   */
  onOpen?: () => void;
};

/**
 * One source zone as a list row: the zone's name, its score for the berry the chips chose,
 * and how far the season has got.
 *
 * It is the map's own list (`ZoneList`) for the pilot's zones and, since ADR-060, the saved
 * plan's row too. It is **not** `ZoneRow`: that row still draws the design's sample zones,
 * whose picking state no source returns. What the two share is the card's metrics and the
 * legend's colours — the ripeness chip is outlined in its score band's line token, which is
 * what makes the row readable to someone who has just read the map.
 *
 * A row is a reading unless its caller gives it a destination: the map's list still passes none,
 * because a row there is one of fifty and the card is the map's own way into a zone. The saved
 * plan passes one for every zone it can resolve, which is what puts the picker's saved places
 * back one press from their details (ADR-060).
 *
 * It is memoised because the search redraws the list on every keystroke: a row whose zone,
 * berry and destination are unchanged has nothing new to draw. The map's list passes no
 * destination, so all of its rows keep the default shallow comparison; a caller that passes a
 * fresh closure per row (the saved plan does) still re-renders those rows, which is correct
 * because their destination may have changed.
 */
export const ZoneSourceRow = memo(function ZoneSourceRow({
  onOpen,
  rowTestID,
  species,
  zone,
}: ZoneSourceRowProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const band = scoreBand(zone.score);
  const bandColour = colors[band.line];
  const openable = onOpen !== undefined;

  const row = (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID={rowTestID}>
      <View className="w-full flex-row items-center gap-gap">
        <AppText style={{ flexShrink: 1 }} variant="cardHeading">
          {interpolate(t('discover.card.zoneTitle'), {
            species: t(SPECIES_LABEL_KEY[species]),
            zone: zone.name,
          })}
        </AppText>
        {openable ? (
          <Feather
            color={colors.textMuted}
            name="chevron-right"
            size={20}
            testID={`${rowTestID}-chevron`}
          />
        ) : null}
      </View>

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

  if (!openable) return row;

  return (
    <Pressable
      accessibilityLabel={interpolate(t('discover.card.open'), { zone: zone.name })}
      accessibilityRole="button"
      onPress={onOpen}
      style={{ minHeight: layout.minTouchTarget }}
    >
      {row}
    </Pressable>
  );
});
