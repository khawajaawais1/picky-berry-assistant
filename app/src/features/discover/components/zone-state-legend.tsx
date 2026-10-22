import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { layout, radii } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import { ZONE_APPEARANCE, ZONE_STATES } from '../domain/zone';
import { ZONE_STATE_LABEL_KEY } from './zone-state-copy';

/**
 * Frame 06's zone-state legend (node 5:22986): the three states spaced across the content
 * column, each an 8 px swatch in the colour that state's zone is outlined in and the
 * frame's own word for it.
 *
 * The swatch is the state's `line` token, which is what makes this legend readable rather
 * than decorative: the same token strokes the polygon on the map, so a recoloured state
 * cannot leave the two showing different colours (see `ZONE_APPEARANCE`). The words are the
 * only other signal, which is the limit recorded in PROJECT.md: colour alone tells a
 * sighted user which polygon is which.
 *
 * The frame sets its swatch and label 5 px apart; the app uses the 4 px step of the spacing
 * scale, the nearest token to it.
 *
 * `flex-wrap` is load-bearing, and the harness is what found it: at the largest system text
 * size the three states no longer fit the 342 px content column — in Finnish they needed
 * more than it has — and the screen does not scroll sideways, so without wrapping the third
 * one would be cut off. At the design's own size the row is one line, as the frame draws it
 * (ADR-019, the same fix screen 03's choice chips needed).
 */
export function ZoneStateLegend() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityLabel={t('discover.legend.label')}
      className="w-full flex-row flex-wrap items-center justify-between gap-gap"
      testID="zone-state-legend"
    >
      {ZONE_STATES.map((state) => (
        <View className="flex-row items-center gap-xs" key={state}>
          <View
            style={{
              backgroundColor: colors[ZONE_APPEARANCE[state].line],
              borderRadius: radii.xs,
              height: layout.mapLegendSwatch,
              width: layout.mapLegendSwatch,
            }}
            testID={`zone-state-legend-swatch-${state}`}
          />
          <AppText tone="muted" variant="mapAnnotation">
            {t(ZONE_STATE_LABEL_KEY[state])}
          </AppText>
        </View>
      ))}
    </View>
  );
}
