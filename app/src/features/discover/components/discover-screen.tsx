import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import type { Species } from '../domain/species';
import { filterZones, isFilterActive, type ZoneFilter } from '../domain/zone-filter';
import { PILOT_ZONE_SPECIES, type ZoneSource } from '../domain/zone-source';
import { useZones } from '../hooks/use-zones';
import { testZoneSource } from '../services/test-zone-source';
import { MapListToggle, type ZoneView } from './map-list-toggle';
import { SpeciesChips } from './species-chips';
import { ZoneCard } from './zone-card';
import { ZoneList } from './zone-list';
import { ZoneMap } from './zone-map';
import { ZoneScoreLegend } from './zone-score-legend';
import { ZoneSearchField } from './zone-search-field';

export type DiscoverScreenProps = {
  onBack?: () => void;
  /**
   * Opens the offline centre (frame 13), which the frame draws its download glyph for. Left
   * out when the route has nowhere to send it.
   */
  onOpenDownloads?: () => void;
  /**
   * Where the screen's zones come from. Defaults to the bundled pilot stub; a test, or a
   * future composition root that has a real service, supplies its own through the port.
   */
  zoneSource?: ZoneSource;
};

/**
 * Screen 06 · Core picker · Discover map (Figma node 5:22942).
 *
 * The app's first core-picker screen: the design's search field and species chips, the map of
 * nearby zones the two controls narrow, the legend that names what its colours mean, a card
 * for the first zone left, and the frame's row for switching to a list of the same zones or
 * straight through to what is downloaded.
 *
 * **One dataset.** The screen asks the `ZoneSource` **once** and hands that answer to the map,
 * the card and the list (ADR-053; this closes the gap known issue 14 recorded while the card
 * and filters still read `DEMO_ZONES`). What the two controls do is narrow that one answer:
 *
 * - the **search field** filters the zones by name (`filterZones`);
 * - the **species chips** ask the source for that berry's score, one chip at a time, which is
 *   why pressing a chip changes the numbers and the map's colours rather than the zone count.
 *
 * The map is real geography: MapLibre on the device, the same rings projected into an SVG on
 * the web export. It shows the data team's 50 stub zones around Laajavuori and says so (“test
 * data”), as does the card's caption.
 *
 * Three things the frame draws and this screen deliberately does not, all recorded in
 * PROJECT.md:
 *
 * - its **recentre control** — the map does not pan or follow the device, so there is nothing
 *   to recentre (the frame's own position marker is part of the composition and says so);
 * - its **sliders glyph** inside the field — a filter sheet this app does not have, where the
 *   species chips sit directly below the field and are the filter;
 * - the **core navigation** — that is the app shell's, mounted over this screen (ADR-022).
 *
 * The card no longer opens screen 07: that screen still describes the design's demo zone, so
 * opening it from a source zone would show another zone's numbers. It is a reading until zone
 * details read the same source.
 *
 * The OS status bar and home indicator the frame draws belong to the device.
 */
export function DiscoverScreen({
  onBack,
  onOpenDownloads,
  zoneSource = testZoneSource,
}: DiscoverScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<readonly Species[]>([]);
  const [view, setView] = useState<ZoneView>('map');

  // The chips choose the **score layer**, one berry at a time: the frame draws one chip lit,
  // and a score belongs to one species. Selecting another chip replaces the choice; pressing
  // the lit one clears it, which falls back to the pilot's berry rather than to “all berries”
  // — a single zone carries one score per berry, not one for a set of them.
  const scoreSpecies = species[0] ?? PILOT_ZONE_SPECIES;
  const { status, zones } = useZones(zoneSource, scoreSpecies);

  const filter: ZoneFilter = { query };
  const matches = filterZones(zones, filter);
  const filtering = isFilterActive(filter);
  const cardZone = matches[0];

  const toggleSpecies = (candidate: Species) =>
    setSpecies((chosen) => (chosen.includes(candidate) ? [] : [candidate]));

  // The list view has no map above it to say why it is empty, so it says so itself: loading
  // and failed are not an empty world, and an unfiltered empty answer is not a failed search.
  // A filtered search with no match is already stated by the count line above, which is why
  // this is null then rather than a second sentence saying the same thing.
  const listStatus =
    status === 'loading'
      ? t('discover.map.loading')
      : status === 'error'
        ? t('discover.map.unavailable')
        : matches.length === 0 && !filtering
          ? t('discover.map.empty')
          : null;

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.eyebrow')}
      headerAccessory={<Feather color={colors.success} name="feather" size={22} />}
      onBack={onBack}
      title={t('discover.title')}
    >
      <View className="w-full gap-section">
        <View className="w-full gap-gap">
          <ZoneSearchField onChangeText={setQuery} value={query} />
          <SpeciesChips onToggle={toggleSpecies} selected={species} />
        </View>

        {/* The frame draws no such line, because it draws no filter either. With one in use the
            picker has to be told what it did — and the empty answer is the case that must never
            be shown as “nothing happened”. */}
        {filtering ? (
          <AppText testID="discover-filter-status" tone="muted" variant="bodySmall">
            {matches.length === 0
              ? t('discover.filter.none')
              : interpolate(
                  matches.length === 1
                    ? t('discover.filter.matchOne')
                    : t('discover.filter.matches'),
                  { count: String(matches.length) },
                )}
          </AppText>
        ) : null}

        {view === 'map' ? (
          <>
            <ZoneMap status={status} zones={matches} />
            <ZoneScoreLegend />
            {cardZone ? <ZoneCard species={scoreSpecies} zone={cardZone} /> : null}
          </>
        ) : (
          <>
            {listStatus ? (
              <AppText testID="zone-list-status" tone="muted" variant="bodySmall">
                {listStatus}
              </AppText>
            ) : null}
            <ZoneList species={scoreSpecies} zones={matches} />
          </>
        )}

        <MapListToggle onChange={setView} onOpenDownloads={onOpenDownloads} view={view} />
      </View>
    </Screen>
  );
}
