import { useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage, TextAction } from '@/components/molecules';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';
import type { DevicePositionStatus } from '@/hooks/use-device-position';
import type { PositionFix } from '@/services/location';

import type { ZonesStatus } from '../hooks/use-zones';
import type { Zone } from '../domain/zone-source';
import { ZoneMapCanvas } from './zone-map-canvas';

export type ZoneMapProps = {
  /** Whether the zones are the bundled stand-in; only then does the label say “test data”. */
  demo?: boolean;
  /** Fills the available screen instead of drawing the original rounded 300 px card. */
  fullscreen?: boolean;
  /** The height the screen gives it: the design's 300 on frame 06. */
  height?: number;
  /**
   * Reads the source again after a failed one. Without it the failure is a reading and draws no
   * action: a control that cannot act claims no role (AGENTS.md §11.2).
   */
  onRetry?: () => void;
  onOpenLocationSettings?: (status: DevicePositionStatus) => void;
  onSelectZone?: (zoneId: string) => void;
  position?: PositionFix | null;
  positionStatus?: DevicePositionStatus;
  selectedZoneId?: string | null;
  /** Why there may be no polygons — the screen asks the source once and passes the answer. */
  status: ZonesStatus;
  /** The zones the screen's controls left: the map draws exactly what the list would show. */
  zones: readonly Zone[];
};

/**
 * MapLibre over the source's real zone rings (ADR-053), either at a caller-supplied card height or
 * filling Discover (ADR-070). Loading, empty and failed remain distinct; the map never presents a
 * failed source as an empty world. The canvas carries one text alternative, while the legend,
 * selected-zone card and list state every score without relying on polygon colour alone.
 */
export function ZoneMap({
  demo = false,
  fullscreen = false,
  height = layout.mapHeight,
  onOpenLocationSettings,
  onRetry,
  onSelectZone,
  position,
  positionStatus,
  selectedZoneId,
  status,
  zones,
}: ZoneMapProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const window = useWindowDimensions();

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
        borderRadius: fullscreen ? 0 : radii.lg,
        flex: fullscreen ? 1 : undefined,
        height: fullscreen ? undefined : height,
      }}
      testID="zone-map"
    >
      <View style={{ flex: 1 }}>
        {hasZones ? (
          <ZoneMapCanvas
            fullscreen={fullscreen}
            height={fullscreen ? window.height : height}
            label={t('discover.map.label')}
            onOpenLocationSettings={onOpenLocationSettings}
            onSelectZone={onSelectZone}
            position={position}
            positionStatus={positionStatus}
            selectedZoneId={selectedZoneId}
            zones={zones}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-gap px-section">
            <StatusMessage testID="zone-map-status" tone="muted" variant="bodySmall">
              {statusLine}
            </StatusMessage>
            {status === 'error' && onRetry ? (
              <TextAction
                label={t('discover.map.retry')}
                onPress={onRetry}
                testID="zone-map-retry"
              />
            ) : null}
          </View>
        )}
      </View>

      {hasZones && !fullscreen ? (
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
            {t(demo ? 'discover.map.place' : 'discover.map.place.live')}
          </AppText>
          <AppText tone="muted" variant="mapAnnotation">
            {interpolate(
              demo
                ? t(zones.length === 1 ? 'discover.map.countOne' : 'discover.map.count')
                : t(zones.length === 1 ? 'discover.map.countOne.live' : 'discover.map.count.live'),
              { count: String(zones.length) },
            )}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
