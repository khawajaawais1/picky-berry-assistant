import { Feather } from '@/components/atoms/app-icon';
import { useDeferredValue, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, interpolate, useTranslation } from '@/services/i18n';

import type { Species } from '../domain/species';
import { filterZones, isFilterActive, type ZoneFilter } from '../domain/zone-filter';
import { PILOT_ZONE_SPECIES, type Zone, type ZoneSource } from '../domain/zone-source';
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
   * Opens frame 07 for the card's zone, under the berry whose score the card is reading — or
   * nothing.
   *
   * The screen hands over the zone it drew and the score layer the chips chose, so the screen
   * that opens reads the same record rather than another zone's figures. Without a destination
   * the card stays a reading and claims no role.
   */
  onOpenZone?: (zone: Zone, species: Species) => void;
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
 * The card opens screen 07 again (2026-10-24): that screen now asks the same port for the same
 * zone and berry, so the press lands on the figures the card was showing. The list rows stay
 * readings — the card is the frame's own element with a chevron, and a row that opened a zone
 * would need the same treatment on another day.
 *
 * The frame draws no freshness line; the app adds one below the map whenever the answer carries
 * timestamps (the plan's “last updated” label, §2.4). It prints the **oldest** score timestamp
 * on the answer, never the read's own time, so a restored cache shows the age of what it holds
 * and a zone without a timestamp drops the line rather than letting the others speak for it.
 *
 * The OS status bar and home indicator the frame draws belong to the device.
 */
export function DiscoverScreen({
  onBack,
  onOpenDownloads,
  onOpenZone,
  zoneSource = testZoneSource,
}: DiscoverScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<readonly Species[]>([]);
  const [view, setView] = useState<ZoneView>('map');

  // The chips choose the **score layer**, one berry at a time: the frame draws one chip lit,
  // and a score belongs to one species. Selecting another chip replaces the choice; pressing
  // the lit one clears it, which falls back to the pilot's berry rather than to “all berries”
  // — a single zone carries one score per berry, not one for a set of them.
  const scoreSpecies = species[0] ?? PILOT_ZONE_SPECIES;
  const { retry, status, updatedAt, zones } = useZones(zoneSource, scoreSpecies);

  // The field's own value is the picker's, immediately: a controlled input that lags is a
  // broken input. The **filter** is allowed to follow on a lower-priority render, because it
  // is what redraws the map or the list — fifty polygons or fifty rows on every keystroke is
  // work the typing should not wait for (React's concurrent renderer drops intermediate passes
  // when the next key arrives). The count line follows the same answer, so it always describes
  // the drawing below it rather than a search the screen has not applied yet.
  const deferredQuery = useDeferredValue(query);
  const filter = useMemo<ZoneFilter>(() => ({ query: deferredQuery }), [deferredQuery]);
  const matches = useMemo(() => filterZones(zones, filter), [filter, zones]);
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
          <StatusMessage testID="discover-filter-status" tone="muted" variant="bodySmall">
            {matches.length === 0
              ? t('discover.filter.none')
              : interpolate(
                  matches.length === 1
                    ? t('discover.filter.matchOne')
                    : t('discover.filter.matches'),
                  { count: String(matches.length) },
                )}
          </StatusMessage>
        ) : null}

        {view === 'map' ? (
          <>
            <View className="w-full gap-tight">
              <ZoneMap onRetry={retry} status={status} zones={matches} />
              {updatedAt && matches.length > 0 ? (
                <AppText testID="discover-updated" tone="muted" variant="metadata">
                  {interpolate(t('discover.map.updated'), {
                    date: formatLongDate(updatedAt, locale),
                  })}
                </AppText>
              ) : null}
            </View>
            <ZoneScoreLegend />
            {cardZone ? (
              <ZoneCard
                onOpen={onOpenZone ? () => onOpenZone(cardZone, scoreSpecies) : undefined}
                species={scoreSpecies}
                zone={cardZone}
              />
            ) : null}
          </>
        ) : (
          <>
            {listStatus ? (
              <StatusMessage testID="zone-list-status" tone="muted" variant="bodySmall">
                {listStatus}
              </StatusMessage>
            ) : null}
            {status === 'error' ? (
              <TextAction
                label={t('discover.map.retry')}
                onPress={retry}
                testID="zone-list-retry"
              />
            ) : null}
            <ZoneList species={scoreSpecies} zones={matches} />
          </>
        )}

        <MapListToggle onChange={setView} onOpenDownloads={onOpenDownloads} view={view} />
      </View>
    </Screen>
  );
}
