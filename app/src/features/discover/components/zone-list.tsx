import { View } from 'react-native';

import { useTranslation } from '@/services/i18n';

import type { DemoZone } from '../domain/zone';
import { ZoneRow } from './zone-row';

export type ZoneListProps = {
  /** The zones to list, already filtered by the screen: this component filters nothing. */
  zones: readonly DemoZone[];
  /** Where a row leads — frame 07's zone details — or nothing. */
  onOpenZone?: (zone: DemoZone) => void;
};

/**
 * The list frame 06's toggle switches to (node `5:23010`, “Show zone list”): one row per zone
 * the filter kept, each naming the zone, the species reported in it, the state the map's
 * legend colours it by and — for a zone someone has reported on — its yield.
 *
 * It is a *view of the same zones*, not a second screen: the rows carry the legend's own
 * words and the legend's own colours, which is what makes the list readable to someone who has
 * just read the map. The row itself is `ZoneRow`, which the picker's own saved plan draws too
 * (frame 14's “Saved spots”, ADR-030).
 *
 * The rows are drawn with the frame's card metrics — the surface, the 18 px radius, the
 * section inset — because they are the design's cards; the frame simply draws the same
 * information as a map.
 */
export function ZoneList({ zones, onOpenZone }: ZoneListProps) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityLabel={t('discover.list.label')}
      className="w-full gap-gap"
      testID="zone-list"
    >
      {zones.map((zone) => (
        <ZoneRow
          key={zone.id}
          onOpen={onOpenZone ? () => onOpenZone(zone) : undefined}
          rowTestID={`zone-list-row-${zone.id}`}
          zone={zone}
        />
      ))}
    </View>
  );
}
