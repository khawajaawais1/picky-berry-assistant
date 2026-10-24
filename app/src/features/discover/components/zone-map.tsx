import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import type { ZonesStatus } from '../hooks/use-zones';
import type { Zone } from '../domain/zone-source';
import { ZoneMapCanvas } from './zone-map-canvas';

export type ZoneMapProps = {
  /** The height the screen gives it: the design's 300 on frame 06. */
  height?: number;
  /** Why there may be no polygons — the screen asks the source once and passes the answer. */
  status: ZonesStatus;
  /** The zones the screen's controls left: the map draws exactly what the list would show. */
  zones: readonly Zone[];
};

/**
 * Screen 06's map, as the app can now be true about it: **a MapLibre map of the pilot's real
 * zones**, not the design's drawing (ADR-053; the drawing remains on frames 08 and 09).
 *
 * It is presentational on purpose. The screen owns the one `useZones` call and hands the same
 * answer to this map, the card and the list, so the three cannot describe different data — the
 * gap known issue 14 recorded while the card and filters still read the design's sample.
 *
 * Three things this component is careful about:
 *
 * - **Why there are no polygons.** A map that draws nothing is indistinguishable from a
 *   source that failed, so loading, empty and failed each get their own line. The map never
 *   pretends an error is an empty world.
 * - **Nothing on it is a control.** The native canvas turns every gesture off, because the
 *   frame's recentre control does not exist yet and a map the picker can move away from
 *   with no way back is worse than one that stays put (AGENTS.md §11.2).
 * - **Colour is not the only signal.** Each zone's score is also a number in the legend's
 *   bands, and the legend says in words what the colours and the fade mean. The map itself
 *   carries a text alternative naming what it shows; the zone-by-zone reading is the list
 *   the screen's toggle opens.
 */
export function ZoneMap({ height = layout.mapHeight, status, zones }: ZoneMapProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const hasZones = status === 'ready' && zones.length > 0;
  const statusLine =
    status === 'loading'
      ? t('discover.map.loading')
      : status === 'error'
        ? t('discover.map.unavailable')
        : t('discover.map.empty');

  return (
    <View
      className="w-full overflow-hidden"
      style={{
        backgroundColor: colors.mapBase,
        borderRadius: radii.lg,
        height,
      }}
      testID="zone-map"
    >
      <View style={{ flex: 1 }}>
        {hasZones ? (
          <ZoneMapCanvas height={height} label={t('discover.map.label')} zones={zones} />
        ) : (
          <View className="flex-1 items-center justify-center px-section">
            <AppText testID="zone-map-status" tone="muted" variant="bodySmall">
              {statusLine}
            </AppText>
          </View>
        )}
      </View>

      {hasZones ? (
        <View
          // A reading over the map, not a control: the place this pilot area is in and how
          // many zones are on it. `pointerEvents="none"` keeps it from swallowing a tap.
          pointerEvents="none"
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            gap: spacing.tight,
            left: spacing.gap,
            paddingHorizontal: spacing.gap,
            paddingVertical: spacing.tight,
            position: 'absolute',
            top: spacing.gap,
          }}
        >
          <AppText tone="success" variant="mapLabel">
            {t('discover.map.place')}
          </AppText>
          <AppText tone="muted" variant="mapAnnotation">
            {interpolate(
              zones.length === 1 ? t('discover.map.countOne') : t('discover.map.count'),
              { count: String(zones.length) },
            )}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
