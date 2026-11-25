import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type GlassSurfaceProps = {
  children?: ReactNode;
  /** Extra geometry for the caller: radius, padding, flex. */
  style?: StyleProp<ViewStyle>;
  /** 0–100. 70 is the Discover overlays' reading over map tiles. */
  intensity?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  testID?: string;
};

/**
 * The app's one frosted-glass surface: `expo-blur`'s `BlurView`, tinted for the resolved colour
 * scheme, over a translucent surface fill.
 *
 * The fill is not decoration. A platform whose blur is unavailable — an older Android WebView,
 * a device with “reduce transparency”, a failed native view — still gets a legible panel rather
 * than text floating directly on map tiles. That fallback is why the background colour is set
 * on the blurred view itself instead of being left to the caller.
 *
 * The surface is deliberately **not** a container that paints its own large background: the
 * Discover screen uses one per control (the search field, each berry chip, the map controls),
 * so the map stays visible between them.
 */
export function GlassSurface({
  children,
  intensity = 70,
  pointerEvents,
  style,
  testID,
}: GlassSurfaceProps) {
  const theme = useAppTheme();

  return (
    <BlurView
      intensity={intensity}
      pointerEvents={pointerEvents}
      style={[styles.surface, { backgroundColor: `${theme.colors.surface}CC` }, style]}
      testID={testID}
      tint={theme.scheme === 'dark' ? 'dark' : 'light'}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
});
