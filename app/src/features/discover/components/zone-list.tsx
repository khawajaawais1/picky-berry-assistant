import { View } from 'react-native';

import { useTranslation } from '@/services/i18n';

import type { Species } from '../domain/species';
import type { Zone } from '../domain/zone-source';
import { ZoneSourceRow } from './zone-source-row';

export type ZoneListProps = {
  /** The zones to list, already narrowed by the screen's search: this component filters nothing. */
  zones: readonly Zone[];
  /** The berry whose score each row prints. */
  species: Species;
};

/**
 * The list frame 06's toggle switches to (node `5:23010`, “Show zone list”): one row per zone
 * the search kept, each naming the zone, its score for the chosen berry and how far the season
 * has got.
 *
 * It is a *view of the same zones the map draws* — the same `ZoneSource` answer, narrowed by
 * the same query — not a second dataset. The rows carry the score bands' own colours, which is
 * what makes the list readable to someone who has just read the map's legend.
 *
 * Nothing here is a control: no source zone has a detail screen yet, so a row that claimed a
 * destination would promise one the app does not have.
 */
export function ZoneList({ species, zones }: ZoneListProps) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityLabel={t('discover.list.label')}
      className="w-full gap-gap"
      testID="zone-list"
    >
      {zones.map((zone) => (
        <ZoneSourceRow
          key={zone.id}
          rowTestID={`zone-list-row-${zone.id}`}
          species={species}
          zone={zone}
        />
      ))}
    </View>
  );
}
