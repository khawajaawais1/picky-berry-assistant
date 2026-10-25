import { MaterialCommunityIcons } from '@/components/atoms/app-icon';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * The design's berry mark and wordmark (frame 01, nodes 5:22722/5:22724).
 *
 * The mark's internal geometry is the logo's own — circle sizes and offsets scale
 * with `size` — so it is expressed here rather than as layout tokens; a mark that
 * reflowed with the spacing scale would not be the mark.
 *
 * Fidelity note: the design draws the leaf as a stroked 12 px vector. Material
 * Community's leaf glyph stands in for it, because the project has no vector
 * renderer yet (see PROJECT.md, known limitations).
 */
export function BerryMark({ size = 44 }: { size?: number }) {
  const { colors } = useAppTheme();
  const unit = size / 44;

  return (
    <View style={{ height: size, width: size }}>
      <View
        style={[
          styles.berry,
          {
            backgroundColor: colors.accent,
            height: 24 * unit,
            left: 0,
            top: 14 * unit,
            width: 24 * unit,
          },
        ]}
      />
      <View
        style={[
          styles.berry,
          {
            backgroundColor: colors.berryDeep,
            height: 23 * unit,
            left: 18 * unit,
            top: 18 * unit,
            width: 23 * unit,
          },
        ]}
      />
      <View
        style={[
          styles.berry,
          {
            backgroundColor: colors.accent,
            height: 24 * unit,
            left: 14 * unit,
            top: 0,
            width: 24 * unit,
          },
        ]}
      />
      <MaterialCommunityIcons
        color={colors.success}
        name="leaf"
        size={12 * unit}
        style={{ left: 31 * unit, top: 0 }}
        testID="berry-mark-leaf"
      />
    </View>
  );
}

/** Berry mark above the wordmark, as the design stacks them on screen 01. */
export function BrandLockup() {
  return (
    <View className="flex-row items-center gap-sm">
      <BerryMark />
      <AppText tone="accent" variant="brand">
        picky
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  berry: {
    borderRadius: 999,
    position: 'absolute',
  },
});
