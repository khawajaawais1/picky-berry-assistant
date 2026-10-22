import { Text, type TextProps } from 'react-native';

import { typography, type TypographyVariant, type ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/** Semantic text colours. Components pick a tone, never a raw colour. */
export type AppTextTone = 'default' | 'muted' | 'accent' | 'danger' | 'success' | 'warning';

const TONE_COLOUR_KEY: Record<AppTextTone, keyof ThemeColors> = {
  default: 'text',
  muted: 'textMuted',
  accent: 'accent',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
};

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: AppTextTone;
};

/**
 * The only text primitive in the app. It carries typography and colour
 * responsibility so no screen has to repeat font sizes or palette lookups.
 */
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const { colors } = useAppTheme();

  return (
    <Text
      {...rest}
      style={[typography[variant], { color: colors[TONE_COLOUR_KEY[tone]] }, style]}
    />
  );
}
