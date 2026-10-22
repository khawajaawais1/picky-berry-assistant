import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from '../atoms';

export type CalloutTone = 'success' | 'accent' | 'warning';

export type CalloutProps = ViewProps & {
  title: string;
  /** Optional leading glyph, painted by the caller so its colour stays meaningful. */
  icon?: ReactNode;
  /**
   * The tint the frame gives the block. The design draws three: the success tint on screen
   * 03's privacy note, the accent tint on screen 04's note about the phone path, and the
   * warning tint on screen 10's offline note.
   */
  tone?: CalloutTone;
};

/**
 * The design's “Status message” (frames 03 and 04): a tinted block at the control radius
 * with a 14 px inset and a 12 px gap, its title 14 px semibold and its body 13 px muted,
 * 3 px apart.
 *
 * Only the tints the design defines are implemented; a further tone arrives when a frame
 * shows one.
 */
/** Every tone the design draws, as the tint it paints and nothing else. */
const TONE_TINT: Record<CalloutTone, (colors: ThemeColors) => string> = {
  success: (colors) => colors.successMuted,
  accent: (colors) => colors.accentMuted,
  warning: (colors) => colors.warningMuted,
};

export function Callout({ title, icon, tone = 'success', children, style, ...rest }: CalloutProps) {
  const { colors } = useAppTheme();

  return (
    <View
      {...rest}
      className="w-full flex-row gap-gap rounded-control px-field py-field"
      style={[{ backgroundColor: TONE_TINT[tone](colors) }, style]}
    >
      {icon}
      <View className="flex-1 gap-tight">
        <AppText style={{ fontWeight: '600' }} variant="bodySmall">
          {title}
        </AppText>
        {children ? (
          <AppText tone="muted" variant="caption">
            {children}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
