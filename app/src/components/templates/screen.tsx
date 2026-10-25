import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import { AppText } from '../atoms';

export type ScreenProps = ViewProps & {
  /** Small accent label above the title (“ONBOARDING · 01 / 05”). */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Trailing element in the header row, e.g. the design's status glyph. */
  headerAccessory?: ReactNode;
  /**
   * Leading back control, at the design's 32x44 frame. Omit it on a screen that has
   * nowhere to go back to: it would then be an affordance that does nothing.
   */
  onBack?: () => void;
  /** Screens are scrollable by default so long content can never be clipped. */
  scroll?: boolean;
  /**
   * Which safe-area edges this screen owns. Inside the app shell the core navigation bar owns the
   * bottom one — it paints its surface down into the home area — so a screen the bar sits under
   * passes `['top']`; without that the same inset would be added twice and the content would end
   * well above the bar.
   */
  edges?: Edge[];
  children?: ReactNode;
};

/**
 * Screen template: owns safe-area handling, background, content width and page
 * heading. Screens compose content inside it and must not re-implement layout.
 *
 * The header follows the design: a 64 px row of eyebrow + title on the left and an
 * optional accessory on the right, inside the screen's 24 px inset.
 */
export function Screen({
  eyebrow,
  title,
  subtitle,
  headerAccessory,
  onBack,
  scroll = true,
  edges = ['top', 'bottom'],
  children,
  style,
  ...rest
}: ScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const content = (
    <View style={styles.content}>
      {
        // `min-h-header`, not `h-header`: the design's 64 px is the floor, and at a large
        // system text size the eyebrow and the title are taller than it. A fixed height would
        // paint them over the screen's first block, which is what the layout harness caught
        // at 200 % (ADR-019).
      }
      {eyebrow || title || subtitle ? (
        <View className="min-h-header w-full flex-row items-center gap-md px-lg">
          {onBack ? (
            <Pressable
              accessibilityLabel={t('common.back')}
              accessibilityRole="button"
              // The design's control is 32 px wide; 6 px of hit slop on each side is the 44 px
              // target a finger gets without moving the header's geometry.
              hitSlop={{ left: 6, right: 6 }}
              className="h-touch w-xl items-center justify-center"
              onPress={onBack}
            >
              <Feather color={colors.text} name="arrow-left" size={22} />
            </Pressable>
          ) : null}
          <View className="flex-1 gap-xs">
            {eyebrow ? (
              <AppText variant="chip" tone="accent">
                {eyebrow}
              </AppText>
            ) : null}
            {title ? (
              <AppText accessibilityRole="header" variant="subtitle">
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="body" tone="muted">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {headerAccessory}
        </View>
      ) : null}
      {/* `w-full` is load-bearing: a flex item defaults to `min-width: auto`, so without
          it a wide child (a photograph) would stretch this wrapper past the screen. */}
      <View className="w-full px-lg pb-lg pt-md">{children}</View>
    </View>
  );

  return (
    <SafeAreaView
      {...rest}
      edges={edges}
      style={[styles.safeArea, { backgroundColor: colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          testID="screen-scroll"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, styles.fill]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  fill: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    maxWidth: layout.maxContentWidth,
    paddingVertical: spacing.xs,
    width: '100%',
  },
});
