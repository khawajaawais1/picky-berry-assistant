import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { layout, radii } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import { ZONE_SCORE_BANDS } from '../domain/zone-score-band';

/**
 * What the real map's five colours mean (ADR-053, and the spec's A3 rule in
 * docs/features/6.2-live-site-map.md).
 *
 * The swatch and the polygon are painted from the same token pair (`ZONE_SCORE_BANDS`), so
 * a recoloured band cannot leave this legend naming a colour no zone is drawn in. The
 * ranges are numbers rather than copy — a locale need not translate “0–19” — but the two
 * lines around them are catalogue strings, measured by the layout harness in both languages.
 *
 * The low-confidence line is the faded treatment stated in words. A map whose only cue for
 * uncertainty is a paler fill is a map that hides it from a screen reader, and from anyone
 * who cannot separate those greens.
 *
 * `flex-wrap` is load-bearing: five bands at the largest system text size do not fit the
 * 342 px content column, and the screen does not scroll sideways (ADR-019).
 */
export function ZoneScoreLegend() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View className="w-full gap-tight" testID="zone-score-legend">
      <AppText tone="muted" variant="mapAnnotation">
        {t('discover.score.label')}
      </AppText>

      <View className="w-full flex-row flex-wrap items-center gap-gap">
        {ZONE_SCORE_BANDS.map((band) => (
          <View className="flex-row items-center gap-xs" key={band.min}>
            <View
              style={{
                backgroundColor: colors[band.fill],
                borderColor: colors[band.line],
                borderRadius: radii.xs,
                borderWidth: 1,
                height: layout.mapLegendSwatch,
                width: layout.mapLegendSwatch,
              }}
              testID={`zone-score-legend-swatch-${band.min}`}
            />
            <AppText tone="muted" variant="mapAnnotation">
              {`${band.min}–${band.max}`}
            </AppText>
          </View>
        ))}
      </View>

      <AppText tone="muted" variant="mapAnnotation">
        {t('discover.score.lowConfidence')}
      </AppText>
    </View>
  );
}
