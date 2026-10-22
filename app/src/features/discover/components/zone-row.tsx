import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card, Chip } from '@/components/molecules';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import { ZONE_APPEARANCE, type DemoZone } from '../domain/zone';
import { SCORE_MAX, zoneDetailsFor } from '../domain/zone-details';
import { SPECIES_LABEL_KEY } from './species-copy';
import { ZONE_STATE_LABEL_KEY } from './zone-state-copy';

export type ZoneRowProps = {
  zone: DemoZone;
  /**
   * Where the row leads — frame 07's zone details — or nothing.
   *
   * Even with somewhere to go, a row is a control only for a zone the app has a detail screen
   * for (`zoneDetailsFor`): the design's other zones have no numbers behind them, and a row
   * that opened the wrong zone's score would be worse than a row that opens nothing
   * (AGENTS.md §11.2, the rule `zoneDetailsFor` itself follows).
   */
  onOpen?: () => void;
  /** The row's own handle, so each caller's tests can name the list they are looking at. */
  rowTestID: string;
};

/**
 * One zone as a list row: the zone's own words, the state the map's legend colours it by, and —
 * for a zone someone has reported on — its yield.
 *
 * It was frame 06's list row (`ZoneList`) until the plan behind frame 14's “Saved spots” row
 * needed the same row: the two show the same zones and open the same screen, so the drawing is
 * one component and each caller passes its own `rowTestID` (AGENTS.md §2.5).
 *
 * The state chip is painted inline rather than with the shared `Chip`, because its colour is
 * **data**: it is the legend's own line colour for that state (`ZONE_APPEARANCE[state].line`),
 * which is what makes the list readable to someone who has just read the map. The shared chip's
 * tones are the design's fixed ones.
 */
export function ZoneRow({ onOpen, rowTestID, zone }: ZoneRowProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const species = zone.species[0];
  const stateColour = colors[ZONE_APPEARANCE[zone.state].line];
  const openable = onOpen !== undefined && zoneDetailsFor(zone.id) !== undefined;

  const row = (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID={rowTestID}>
      <View className="w-full flex-row items-center gap-gap">
        <AppText style={{ flex: 1 }} variant="cardHeading">
          {interpolate(t('discover.card.title'), {
            species: species ? t(SPECIES_LABEL_KEY[species]) : '',
            zone: zone.number,
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
            borderColor: stateColour,
            borderWidth: 1,
          }}
          testID={`${rowTestID}-state`}
        >
          <AppText style={{ color: stateColour, fontWeight: '600' }} variant="label">
            {t(ZONE_STATE_LABEL_KEY[zone.state])}
          </AppText>
        </View>

        {zone.score !== undefined ? (
          <Chip
            label={interpolate(t('discover.list.yield'), {
              max: String(SCORE_MAX),
              score: String(zone.score),
            })}
            testID={`${rowTestID}-yield`}
            tone="accent"
          />
        ) : null}
      </View>
    </Card>
  );

  if (!openable) return row;

  return (
    <Pressable
      accessibilityLabel={interpolate(t('discover.card.open'), { zone: zone.number })}
      accessibilityRole="button"
      onPress={onOpen}
      // The row is a card and far taller than the 44 px minimum; the floor is here so a short
      // row can never shrink below what a finger can hit.
      style={{ minHeight: layout.minTouchTarget }}
    >
      {row}
    </Pressable>
  );
}
