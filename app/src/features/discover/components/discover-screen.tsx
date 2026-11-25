import { Feather } from '@/components/atoms/app-icon';
import { useDeferredValue, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/atoms';
import { GlassSurface, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDevicePosition, type DevicePositionStatus } from '@/hooks/use-device-position';
import type { PositionSource } from '@/services/location';
import { formatLongDate, interpolate, useTranslation } from '@/services/i18n';

import { SPECIES, type Species } from '../domain/species';
import { filterZones, isFilterActive, type ZoneFilter } from '../domain/zone-filter';
import { mergeZoneAnswers } from '../domain/zone-layers';
import { PILOT_ZONE_SPECIES, type Zone, type ZoneSource } from '../domain/zone-source';
import { oldestUpdatedAt, useZoneAnswers } from '../hooks/use-zones';
import { MapListToggle, type ZoneView } from './map-list-toggle';
import { SpeciesChips } from './species-chips';
import { ZoneCard } from './zone-card';
import { ZoneList } from './zone-list';
import { ZoneMap, type ZoneMapProps } from './zone-map';
import { ZoneScoreLegend } from './zone-score-legend';
import { ZoneSearchField } from './zone-search-field';

export type DiscoverScreenProps = {
  onBack?: () => void;
  /**
   * Opens the offline centre (frame 13), which the frame draws its download glyph for. Left
   * out when the route has nowhere to send it.
   */
  onOpenDownloads?: () => void;
  /** Opens the place where foreground location consent can be reviewed. */
  onOpenLocationSettings?: (status: DevicePositionStatus) => void;
  /**
   * Opens frame 07 for the card's zone, under the berry whose score the card is reading — or
   * nothing.
   *
   * The screen hands over the zone it drew and the berry whose score it printed, so the screen
   * that opens reads the same record rather than another zone's figures. Without a destination
   * the card stays a reading and claims no role.
   */
  onOpenZone?: (zone: Zone, species: Species) => void;
  /** The foreground position seam; tests can supply a device-free source. */
  positionSource?: PositionSource;
  /**
   * Where the screen's zones come from. Defaults to the bundled pilot stub; a test, or a
   * future composition root that has a real service, supplies its own through the port.
   */
  zoneSource: ZoneSource;
};

/**
 * Discover is the field map (ADR-070), not a document containing one. MapLibre fills the
 * destination above core navigation; search, berry score layers, status, legend and the selected
 * zone card float over it. List view remains the text-first reading of the same answer.
 *
 * **One dataset, one ring per zone.** The screen asks `ZoneSource` once for each lit berry and
 * merges the answers (`zone-layers.ts`): a zone both berries score is drawn once, carrying its
 * best selected score, and the berry that produced it is kept so the card and the list name the
 * layer they print. Search narrows those zones by name; a source press selects one by stable id;
 * the map, card and list all read that same merged result. A timestamp is the oldest score
 * timestamp in that result, never the network read time.
 *
 * **One foreground position seam.** `useDevicePosition` remains behind the stored consent and
 * platform permission. The newest fix is handed to the map in memory and forgotten when the
 * consumer leaves; it is never stored, sent or logged. The source shares its native watch with the
 * shell's visit tracker rather than starting a second GPS subscription.
 */
export function DiscoverScreen({
  onBack,
  onOpenDownloads,
  onOpenLocationSettings,
  onOpenZone,
  positionSource,
  zoneSource,
}: DiscoverScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  const [query, setQuery] = useState('');
  // Every berry is on when the screen opens: the unfiltered answer is what a picker should see
  // first, and the chips narrow it. The screen never lets the set become empty, because a map
  // with no score layer would have to invent one.
  const [species, setSpecies] = useState<readonly Species[]>(SPECIES);
  const [view, setView] = useState<ZoneView>('map');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const selection = species.length > 0 ? species : SPECIES;
  const answers = useZoneAnswers(zoneSource, selection);
  // One ring per zone, carrying its best selected berry's score; the berry that produced it is
  // kept beside it so the card and the list can name the layer they print (`zone-layers.ts`).
  const { layer, zones } = useMemo(
    () => mergeZoneAnswers(answers.zones, selection),
    [answers.zones, selection],
  );
  // Data outranks a failed refresh, exactly as the single-berry hook had it: the zones already
  // read stay on the map, and only an answer with no data at all is the error the screen names.
  const status = zones.length > 0 ? 'ready' : answers.status;
  const updatedAt = oldestUpdatedAt(zones);
  const retry = answers.retry;
  // Only the bundled stand-in carries the demo disclosure; the zone service's answer is live.
  const demo = zoneSource.demo === true;

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
  const cardZone = matches.find((zone) => zone.id === selectedZoneId) ?? matches[0];
  // The berry whose score the card is printing. The merge keeps it per zone, so selecting a
  // zone on the map cannot relabel it with another berry's figures.
  const cardSpecies = cardZone
    ? (layer.get(cardZone.id) ?? selection[0] ?? PILOT_ZONE_SPECIES)
    : PILOT_ZONE_SPECIES;

  const toggleSpecies = (candidate: Species) =>
    setSpecies((chosen) => {
      if (!chosen.includes(candidate)) {
        // Add in the domain's own order, so the merge's first-seen order is stable.
        return SPECIES.filter((berry) => berry === candidate || chosen.includes(berry));
      }

      // The last lit chip stays lit: an empty selection has no score layer, and the screen
      // would have to choose one for the picker.
      return chosen.length === 1 ? chosen : chosen.filter((berry) => berry !== candidate);
    });

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

  if (view === 'map') {
    const mapCount =
      matches.length === 0
        ? null
        : interpolate(
            demo
              ? t(matches.length === 1 ? 'discover.map.countOne' : 'discover.map.count')
              : t(matches.length === 1 ? 'discover.map.countOne.live' : 'discover.map.count.live'),
            { count: String(matches.length) },
          );

    return (
      <View
        style={[styles.mapScreen, { backgroundColor: colors.mapBase }]}
        testID="discover-map-screen"
      >
        <LiveZoneMap
          demo={demo}
          fullscreen
          onOpenLocationSettings={onOpenLocationSettings}
          onRetry={retry}
          onSelectZone={setSelectedZoneId}
          positionSource={positionSource}
          selectedZoneId={cardZone?.id}
          status={status}
          zones={matches}
        />

        <SafeAreaView
          edges={['top']}
          pointerEvents="box-none"
          style={styles.overlays}
          testID="discover-map-overlays"
        >
          <View pointerEvents="box-none" style={styles.topControls}>
            {/*
              No frosted band across the top: each control carries its own glass, so the map
              shows between the search field, the buttons and the berry chips (owner's call,
              2026-11-25).
            */}
            <View pointerEvents="box-none" style={styles.searchRow}>
              {onBack ? (
                <Pressable
                  accessibilityLabel={t('common.back')}
                  accessibilityRole="button"
                  onPress={onBack}
                  style={[styles.roundControl, { borderColor: colors.border, overflow: 'hidden' }]}
                >
                  <GlassSurface style={StyleSheet.absoluteFill} />
                  <Feather color={colors.text} name="arrow-left" size={22} />
                </Pressable>
              ) : null}
              <GlassSurface
                style={[styles.searchField, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <ZoneSearchField glass onChangeText={setQuery} value={query} />
              </GlassSurface>
              <MapListToggle
                floating
                onChange={setView}
                onOpenDownloads={onOpenDownloads}
                view={view}
              />
            </View>

            <SpeciesChips
              glass
              onToggle={toggleSpecies}
              scrollable={Platform.OS !== 'web'}
              selected={species}
            />

            {filtering || mapCount ? (
              <GlassSurface
                pointerEvents="none"
                style={[styles.mapStatus, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <AppText tone="muted" variant="mapAnnotation">
                  {filtering
                    ? matches.length === 0
                      ? t('discover.filter.none')
                      : interpolate(
                          matches.length === 1
                            ? t('discover.filter.matchOne')
                            : t('discover.filter.matches'),
                          { count: String(matches.length) },
                        )
                    : mapCount}
                </AppText>
              </GlassSurface>
            ) : null}
          </View>
        </SafeAreaView>

        <View pointerEvents="box-none" style={styles.bottomControls}>
          <GlassSurface
            pointerEvents="none"
            style={[styles.legendPanel, { borderColor: colors.border, borderWidth: 1 }]}
          >
            <ZoneScoreLegend />
            {updatedAt && matches.length > 0 ? (
              <AppText testID="discover-updated" tone="muted" variant="metadata">
                {interpolate(t('discover.map.updated'), {
                  date: formatLongDate(updatedAt, locale),
                })}
              </AppText>
            ) : null}
          </GlassSurface>

          {cardZone ? (
            <ZoneCard
              demo={demo}
              floating
              onOpen={onOpenZone ? () => onOpenZone(cardZone, cardSpecies) : undefined}
              species={cardSpecies}
              zone={cardZone}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <Screen
      edges={['top']}
      eyebrow={t(demo ? 'discover.eyebrow' : 'discover.eyebrow.live')}
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

        {listStatus ? (
          <StatusMessage testID="zone-list-status" tone="muted" variant="bodySmall">
            {listStatus}
          </StatusMessage>
        ) : null}
        {status === 'error' ? (
          <TextAction label={t('discover.map.retry')} onPress={retry} testID="zone-list-retry" />
        ) : null}
        <ZoneList
          species={(zone) => layer.get(zone.id) ?? selection[0] ?? PILOT_ZONE_SPECIES}
          zones={matches}
        />

        <MapListToggle onChange={setView} onOpenDownloads={onOpenDownloads} view={view} />
      </View>
    </Screen>
  );
}

type LiveZoneMapProps = Omit<ZoneMapProps, 'position' | 'positionStatus'> & {
  positionSource: PositionSource | undefined;
};

/** Mounting the map is the ask for a foreground fix; list view unmounts it and drops its consumer. */
function LiveZoneMap({ positionSource, ...props }: LiveZoneMapProps) {
  const position = useDevicePosition(positionSource ? { source: positionSource } : {});

  return <ZoneMap {...props} position={position.fix} positionStatus={position.status} />;
}

const styles = StyleSheet.create({
  mapScreen: {
    flex: 1,
    overflow: 'hidden',
  },
  overlays: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topControls: {
    gap: spacing.sm,
    paddingHorizontal: spacing.gap,
    paddingTop: spacing.sm,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchField: {
    borderRadius: radii.control,
    flex: 1,
  },
  roundControl: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: layout.searchHeight,
    justifyContent: 'center',
    width: layout.searchHeight,
  },
  mapStatus: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.gap,
    paddingVertical: spacing.xs,
  },
  bottomControls: {
    bottom: spacing.gap,
    gap: spacing.sm,
    left: spacing.gap,
    position: 'absolute',
    right: spacing.gap,
  },
  legendPanel: {
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.gap,
    paddingVertical: spacing.sm,
  },
});
