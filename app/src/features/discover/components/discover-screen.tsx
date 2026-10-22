import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import type { Species } from '../domain/species';
import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import { filterZones, isFilterActive } from '../domain/zone-filter';
import { MapListToggle, type ZoneView } from './map-list-toggle';
import { SpeciesChips } from './species-chips';
import { ZoneCard } from './zone-card';
import { ZoneList } from './zone-list';
import { ZoneMap } from './zone-map';
import { ZoneSearchField } from './zone-search-field';
import { ZoneStateLegend } from './zone-state-legend';

export type DiscoverScreenProps = {
  onBack?: () => void;
  /**
   * Opens the zone screen the frame's card leads to (frame 07). Left out when the route has
   * nowhere to send it, and the card then draws no chevron and claims no role.
   */
  onOpenZone?: () => void;
  /**
   * Opens the offline centre (frame 13), which the frame draws its download glyph for. Left
   * out when the route has nowhere to send it.
   */
  onOpenDownloads?: () => void;
};

/**
 * Screen 06 · Core picker · Discover map (Figma node 5:22942).
 *
 * The app's first core-picker screen: the design's search field and species chips, its own map
 * of nearby zones filtered by the two of them, the legend that names their states, the card for
 * the zone the frame is about, and the frame's row for switching to a list of the same zones or
 * straight through to what is downloaded.
 *
 * The map is drawn by the app from the frame's geometry (ADR-021) rather than by a map
 * provider, and the two controls above it are real filters rather than decoration: the frame
 * asks for a place or a zone and for a species, and `filterZones` answers exactly those two
 * questions. What is left of the result is visible three ways — the map draws only the matching
 * zones, the list holds only them, and a line under the controls says how many are left (or
 * that none is, which is a state the frame does not draw and the picker still needs).
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
 * The OS status bar and home indicator the frame draws belong to the device.
 */
export function DiscoverScreen({ onBack, onOpenDownloads, onOpenZone }: DiscoverScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<readonly Species[]>([]);
  const [view, setView] = useState<ZoneView>('map');

  const filter = { query, species };
  const matches = filterZones(DEMO_ZONES, filter);

  const toggleSpecies = (candidate: Species) =>
    setSpecies((chosen) =>
      chosen.includes(candidate)
        ? chosen.filter((entry) => entry !== candidate)
        : [...chosen, candidate],
    );

  // The frame's card is about one zone — the unpicked one its map badges with a score — so it
  // is drawn while that zone is still in the result and steps aside when the filter takes it
  // away. A card describing a zone the map no longer draws would be a screenshot of a search
  // the picker has already changed.
  const cardZoneIsDrawn = matches.some((zone) => zone.state === CARD_ZONE_STATE);
  // Only the zone the app has a detail screen for is a way in; the list decides that itself
  // (`zoneDetailsFor`), and this is the route's half of it.
  const openZone = onOpenZone ? () => onOpenZone() : undefined;

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
        {isFilterActive(filter) ? (
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
            <ZoneMap zones={matches} />
            <ZoneStateLegend />
            {cardZoneIsDrawn ? <ZoneCard onPress={onOpenZone} /> : null}
          </>
        ) : (
          <ZoneList onOpenZone={openZone} zones={matches} />
        )}

        <MapListToggle onChange={setView} onOpenDownloads={onOpenDownloads} view={view} />
      </View>
    </Screen>
  );
}
